import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  MAX_VOICE_AUDIO_BYTES,
  MAX_VOICE_TRANSCRIPT_CHARS,
} from "@/lib/voice/contracts";
import { transcribeSpeech } from "@/lib/voice/stt";

const ENDPOINT = "https://api.sarvam.ai/speech-to-text";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("transcribeSpeech", () => {
  it.each([
    ["audio/webm", "speech.webm"],
    ["audio/mp4", "speech.mp4"],
    ["audio/ogg", "speech.ogg"],
  ])("posts the exact Saaras v4 contract for %s", async (type, name) => {
    vi.stubEnv("SARVAM_API_KEY", "stt-secret");
    const audio = new File(["audio"], name, { type });
    const fetchImpl = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        expect(url).toBe(ENDPOINT);
        expect(init?.method).toBe("POST");
        expect(init?.headers).toEqual({
          "api-subscription-key": "stt-secret",
        });
        const body = init?.body as FormData;
        const filePart = body.get("file") as File;
        expect(filePart.name).toBe(name);
        expect(filePart.type).toBe(type);
        expect(filePart.size).toBe(audio.size);
        expect(body.get("model")).toBe("saaras:v4");
        expect(body.get("mode")).toBe("codemix");
        expect(body.get("language_code")).toBe("unknown");
        return new Response(
          JSON.stringify({
            transcript: "फुटपाथ तुटला आहे",
            language_code: "mr-IN",
            language_probability: 0.96,
            provider_internal: "must not escape",
          }),
        );
      },
    );

    await expect(
      transcribeSpeech(audio, { fetchImpl: fetchImpl as typeof fetch }),
    ).resolves.toEqual({
      transcript: "फुटपाथ तुटला आहे",
      languageCode: "mr-IN",
      languageProbability: 0.96,
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it.each([
    ["standalone Opus", "audio/opus"],
    ["WAV", "audio/wav"],
    ["missing MIME", ""],
  ])("rejects unsupported %s input before fetch", async (_label, type) => {
    vi.stubEnv("SARVAM_API_KEY", "stt-secret");
    const fetchImpl = vi.fn();
    const audio = new File(["audio"], "speech.bin", { type });
    await expect(transcribeSpeech(audio, { fetchImpl })).rejects.toThrow(
      "Record a WebM, MP4, or Ogg audio clip.",
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    ["empty", new Uint8Array(0)],
    ["oversized", new Uint8Array(MAX_VOICE_AUDIO_BYTES + 1)],
  ])("rejects an %s clip before fetch", async (_label, bytes) => {
    vi.stubEnv("SARVAM_API_KEY", "stt-secret");
    const fetchImpl = vi.fn();
    const audio = new File([bytes], "speech.webm", { type: "audio/webm" });
    await expect(transcribeSpeech(audio, { fetchImpl })).rejects.toThrow(
      "The voice clip is empty or too large.",
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a non-2xx provider response without returning its body", async () => {
    vi.stubEnv("SARVAM_API_KEY", "stt-secret");
    const fetchImpl = vi.fn(async () =>
      new Response("provider-secret-detail", { status: 503 }),
    );
    await expect(
      transcribeSpeech(
        new File(["audio"], "speech.webm", { type: "audio/webm" }),
        { fetchImpl },
      ),
    ).rejects.toThrow("Speech provider returned HTTP 503.");
  });

  it.each([
    ["malformed JSON", new Response("{nope")],
    [
      "blank transcript",
      new Response(
        JSON.stringify({
          transcript: " \n ",
          language_code: "mr-IN",
          language_probability: 0.7,
        }),
      ),
    ],
    [
      "oversized transcript",
      new Response(
        JSON.stringify({
          transcript: "x".repeat(MAX_VOICE_TRANSCRIPT_CHARS + 1),
          language_code: "en-IN",
          language_probability: null,
        }),
      ),
    ],
  ])("rejects a %s response", async (_label, response) => {
    vi.stubEnv("SARVAM_API_KEY", "stt-secret");
    const fetchImpl = vi.fn(async () => response);
    await expect(
      transcribeSpeech(
        new File(["audio"], "speech.webm", { type: "audio/webm" }),
        { fetchImpl },
      ),
    ).rejects.toThrow();
  });
});
