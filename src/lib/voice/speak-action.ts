"use server";

import { toLabelLanguage } from "@/lib/chip-labels";
import { clientIp } from "@/lib/client-ip";
import { allowRequest } from "@/lib/rate-limit";
import type { VoiceAudio } from "./contracts";
import { isPromptKey, isPromptLead, type PromptSpec } from "./conversation";
import { isPromptCached, speakPrompt } from "./speak";

/**
 * Only cache misses can spend, and there are at most 120 distinct prompts, so
 * these buckets mostly guard against hammering a failing provider.
 *
 * Per address first, same size as the voice turn's cap and for the same
 * reason: a demo room shares one NAT. Without it, one caller could drain the
 * isolate's whole allowance and leave nothing for anyone else. The ceiling is
 * per isolate, not global; see the note on `VOICE_ISOLATE_CEILING`.
 */
const TTS_LIMIT = 60;
const TTS_ISOLATE_CEILING = 200;
const TTS_WINDOW_MS = 10 * 60 * 1000;

/**
 * Speak the next question after the person answered with a chip rather than
 * their voice. The browser names a template, never text, so this cannot be
 * used to synthesize arbitrary speech. Null means "stay silent": muted
 * provider, unknown prompt, throttled, or TTS failed. The chat still works.
 */
export async function speakPromptAction(
  key: string,
  lead: string,
  lang: string,
): Promise<VoiceAudio | null> {
  if (!isPromptKey(key) || !isPromptLead(lead)) return null;
  if (!process.env.SARVAM_API_KEY?.trim()) return null;
  const spec: PromptSpec = { key, lead, lang: toLabelLanguage(lang) };
  if (isPromptCached(spec)) return speakPrompt(spec);
  const ip = (await clientIp()) ?? "unknown";
  if (!allowRequest(`voice-tts:${ip}`, TTS_LIMIT, TTS_WINDOW_MS)) return null;
  if (!allowRequest("voice-tts:all", TTS_ISOLATE_CEILING, TTS_WINDOW_MS)) return null;
  return speakPrompt(spec);
}
