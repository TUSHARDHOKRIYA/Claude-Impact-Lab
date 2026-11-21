import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "cloudfront-viewer-address": "203.0.113.20:40000" }),
  cookies: async () => ({ get: () => undefined }),
}));

const { transcribeSpeech, extractVoiceCalls, synthesizeSpeech } = vi.hoisted(() => ({
  transcribeSpeech: vi.fn(),
  extractVoiceCalls: vi.fn(),
  synthesizeSpeech: vi.fn(),
}));

vi.mock("@/lib/voice/stt", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/voice/stt")>()),
  transcribeSpeech,
}));
vi.mock("@/lib/voice/extract", () => ({ extractVoiceCalls }));
vi.mock("@/lib/voice/tts", () => ({ synthesizeSpeech }));

import { processVoiceTurnAction } from "@/lib/voice/actions";
import { askedQuestion } from "@/lib/voice/conversation";
import { spokenLandmark } from "@/lib/voice/form-bridge";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetSpeechCache } from "@/lib/voice/speak";

const AUDIO = { mimeType: "audio/mpeg", base64: "SUQzBAAA" };

function clip(extra: Record<string, string> = {}): FormData {
  const data = new FormData();
  data.set("audio", new File([new Uint8Array(2048)], "clip.webm", { type: "audio/webm" }));
  for (const [key, value] of Object.entries(extra)) data.set(key, value);
  return data;
}

function heard(transcript: string, languageCode = "en-IN", languageProbability = 0.99) {
  transcribeSpeech.mockResolvedValue({ transcript, languageCode, languageProbability });
}

