import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { callsToFormPatch } from "@/lib/voice/form-bridge";
import { extractVoiceCalls } from "@/lib/voice/extract";
import { resetRateLimits } from "@/lib/rate-limit";
import type { FetchLike } from "@/lib/voice/chat";
import type { ModelTarget } from "@/lib/voice/targets";
import type { NormalizedCall, RawToolCall } from "@/lib/voice/validate";

const TARGET: ModelTarget = {
  id: "test",
  baseURL: "https://voice.example/v1",
  model: "voice-test",
  apiKey: "llm-secret",
  subscriptionHeader: false,
};

function completion(calls: RawToolCall[], content: string | null = null): string {
  return JSON.stringify({
    choices: [
      {
        finish_reason: calls.length > 0 ? "tool_calls" : "stop",
        message: {
          content,
          tool_calls: calls.map((call, index) => ({
            id: `call_${index}`,
            type: "function",
            function: {
              name: call.name,
              arguments: call.argumentsJson,
            },
          })),
        },
      },
    ],
  });
}

function call(name: string, args: object): RawToolCall {
  return { name, argumentsJson: JSON.stringify(args) };
}

function stubChat(bodies: string[], seen: RequestInit[] = []): FetchLike {
  let index = 0;
  return async (_url, init) => {
    seen.push(init);
    const body = bodies[Math.min(index, bodies.length - 1)];
    index += 1;
    return new Response(body);
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetRateLimits();
});

describe("extractVoiceCalls", () => {
  it("accepts parallel validated calls and continues to handoff", async () => {
    const result = await extractVoiceCalls("broken footpath", TARGET, {
      fetchImpl: stubChat([
        completion([
          call("save_issue_type", { issue_type: "footpath" }),
          call("save_affects", { affects: ["walking", "wheeling"] }),
        ]),
        completion([], "Please review the form."),
      ]),
    });
    expect(result).toEqual({
      calls: [
        { slot: "issue_type", value: "footpath" },
        { slot: "affects", value: ["walking", "wheeling"] },
      ],
      warnings: [],
    });
  });

  it("continues when the model emits one call per turn", async () => {
    const seen: RequestInit[] = [];
    const result = await extractVoiceCalls("details", TARGET, {
      fetchImpl: stubChat(
        [
          completion([call("save_issue_type", { issue_type: "road" })]),
          completion([call("save_recurs", { recurs: "false" })]),
          completion([
            call("save_description", { description: "A deep pothole." }),
          ]),
          completion([], "Done."),
        ],
        seen,
      ),
    });
    expect(result.calls).toEqual([
      { slot: "issue_type", value: "road" },
      { slot: "recurs", value: "false" },
      { slot: "description", value: "A deep pothole." },
    ]);
    expect(seen).toHaveLength(4);
    const fourth = JSON.parse(String(seen[3].body)) as {
      messages: Array<{ role: string }>;
    };
    expect(fourth.messages.filter((message) => message.role === "tool")).toHaveLength(3);
  });

  it("keeps the first valid slot and warns for duplicates and invalid calls", async () => {
    const result = await extractVoiceCalls("mixed", TARGET, {
      fetchImpl: stubChat([
        completion([
          call("save_issue_type", { issue_type: "road" }),
          call("save_issue_type", { issue_type: "waste" }),
          call("save_recurs", { recurs: true }),
          { name: "submit_report", argumentsJson: "{}" },
        ]),
        completion([]),
      ]),
    });
    expect(result.calls).toEqual([{ slot: "issue_type", value: "road" }]);
    expect(result.warnings).toEqual([
      "issue_type: duplicate ignored",
      "save_recurs: recurs is boolean, expected a string",
      expect.stringMatching(/^submit_report: no such tool/),
    ]);
  });

  it("returns no invented fields when the model emits prose without calls", async () => {
    await expect(
      extractVoiceCalls("unclear", TARGET, {
        fetchImpl: stubChat([completion([], "Continue by typing.")]),
      }),
    ).resolves.toEqual({ calls: [], warnings: [] });
  });

  it("terminates at the explicit maximum turn count", async () => {
    const seen: RequestInit[] = [];
    const result = await extractVoiceCalls("many details", TARGET, {
      maxTurns: 2,
      fetchImpl: stubChat(
        [
          completion([call("save_issue_type", { issue_type: "road" })]),
          completion([call("save_recurs", { recurs: "true" })]),
          completion([call("save_affects", { affects: ["driving"] })]),
        ],
        seen,
      ),
    });
    expect(seen).toHaveLength(2);
    expect(result.calls).toEqual([
      { slot: "issue_type", value: "road" },
      { slot: "recurs", value: "true" },
    ]);
  });
});

