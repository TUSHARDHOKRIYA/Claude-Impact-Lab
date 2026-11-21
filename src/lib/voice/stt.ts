import "server-only";

import {
  MAX_VOICE_AUDIO_BYTES,
  MAX_VOICE_TRANSCRIPT_CHARS,
  type SpeechTranscript,
} from "./contracts";
import { isDeadlineError, runWithin } from "./deadline";

const SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text";
const STT_TIMEOUT_MS = 30_000;
const ALLOWED_AUDIO = new Set(["audio/webm", "audio/mp4", "audio/ogg"]);

type SarvamResponse = {
  transcript?: unknown;
  language_code?: unknown;
  language_probability?: unknown;
};

function parseTranscript(raw: unknown): SpeechTranscript {
  if (!raw || typeof raw !== "object") {
    throw new Error("Speech provider returned an invalid response.");
  }
  const result = raw as SarvamResponse;
  if (
    typeof result.transcript !== "string" ||
    result.transcript.trim() === "" ||
    result.transcript.length > MAX_VOICE_TRANSCRIPT_CHARS
  ) {
    throw new Error("Speech provider returned an invalid transcript.");
  }
  if (
    typeof result.language_code !== "string" ||
    result.language_code.trim() === ""
  ) {
    throw new Error("Speech provider returned an invalid language.");
  }
  const probability = result.language_probability;
  if (
    probability !== null &&
    (typeof probability !== "number" || !Number.isFinite(probability))
  ) {
    throw new Error("Speech provider returned an invalid language probability.");
  }
  return {
    transcript: result.transcript,
    languageCode: result.language_code,
    languageProbability: probability,
  };
}

/**
 * Whether a clip is worth spending on, by the same rules the upload uses.
 *
 * Exported so the action can decide before it charges the voice allowance:
 * a clip this rejects never reaches a paid API, so it must not cost a slot.
 * One definition, so the two checks cannot drift into disagreeing.
 */
export function isSpendableClip(audio: File): boolean {
  const baseMime = audio.type.toLowerCase().split(";")[0].trim();
  return ALLOWED_AUDIO.has(baseMime) && audio.size > 0 && audio.size <= MAX_VOICE_AUDIO_BYTES;
}

export async function transcribeSpeech(
  audio: File,
  options: { fetchImpl?: typeof fetch; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<SpeechTranscript> {
  const baseMime = audio.type.toLowerCase().split(";")[0].trim();
  if (!ALLOWED_AUDIO.has(baseMime)) {
    throw new Error("Record a WebM, MP4, or Ogg audio clip.");
  }
  if (audio.size === 0 || audio.size > MAX_VOICE_AUDIO_BYTES) {
    throw new Error("The voice clip is empty or too large.");
  }
  const apiKey = process.env.SARVAM_API_KEY?.trim();
  if (!apiKey) throw new Error("Speech provider is not configured.");

  const body = new FormData();
  body.set("file", audio, audio.name || "speech.webm");
  body.set("model", "saaras:v4");
  body.set("mode", "codemix");
  body.set("language_code", "unknown");

  const timeoutMs = options.timeoutMs ?? STT_TIMEOUT_MS;
  const raw = await runWithin(async (signal) => {
    const response = await (options.fetchImpl ?? fetch)(SARVAM_STT_URL, {
      method: "POST",
      headers: { "api-subscription-key": apiKey },
      body,
      signal,
    });
    if (!response.ok) throw new Error(`Speech provider returned HTTP ${response.status}.`);
    try {
      return await response.json();
    } catch (error) {
      if (isDeadlineError(error)) throw error;
      throw new Error("Speech provider returned malformed JSON.");
    }
  }, timeoutMs, options.signal);
  return parseTranscript(raw);
}