beforeEach(() => {
  resetRateLimits();
  resetSpeechCache();
  vi.stubEnv("SARVAM_API_KEY", "sk-test");
  vi.stubEnv("VOICE_LLM_BASE_URL", "https://api.sarvam.ai/v1");
  vi.stubEnv("VOICE_LLM_MODEL", "sarvam-105b-conversations");
  vi.stubEnv("VOICE_LLM_KEY_NAME", "SARVAM_API_KEY");
  transcribeSpeech.mockReset();
  extractVoiceCalls.mockReset();
  synthesizeSpeech.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("a conversational voice turn", () => {
  it("fills what it heard, asks for the next slot, and speaks the reply", async () => {
    heard("There is a big pothole near Hindmata");
    extractVoiceCalls.mockResolvedValue({
      calls: [
        { slot: "issue_type", value: "pothole" },
        { slot: "pin", value: "loc-hindmata" },
      ],
      warnings: [],
    });
    synthesizeSpeech.mockResolvedValue(AUDIO);

    const result = await processVoiceTurnAction(clip({ speak: "1", lang: "en" }));

    expect(result).toMatchObject({
      ok: true,
      fields: { issueType: "pothole" },
      pinProposal: { landmarkId: "loc-hindmata" },
      replyLanguage: "en",
      reply: {
        text: "Got it. When did you notice it? Today, this week, this month, 1 to 6 months ago, or more than six months ago.",
        ask: "noticed_window",
        confirm: false,
      },
      audio: AUDIO,
    });
    expect(synthesizeSpeech).toHaveBeenCalledWith(
      "Got it. When did you notice it? Today, this week, this month, 1 to 6 months ago, or more than six months ago.",
      "en",
      expect.objectContaining({ timeoutMs: expect.any(Number), signal: expect.any(AbortSignal) }),
    );
  });

  it("passes the asked question to the extractor so a bare answer lands in its slot", async () => {
    heard("कल", "hi-IN");
    extractVoiceCalls.mockResolvedValue({ calls: [{ slot: "noticed_window", value: "this_week" }], warnings: [] });

    const result = await processVoiceTurnAction(
      clip({ asked: "noticed_window", filled: JSON.stringify(["issue_type"]), lang: "en" }),
    );

    // The spoken language, not the screen's "en", decides the description's language.
    expect(extractVoiceCalls).toHaveBeenCalledWith("कल", expect.anything(), expect.objectContaining({
      asked: askedQuestion("noticed_window"),
      lang: "hi",
      maxTurns: 3,
    }));
    expect(result).toMatchObject({
      ok: true,
      replyLanguage: "hi",
      reply: { text: "ठीक है। क्या यह साफ़ होने के बाद फिर से हो जाता है?", ask: "recurs" },
      audio: null,
    });
    // Not asked to speak (muted): no TTS spend at all.
    expect(synthesizeSpeech).not.toHaveBeenCalled();
  });

  it("still answers, silently, when text-to-speech fails", async () => {
    heard("pothole since yesterday, keeps coming back");
    extractVoiceCalls.mockResolvedValue({
      calls: [
        { slot: "issue_type", value: "pothole" },
        { slot: "noticed_window", value: "this_week" },
        { slot: "recurs", value: "true" },
      ],
      warnings: [],
    });
    synthesizeSpeech.mockRejectedValue(new Error("Speech provider returned HTTP 503."));

    const result = await processVoiceTurnAction(clip({ speak: "1" }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // All four answers in one sentence: the next question is where it is.
    expect(result.reply.ask).toBe("place");
    expect(result.reply.text).toMatch(/^Got it\. Where is it\?/);
    expect(result.audio).toBeNull();
  });

  it("holds a weak transcript for confirmation and speaks it uncached", async () => {
    heard("pothole", "en-IN", 0.3);
    extractVoiceCalls.mockResolvedValue({ calls: [{ slot: "issue_type", value: "pothole" }], warnings: [] });
    synthesizeSpeech.mockResolvedValue(AUDIO);

    const first = await processVoiceTurnAction(clip({ speak: "1" }));
    const second = await processVoiceTurnAction(clip({ speak: "1" }));

    expect(first).toMatchObject({ ok: true, reply: { text: "I heard “pothole”. Is that right?", confirm: true, ask: null } });
    expect(second).toMatchObject({ ok: true, audio: AUDIO });
    // The echo carries the person's words, so it is never served from cache.
    expect(synthesizeSpeech).toHaveBeenCalledTimes(2);
  });

  it("serves a repeated template reply from cache", async () => {
    heard("garbage");
    extractVoiceCalls.mockResolvedValue({ calls: [{ slot: "issue_type", value: "pothole" }], warnings: [] });
    synthesizeSpeech.mockResolvedValue(AUDIO);

    await processVoiceTurnAction(clip({ speak: "1" }));
    const again = await processVoiceTurnAction(clip({ speak: "1" }));

    expect(again).toMatchObject({ ok: true, audio: AUDIO });
    expect(synthesizeSpeech).toHaveBeenCalledOnce();
  });

  it("still fails the turn, with the draft-safe copy, when transcription fails", async () => {
    transcribeSpeech.mockRejectedValue(new Error("no network"));
    await expect(processVoiceTurnAction(clip({ speak: "1" }))).resolves.toEqual({
      ok: false,
      error: "Voice could not process that clip. Your draft is safe; try again or continue by typing.",
      retryable: true,
    });
    expect(synthesizeSpeech).not.toHaveBeenCalled();
  });
});

describe("a landmark the person clearly named", () => {
  it("becomes a pin proposal even when the model skipped propose_pin", async () => {
    heard("हिंदमाता के पास गड्ढा है", "hi-IN");
    extractVoiceCalls.mockResolvedValue({ calls: [{ slot: "issue_type", value: "pothole" }], warnings: [] });
    const result = await processVoiceTurnAction(clip());
    expect(result).toMatchObject({ ok: true, pinProposal: { landmarkId: "loc-hindmata" } });
  });

  it("matches area names in either script, and stays out of it when unsure", () => {
    expect(spokenLandmark("Hindmata ke paas paani bhara hai")?.landmarkId).toBe("loc-hindmata");
    expect(spokenLandmark("हिंदमाता के पास गड्ढा है")?.landmarkId).toBe("loc-hindmata");
    expect(spokenLandmark("near King's Circle station")?.landmarkId).toBe("loc-kings-circle");
    expect(spokenLandmark("सायन में सड़क धँस गई")?.landmarkId).toBe("loc-sion");
    // Two areas named is a guess, so no pin.
    expect(spokenLandmark("between Parel and Sion")).toBeNull();
  });
});
