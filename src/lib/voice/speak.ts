import "server-only";

import type { VoiceAudio } from "./contracts";
import { promptText, type PromptSpec } from "./conversation";
import { synthesizeSpeech } from "./tts";

export type SpeakOptions = { signal?: AbortSignal; timeoutMs?: number };

/**
 * Template replies come from a fixed set (ten keys, four leads, three
 * languages), so each is synthesized once per isolate and then costs nothing.
 * Replies that repeat the person's words back are never cached: that would
 * keep their speech in server memory.
 */
const cache = new Map<string, VoiceAudio>();

function cacheKey(spec: PromptSpec): string {
  return `${spec.lang}|${spec.lead}|${spec.key}`;
}

export function isPromptCached(spec: PromptSpec): boolean {
  return cache.has(cacheKey(spec));
}

export function resetSpeechCache(): void {
  cache.clear();
}

/** A template reply as audio, or null when TTS fails. Never throws. */
export async function speakPrompt(spec: PromptSpec, options?: SpeakOptions): Promise<VoiceAudio | null> {
  const key = cacheKey(spec);
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const audio = await synthesizeSpeech(promptText(spec), spec.lang, options);
    cache.set(key, audio);
    return audio;
  } catch {
    return null;
  }
}

/** Any other reply as audio, uncached, or null when TTS fails. Never throws. */
export async function speakOnce(
  text: string,
  lang: PromptSpec["lang"],
  options?: SpeakOptions,
): Promise<VoiceAudio | null> {
  try {
    return await synthesizeSpeech(text, lang, options);
  } catch {
    return null;
  }
}
