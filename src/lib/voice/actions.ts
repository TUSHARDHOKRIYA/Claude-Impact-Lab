"use server";

import { clientIp } from "@/lib/client-ip";
import { allowRequest } from "@/lib/rate-limit";
import type { VoiceTurnResult } from "./contracts";
import { askedQuestion, pickReplyLanguage } from "./conversation";
import {
  APP_VOICE_MAX_TURNS,
  cappedCall,
  isDeadlineError,
  startVoiceBudget,
  type VoiceBudget,
  STT_CALL_CAP_MS,
  TTS_CALL_CAP_MS,
  VOICE_TOO_LONG,
} from "./deadline";
import { extractVoiceCalls } from "./extract";
import { callsToFormPatch, spokenLandmark } from "./form-bridge";
import { speakOnce, speakPrompt } from "./speak";
import { isSpendableClip, transcribeSpeech } from "./stt";
import { resolveAppTarget } from "./targets";
import { composeReply, readTurnContext } from "./turn";

/**
 * This path spends money: Sarvam STT plus an LLM turn per call.
 *
 * A demo room shares one NAT address, so the per-address bucket is really the
 * whole room. 6/10min meant the seventh person's voice attempt failed, so the
 * per-address cap is sized for a room.
 *
 * That alone would not bound the bill, because a caller with varied addresses
 * gets a fresh allowance each time. The second cap is one bucket for every
 * voice turn regardless of who asked, which closes that.
 *
 * It is NOT a global spend ceiling, and naming it one would be a lie. Both
 * counters live in a per-isolate Map, so the true ceiling is this number times
 * the count of live SSR isolates, which Amplify decides and does not report.
 * Treat it as a per-isolate burst brake. A real spend cap needs a shared
 * counter in DynamoDB, a WAF rate rule, or a budget alarm on the provider.
 */
const VOICE_LIMIT = 60;
const VOICE_ISOLATE_CEILING = 200;
const VOICE_WINDOW_MS = 10 * 60 * 1000;

function failure(
  error: string,
  retryable: boolean,
): Extract<VoiceTurnResult, { ok: false }> {
  return { ok: false, error, retryable };
}

export async function processVoiceTurnAction(
  formData: FormData,
): Promise<VoiceTurnResult> {
  const budget = startVoiceBudget();
  try {
    return await runVoiceTurn(formData, budget);
  } finally {
    budget.stop();
  }
}

async function runVoiceTurn(
  formData: FormData,
  budget: VoiceBudget,
): Promise<VoiceTurnResult> {
  let target;
  try {
    target = resolveAppTarget(process.env);
  } catch {
    return failure("Voice is not configured. Continue by typing.", false);
  }
  if (!process.env.SARVAM_API_KEY?.trim() || !target) {
    return failure("Voice is not configured. Continue by typing.", false);
  }

  // A clip the upload would reject costs nothing to refuse, so it is refused
  // before the allowance is charged rather than after.
  const audio = formData.get("audio");
  if (!(audio instanceof File) || !isSpendableClip(audio)) {
    return failure("Record a WebM, MP4, or Ogg audio clip.", true);
  }

  // Counted last, once the request is one that would actually reach a paid
  // API. Charging the allowance before this let a caller with no account and
  // no clip burn every slot, locking real speakers out for the window.
  const ip = (await clientIp()) ?? "unknown";
  if (!allowRequest(`voice:${ip}`, VOICE_LIMIT, VOICE_WINDOW_MS)) {
    return failure("Voice is busy right now. Continue by typing.", true);
  }
  // Checked after the per-address cap so one noisy address cannot spend the
  // shared allowance before its own cap stops it.
  if (!allowRequest("voice:all", VOICE_ISOLATE_CEILING, VOICE_WINDOW_MS)) {
    return failure("Voice is busy right now. Continue by typing.", true);
  }

  const context = readTurnContext(formData);
  try {
    const speech = await transcribeSpeech(audio, cappedCall(budget, STT_CALL_CAP_MS));
    const replyLanguage = pickReplyLanguage(speech.languageCode, context.lang);
    const extracted = await extractVoiceCalls(speech.transcript, target, {
      lang: replyLanguage,
      maxTurns: APP_VOICE_MAX_TURNS,
      budget,
      ...(context.asked ? { asked: askedQuestion(context.asked) } : {}),
    });
    const patch = callsToFormPatch(extracted.calls);
    // The model sometimes skips a landmark the person plainly named; don't make them say it twice.
    patch.pinProposal ??= spokenLandmark(speech.transcript);
    // Nothing understood is a turn, not a failure: the thread shows what was
    // heard and the assistant asks again, so the conversation keeps going.
    const { reply, spec } = composeReply({
      speech,
      fields: patch.fields,
      hasPin: patch.pinProposal !== null,
      filled: context.filled,
      asked: context.asked,
      pinned: context.pinned,
      lang: replyLanguage,
    });
    // Speech is a bonus. A TTS failure is a silent reply, never a failed turn.
    let audioReply = null;
    if (context.speak) {
      const speechCall = cappedCall(budget, TTS_CALL_CAP_MS);
      audioReply = spec
        ? await speakPrompt(spec, speechCall)
        : await speakOnce(reply.text, replyLanguage, speechCall);
    }
    return {
      ok: true,
      transcript: speech.transcript,
      languageCode: speech.languageCode,
      fields: patch.fields,
      pinProposal: patch.pinProposal,
      warnings: extracted.warnings,
      replyLanguage,
      reply,
      audio: audioReply,
    };
  } catch (error) {
    // The message only: provider errors never carry the person's words, and the transcript is not logged.
    console.error("voice turn failed:", error instanceof Error ? error.message : String(error));
    if (isDeadlineError(error)) return failure(VOICE_TOO_LONG, true);
    return failure(
      "Voice could not process that clip. Your draft is safe; try again or continue by typing.",
      true,
    );
  }
}
