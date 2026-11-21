import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const viewer = vi.hoisted(() => ({ address: "203.0.113.20:40000" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "cloudfront-viewer-address": viewer.address }),
  cookies: async () => ({ get: () => undefined }),
}));

import { resetRateLimits } from "@/lib/rate-limit";
import { promptText } from "@/lib/voice/conversation";
import { resetSpeechCache, speakOnce, speakPrompt } from "@/lib/voice/speak";
import { speakPromptAction } from "@/lib/voice/speak-action";
import { synthesizeSpeech, TTS_SETTINGS } from "@/lib/voice/tts";

const ENDPOINT = "https://api.sarvam.ai/text-to-speech";

function ok(audios: unknown = ["SUQzBAAA"]) {
  return new Response(JSON.stringify({ request_id: "r1", audios }), {
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  resetSpeechCache();
  resetRateLimits();
  vi.stubEnv("SARVAM_API_KEY", "tts-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("synthesizeSpeech", () => {
  it("posts Udyam-Saathi's bulbul settings with the language's Indian locale", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(url).toBe(ENDPOINT);
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({ "content-type": "application/json", "api-subscription-key": "tts-secret" });
      expect(JSON.parse(String(init?.body))).toEqual({
        text: "आपने यह कब देखा?",
        target_language_code: "hi-IN",
        ...TTS_SETTINGS,
      });
      return ok();
    });
    await expect(synthesizeSpeech(" आपने यह कब देखा? ", "hi", { fetchImpl })).resolves.toEqual({
      mimeType: "audio/mpeg",
      base64: "SUQzBAAA",
    });
    expect(TTS_SETTINGS).toMatchObject({ model: "bulbul:v3", speaker: "shubh", output_audio_codec: "mp3" });
  });

  it("throws on HTTP errors, empty audio, and a missing key", async () => {
    const failing = vi.fn(async () => new Response("rate limited", { status: 429 }));
    await expect(synthesizeSpeech("hi", "en", { fetchImpl: failing })).rejects.toThrow("HTTP 429");
    const empty = vi.fn(async () => ok([]));
    await expect(synthesizeSpeech("hi", "en", { fetchImpl: empty })).rejects.toThrow("no audio");
    vi.stubEnv("SARVAM_API_KEY", "");
    await expect(synthesizeSpeech("hi", "en", { fetchImpl: failing })).rejects.toThrow("not configured");
  });
});

describe("speakPrompt and speakOnce", () => {
  it("synthesizes a template once per isolate and never throws", async () => {
    const fetchImpl = vi.fn(async () => ok());
    vi.stubGlobal("fetch", fetchImpl);
    const spec = { key: "recurs", lead: "ack", lang: "mr" } as const;
    expect(await speakPrompt(spec)).toEqual({ mimeType: "audio/mpeg", base64: "SUQzBAAA" });
    expect(await speakPrompt(spec)).toEqual({ mimeType: "audio/mpeg", base64: "SUQzBAAA" });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(String(init.body)).text).toBe(promptText(spec));
  });

  it("turns a TTS failure into silence rather than an error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })));
    await expect(speakPrompt({ key: "done", lead: "none", lang: "en" })).resolves.toBeNull();
    await expect(speakOnce("I heard “x”. Is that right?", "en")).resolves.toBeNull();
  });
});

describe("speakPromptAction", () => {
  it("speaks only named templates, never text from the browser", async () => {
    const fetchImpl = vi.fn(async () => ok());
    vi.stubGlobal("fetch", fetchImpl);
    await expect(speakPromptAction("Say anything I like", "ack", "en")).resolves.toBeNull();
    await expect(speakPromptAction("recurs", "shout", "en")).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
    await expect(speakPromptAction("recurs", "ack", "hi")).resolves.toEqual({
      mimeType: "audio/mpeg",
      base64: "SUQzBAAA",
    });
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(String(init.body)).text).toBe(promptText({ key: "recurs", lead: "ack", lang: "hi" }));
  });

  it("stays silent without a key or once the caller's uncached allowance is spent", async () => {
    const fetchImpl = vi.fn(async () => new Response("down", { status: 503 }));
    vi.stubGlobal("fetch", fetchImpl);
    for (let i = 0; i < 60; i += 1) await speakPromptAction("done", "none", "en");
    expect(fetchImpl).toHaveBeenCalledTimes(60);
    await expect(speakPromptAction("done", "none", "en")).resolves.toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(60);
    // One address cannot drain the isolate's allowance for everyone else.
    viewer.address = "198.51.100.7:40000";
    await speakPromptAction("done", "none", "en");
    expect(fetchImpl).toHaveBeenCalledTimes(61);
    vi.stubEnv("SARVAM_API_KEY", "");
    resetRateLimits();
    await expect(speakPromptAction("done", "none", "en")).resolves.toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(61);
  });

  it("caps the isolate's uncached spend across every address", async () => {
    const fetchImpl = vi.fn(async () => new Response("down", { status: 503 }));
    vi.stubGlobal("fetch", fetchImpl);
    for (let i = 0; i < 200; i += 1) {
      viewer.address = `203.0.113.${i % 250}:${40000 + i}`;
      await speakPromptAction("done", "none", "en");
    }
    expect(fetchImpl).toHaveBeenCalledTimes(200);
    viewer.address = "192.0.2.1:40000";
    await expect(speakPromptAction("done", "none", "en")).resolves.toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(200);
  });
});
