import "server-only";

import type { LabelLanguage } from "@/lib/chip-labels";
import type { VoiceAudio } from "./contracts";
import { runWithin } from "./deadline";

const SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech";
const TTS_TIMEOUT_MS = 15_000;
const MAX_TTS_CHARS = 500;

/**
 * Udyam-Saathi's voice (`backend/config/config.yaml`: bulbul:v3, speaker
 * shubh), checked live against api.sarvam.ai for en-IN, hi-IN and mr-IN.
 * MP3 rather than WAV: a short question is about a third of the bytes, and it
 * rides back inside the server action response.
 */
export const TTS_SETTINGS = {
  model: "bulbul:v3",
  speaker: "shubh",
  pace: 1,
  speech_sample_rate: 22050,
  output_audio_codec: "mp3",
} as const;

type SarvamTtsResponse = { audios?: unknown };

/**
 * One Sarvam text-to-speech call. Throws on any failure; the caller decides
 * that a failed voice is a silent reply, never a failed turn.
 */
export async function synthesizeSpeech(
  text: string,
  lang: LabelLanguage,
  options: { fetchImpl?: typeof fetch; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<VoiceAudio> {
  const apiKey = process.env.SARVAM_API_KEY?.trim();
  if (!apiKey) throw new Error("Speech provider is not configured.");
  const clean = text.trim().slice(0, MAX_TTS_CHARS);
  if (!clean) throw new Error("Nothing to say.");

  const timeoutMs = options.timeoutMs ?? TTS_TIMEOUT_MS;
  const raw = await runWithin(async (signal) => {
    const response = await (options.fetchImpl ?? fetch)(SARVAM_TTS_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "api-subscription-key": apiKey },
      body: JSON.stringify({ text: clean, target_language_code: `${lang}-IN`, ...TTS_SETTINGS }),
      signal,
    });
    if (!response.ok) throw new Error(`Speech provider returned HTTP ${response.status}.`);
    return (await response.json()) as SarvamTtsResponse;
  }, timeoutMs, options.signal);
  const first = Array.isArray(raw.audios) ? raw.audios[0] : undefined;
  if (typeof first !== "string" || first.length === 0) {
    throw new Error("Speech provider returned no audio.");
  }
  return { mimeType: "audio/mpeg", base64: first };
}
