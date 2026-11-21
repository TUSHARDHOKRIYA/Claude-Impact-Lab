import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "cloudfront-viewer-address": "203.0.113.20:40000" }),
  cookies: async () => ({ get: () => undefined }),
}));

import { resetRateLimits } from "@/lib/rate-limit";
import { processVoiceTurnAction } from "@/lib/voice/actions";
import { VOICE_TURN_BUDGET_MS } from "@/lib/voice/deadline";
import type { VoiceTurnResult } from "@/lib/voice/contracts";
import { resetSpeechCache } from "@/lib/voice/speak";

const TOO_LONG = "Voice took too long. Your draft is safe; try again or continue by typing.";
const TRANSCRIPT = "secret-transcript-must-not-be-logged";

function clip(extra: Record<string, string> = {}): FormData {
  const data = new FormData();
  data.set("audio", new File([new Uint8Array(2048)], "clip.webm", { type: "audio/webm" }));
  for (const [key, value] of Object.entries(extra)) data.set(key, value);
  return data;
}

function sttResponse(transcript = TRANSCRIPT): Response {
  return new Response(
    JSON.stringify({ transcript, language_code: "en-IN", language_probability: 0.99 }),
  );
}

function toolResponse(): Response {
  return new Response(
    JSON.stringify({
      choices: [
        {
          finish_reason: "tool_calls",
          message: {
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: {
                  name: "save_issue_type",
                  arguments: JSON.stringify({ issue_type: "waste" }),
                },
              },
            ],
          },
        },
      ],
    }),
  );
}

function stopResponse(): Response {
  return new Response(
    JSON.stringify({
      choices: [{ finish_reason: "stop", message: { content: null, tool_calls: [] } }],
    }),
  );
}

/** Advance fake timers until the turn settles, and fail if it outlives the budget. */
async function settleWithinBudget(pending: Promise<VoiceTurnResult>): Promise<VoiceTurnResult> {
  let settled: VoiceTurnResult | undefined;
  let rejected: unknown;
  pending.then(
    (value) => {
      settled = value;
    },
    (error: unknown) => {
      rejected = error;
    },
  );
  await vi.advanceTimersByTimeAsync(VOICE_TURN_BUDGET_MS);
  expect(rejected, "voice turn rejected").toBeUndefined();
  expect(settled, "still pending after the voice budget").toBeDefined();
  return settled as VoiceTurnResult;
}

beforeEach(() => {
  resetRateLimits();
  resetSpeechCache();
  vi.stubEnv("SARVAM_API_KEY", "sk-test");
  vi.stubEnv("VOICE_LLM_BASE_URL", "https://api.sarvam.ai/v1");
  vi.stubEnv("VOICE_LLM_MODEL", "sarvam-105b-conversations");
  vi.stubEnv("VOICE_LLM_KEY_NAME", "SARVAM_API_KEY");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("voice turn deadline", () => {
  it("returns the timeout failure when speech recognition never answers", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", () => new Promise(() => {}));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await settleWithinBudget(processVoiceTurnAction(clip()));

    expect(result).toEqual({ ok: false, error: TOO_LONG, retryable: true });
    expect(logged).toHaveBeenCalledTimes(1);
    expect(logged).toHaveBeenCalledWith("voice turn failed:", "Voice deadline exceeded");
  });

  it("stops the extraction loop after 3 turns when the model keeps calling tools", async () => {
    let chats = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const href = String(url);
        if (href.includes("speech-to-text")) return sttResponse("pothole near Hindmata");
        if (href.includes("chat/completions")) {
          chats += 1;
          return toolResponse();
        }
        throw new Error(`unexpected fetch ${href}`);
      }),
    );

    const result = await processVoiceTurnAction(clip());

    expect(chats).toBe(3);
    expect(result).toMatchObject({ ok: true, fields: { issueType: "waste" } });
  });

  it("returns the turn with no audio when text-to-speech never answers", async () => {
    vi.useFakeTimers();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const href = String(url);
        if (href.includes("speech-to-text")) return sttResponse("pothole near Hindmata");
        if (href.includes("chat/completions")) return stopResponse();
        return new Promise(() => {});
      }),
    );

    const result = await settleWithinBudget(processVoiceTurnAction(clip({ speak: "1" })));

    expect(result).toMatchObject({
      ok: true,
      transcript: "pothole near Hindmata",
      audio: null,
    });
    expect(logged).not.toHaveBeenCalled();
  });

  it("times out when speech recognition returns but the body never arrives", async () => {
    vi.useFakeTimers();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", () => {
      const response = new Response("{}", { status: 200 });
      response.json = () => new Promise(() => {});
      return Promise.resolve(response);
    });

    const result = await settleWithinBudget(processVoiceTurnAction(clip()));

    expect(result).toEqual({ ok: false, error: TOO_LONG, retryable: true });
    expect(logged).toHaveBeenCalled();
  });

  it("returns the turn with no audio when speech synthesis returns but the body never arrives", async () => {
    vi.useFakeTimers();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const href = String(url);
        if (href.includes("speech-to-text")) return sttResponse("pothole near Hindmata");
        if (href.includes("chat/completions")) return stopResponse();
        const response = new Response("{}", { status: 200 });
        response.json = () => new Promise(() => {});
        return response;
      }),
    );

    const result = await settleWithinBudget(processVoiceTurnAction(clip({ speak: "1" })));

    expect(result).toMatchObject({ ok: true, transcript: "pothole near Hindmata", audio: null });
    expect(logged).not.toHaveBeenCalled();
  });

  it("returns the timeout failure when a model call never answers, without logging the transcript", async () => {
    vi.useFakeTimers();
    let chats = 0;
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const href = String(url);
        if (href.includes("speech-to-text")) return sttResponse();
        chats += 1;
        return new Promise(() => {});
      }),
    );

    const result = await settleWithinBudget(processVoiceTurnAction(clip()));

    expect(chats).toBeGreaterThan(0);
    expect(result).toEqual({ ok: false, error: TOO_LONG, retryable: true });
    expect(logged.mock.calls.flat().join(" ")).not.toContain(TRANSCRIPT);
  });
});