describe("callsToFormPatch", () => {
  it("writes existing form names and turns a landmark into a proposal", () => {
    const calls: NormalizedCall[] = [
      { slot: "issue_type", value: "footpath" },
      { slot: "noticed_window", value: "this_week" },
      { slot: "recurs", value: "true" },
      { slot: "affects", value: ["walking", "wheeling"] },
      { slot: "description", value: "Broken paving outside the gallery." },
      { slot: "pin", value: "jehangir" },
    ];
    const result = callsToFormPatch(calls);
    expect(result.fields).toEqual({
      issueType: "footpath",
      noticedWindow: "this_week",
      recurs: "true",
      affects: ["walking", "wheeling"],
      description: "Broken paving outside the gallery.",
    });
    expect(result.pinProposal).toEqual({
      landmarkId: "jehangir",
      label: "Jehangir Art Gallery",
      lat: 18.9277,
      lng: 72.83185,
    });
    expect(result.fields).not.toHaveProperty("category");
    expect(result.fields).not.toHaveProperty("who_blocked");
  });
});

describe("processVoiceTurnAction", () => {
  it("maps malformed provider configuration without making a paid call", async () => {
    vi.stubEnv("SARVAM_API_KEY", "stt-secret");
    vi.stubEnv("VOICE_LLM_BASE_URL", "not a URL");
    vi.stubEnv("VOICE_LLM_MODEL", TARGET.model);
    vi.stubEnv("VOICE_LLM_KEY_NAME", "SARVAM_API_KEY");
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    const { processVoiceTurnAction } = await import("@/lib/voice/actions");

    await expect(processVoiceTurnAction(new FormData())).resolves.toEqual({
      ok: false,
      error: "Voice is not configured. Continue by typing.",
      retryable: false,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("keeps the conversation going when extraction accepts zero calls", async () => {
    vi.stubEnv("SARVAM_API_KEY", "stt-secret");
    vi.stubEnv("VOICE_LLM_BASE_URL", TARGET.baseURL);
    vi.stubEnv("VOICE_LLM_MODEL", TARGET.model);
    vi.stubEnv("VOICE_LLM_KEY_NAME", "SARVAM_API_KEY");
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("speech-to-text")) {
        return new Response(
          JSON.stringify({
            transcript: "unclear",
            language_code: "en-IN",
            language_probability: 0.8,
          }),
        );
      }
      return new Response(completion([]));
    });
    vi.stubGlobal("fetch", fetchImpl);
    const { processVoiceTurnAction } = await import("@/lib/voice/actions");
    const data = new FormData();
    data.set("audio", new File(["audio"], "speech.webm", { type: "audio/webm" }));

    // Nothing understood is a turn, not a dead end: the thread shows what was
    // heard and the assistant asks for the first empty slot.
    await expect(processVoiceTurnAction(data)).resolves.toEqual({
      ok: true,
      transcript: "unclear",
      languageCode: "en-IN",
      fields: {},
      pinProposal: null,
      warnings: [],
      replyLanguage: "en",
      reply: {
        text: "Sorry, I did not catch that. What is the problem? For example a broken footpath, garbage, or a blocked drain.",
        ask: "issue_type",
        confirm: false,
      },
      audio: null,
    });
  });

  it("returns ok true with validated calls and retained warnings", async () => {
    vi.stubEnv("SARVAM_API_KEY", "stt-secret");
    vi.stubEnv("VOICE_LLM_BASE_URL", TARGET.baseURL);
    vi.stubEnv("VOICE_LLM_MODEL", TARGET.model);
    vi.stubEnv("VOICE_LLM_KEY_NAME", "SARVAM_API_KEY");
    const responses = [
      new Response(
        JSON.stringify({
          transcript: "road near gallery",
          language_code: "en-IN",
          language_probability: 0.9,
        }),
      ),
      new Response(
        completion([
          call("save_issue_type", { issue_type: "road" }),
          call("save_issue_type", { issue_type: "waste" }),
          call("save_recurs", { recurs: true }),
        ]),
      ),
      new Response(completion([])),
    ];
    const fetchImpl = vi.fn(async () => {
      const response = responses.shift();
      if (!response) throw new Error("Unexpected fetch");
      return response;
    });
    vi.stubGlobal("fetch", fetchImpl);
    const { processVoiceTurnAction } = await import("@/lib/voice/actions");
    const data = new FormData();
    data.set("audio", new File(["audio"], "speech.webm", { type: "audio/webm" }));

    await expect(processVoiceTurnAction(data)).resolves.toEqual({
      ok: true,
      transcript: "road near gallery",
      languageCode: "en-IN",
      fields: { issueType: "road" },
      pinProposal: null,
      warnings: [
        "issue_type: duplicate ignored",
        "save_recurs: recurs is boolean, expected a string",
      ],
      replyLanguage: "en",
      reply: { text: "Got it. When did you notice it? Today, this week, this month, 1 to 6 months ago, or more than six months ago.", ask: "noticed_window", confirm: false },
      audio: null,
    });
  });
});
