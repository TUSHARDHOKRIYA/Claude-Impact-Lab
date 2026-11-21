import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let requestHeaders = new Headers();

vi.mock("next/headers", () => ({
  headers: async () => requestHeaders,
  cookies: async () => ({ get: () => undefined }),
}));

const { transcribeSpeech, extractVoiceCalls } = vi.hoisted(() => ({
  transcribeSpeech: vi.fn(),
  extractVoiceCalls: vi.fn(),
}));

// Only the paid call is stubbed. `isSpendableClip` stays real, because
// whether a clip is worth spending on is exactly what these tests assert.
vi.mock("@/lib/voice/stt", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/voice/stt")>()),
  transcribeSpeech,
}));
vi.mock("@/lib/voice/extract", () => ({ extractVoiceCalls }));

import { processVoiceTurnAction } from "@/lib/voice/actions";
import { resetRateLimits } from "@/lib/rate-limit";

const BUSY = "Voice is busy right now. Continue by typing.";
const UNCONFIGURED = "Voice is not configured. Continue by typing.";
const ENV_KEYS = [
  "SARVAM_API_KEY",
  "VOICE_LLM_BASE_URL",
  "VOICE_LLM_MODEL",
  "VOICE_LLM_KEY_NAME",
] as const;
const ORIGINAL_ENV = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function configure(): void {
  process.env.SARVAM_API_KEY = "sk-test";
  process.env.VOICE_LLM_BASE_URL = "https://api.sarvam.ai/v1";
  process.env.VOICE_LLM_MODEL = "sarvam-105b-conversations";
  process.env.VOICE_LLM_KEY_NAME = "SARVAM_API_KEY";
}

function clip(): FormData {
  const data = new FormData();
  data.set("audio", new File([new Uint8Array(2048)], "clip.webm", { type: "audio/webm" }));
  return data;
}

/** A turn that cannot cost anything: no clip to send to either paid API. */
function empty(): FormData {
  return new FormData();
}

/** A clip the upload would refuse anyway: wrong type, or nothing in it. */
function junk(type: string, bytes: number): FormData {
  const data = new FormData();
  data.set("audio", new File([new Uint8Array(bytes)], "clip.bin", { type }));
  return data;
}

function fromViewer(ip: string): void {
  requestHeaders = new Headers({ "cloudfront-viewer-address": `${ip}:40000` });
}

/**
 * This action spends money per call, so the caps are the spend control until a
 * shared counter exists. Both are asserted here: the per-address cap keeps one
 * room fair, the global cap bounds the bill when addresses vary.
 */
describe("the voice spend caps", () => {
  beforeEach(() => {
    resetRateLimits();
    configure();
    transcribeSpeech.mockReset();
    extractVoiceCalls.mockReset();
    // Configured, so the caps are reached, but the transcription throws, so no
    // turn ever succeeds and nothing real is called.
    transcribeSpeech.mockRejectedValue(new Error("no network in tests"));
    fromViewer("203.0.113.9");
  });

  afterEach(() => {
    resetRateLimits();
    for (const key of ENV_KEYS) {
      if (ORIGINAL_ENV[key] === undefined) delete process.env[key];
      else process.env[key] = ORIGINAL_ENV[key];
    }
  });

  it("lets a room through and then throttles that address", async () => {
    for (let i = 0; i < 60; i += 1) {
      const result = await processVoiceTurnAction(clip());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).not.toBe(BUSY);
    }
    const throttled = await processVoiceTurnAction(clip());
    expect(throttled.ok).toBe(false);
    if (!throttled.ok) expect(throttled.error).toBe(BUSY);
  });

  it("bounds total spend even when every request has a fresh address", async () => {
    let allowed = 0;
    for (let i = 0; i < 400; i += 1) {
      fromViewer(`198.51.${Math.floor(i / 250)}.${i % 250}`);
      const result = await processVoiceTurnAction(clip());
      if (!result.ok && result.error === BUSY) break;
      allowed += 1;
    }
    expect(allowed).toBe(200);
  });

  it("never reaches the paid calls while throttled", async () => {
    for (let i = 0; i < 205; i += 1) await processVoiceTurnAction(clip());
    transcribeSpeech.mockReset();
    const throttled = await processVoiceTurnAction(clip());
    expect(throttled.ok).toBe(false);
    if (!throttled.ok) expect(throttled.error).toBe(BUSY);
    expect(transcribeSpeech).not.toHaveBeenCalled();
    expect(extractVoiceCalls).not.toHaveBeenCalled();
  });

  /**
   * The allowance is for turns that can cost money. Spending it on requests
   * that never reach a paid API hands any stranger a way to deny voice to
   * everyone else for the window, without an account or even a clip.
   */
  it("does not spend the allowance on a request with no audio", async () => {
    for (let i = 0; i < 400; i += 1) {
      const result = await processVoiceTurnAction(empty());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).not.toBe(BUSY);
    }

    // A real clip still has its whole allowance.
    const real = await processVoiceTurnAction(clip());
    expect(real.ok).toBe(false);
    if (!real.ok) expect(real.error).not.toBe(BUSY);
  });

  it("does not spend the allowance on a clip the upload would refuse", async () => {
    for (let i = 0; i < 200; i += 1) {
      // An empty clip and a file that is not audio at all.
      expect((await processVoiceTurnAction(junk("audio/webm", 0))).ok).toBe(false);
      expect((await processVoiceTurnAction(junk("application/zip", 4096))).ok).toBe(false);
    }

    const real = await processVoiceTurnAction(clip());
    expect(real.ok).toBe(false);
    if (!real.ok) expect(real.error).not.toBe(BUSY);
  });

  it("does not spend the allowance while voice is unconfigured", async () => {
    delete process.env.VOICE_LLM_BASE_URL;
    for (let i = 0; i < 400; i += 1) {
      const result = await processVoiceTurnAction(clip());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe(UNCONFIGURED);
    }

    configure();
    const real = await processVoiceTurnAction(clip());
    expect(real.ok).toBe(false);
    if (!real.ok) expect(real.error).not.toBe(BUSY);
  });
});
