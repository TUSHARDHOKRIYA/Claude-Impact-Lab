import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chatHeaders, chatUrl, type FetchLike } from "@/lib/voice/chat";
import { VOICE_FIXTURES } from "@/lib/voice/fixtures";
import { DEFAULT_MAX_TURNS, median, runFixture, summarize } from "@/lib/voice/run";
import { groundTruthCalls } from "@/lib/voice/self-check";
import { resolveAppTarget, resolveTargets, type ModelTarget } from "@/lib/voice/targets";
import { renderReport, renderSummaryTable } from "@/lib/voice/table";
import type { RawToolCall } from "@/lib/voice/validate";

const NOW = new Date("2026-09-15T06:00:00.000Z");
const FIXTURE = VOICE_FIXTURES[0];

const SARVAM: ModelTarget = {
  id: "sarvam",
  baseURL: "https://api.sarvam.ai/v1",
  model: "sarvam-105b-conversations",
  apiKey: "sk-test",
  subscriptionHeader: true,
};

function toolCallBody(calls: RawToolCall[]): string {
  return JSON.stringify({
    choices: [
      {
        finish_reason: calls.length > 0 ? "tool_calls" : "stop",
        message: {
          content: calls.length > 0 ? null : "Thik hai.",
          tool_calls: calls.map((call, index) => ({
            id: `call_${index}`,
            type: "function",
            function: { name: call.name, arguments: call.argumentsJson },
          })),
        },
      },
    ],
  });
}

function stubFetch(bodies: string[], seen: RequestInit[] = []): FetchLike {
  let turn = 0;
  return async (_url, init) => {
    seen.push(init);
    const body = bodies[Math.min(turn, bodies.length - 1)];
    turn += 1;
    return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
  };
}

describe("provider wiring", () => {
  it("sends Sarvam both the bearer and api-subscription-key, and others only the bearer", () => {
    const sarvam = chatHeaders(SARVAM);
    expect(sarvam.authorization).toBe("Bearer sk-test");
    expect(sarvam["api-subscription-key"]).toBe("sk-test");
    const openai = chatHeaders({ ...SARVAM, id: "openai", subscriptionHeader: false });
    expect(openai.authorization).toBe("Bearer sk-test");
    expect(openai["api-subscription-key"]).toBeUndefined();
  });

  it("builds the OpenAI-compatible path without doubling slashes", () => {
    expect(chatUrl("https://api.sarvam.ai/v1")).toBe("https://api.sarvam.ai/v1/chat/completions");
    expect(chatUrl("https://api.sarvam.ai/v1/")).toBe("https://api.sarvam.ai/v1/chat/completions");
  });

  it("includes only providers whose key is present", () => {
    expect(resolveTargets({})).toEqual([]);
    const one = resolveTargets({ SARVAM_API_KEY: "a" });
    expect(one.map((target) => target.id)).toEqual(["sarvam"]);
    expect(one[0].subscriptionHeader).toBe(true);
    expect(one[0].model).toBe("sarvam-105b-conversations");
    const all = resolveTargets({
      SARVAM_API_KEY: "a",
      OPENAI_API_KEY: "b",
      GEMINI_API_KEY: "c",
      CEREBRAS_API_KEY: "d",
    });
    expect(all.map((target) => target.id)).toEqual(["sarvam", "openai", "gemini", "cerebras"]);
    expect(all[1].subscriptionHeader).toBe(false);
    expect(all[3]).toMatchObject({
      id: "cerebras",
      baseURL: "https://api.cerebras.ai/v1",
      model: "qwen-3.8-27b",
      subscriptionHeader: false,
    });
    const filtered = resolveTargets({ SARVAM_API_KEY: "a", OPENAI_API_KEY: "b" }, ["openai"]);
    expect(filtered.map((target) => target.id)).toEqual(["openai"]);
    const overridden = resolveTargets({ SARVAM_API_KEY: "a", SARVAM_MODEL: "sarvam-m" });
    expect(overridden[0].model).toBe("sarvam-m");
    expect(
      resolveTargets({ CEREBRAS_API_KEY: "d", CEREBRAS_MODEL: "llama-3.3-70b" })[0].model,
    ).toBe("llama-3.3-70b");
    expect(resolveTargets({ SARVAM_API_KEY: "   " })).toEqual([]);
  });

  it("reads the app's own VOICE_LLM trio and infers the Sarvam header from the host", () => {
    expect(resolveAppTarget({})).toBeNull();
    expect(
      resolveAppTarget({ VOICE_LLM_BASE_URL: "https://api.sarvam.ai/v1", VOICE_LLM_MODEL: "m" }),
    ).toBeNull();
    const target = resolveAppTarget({
      VOICE_LLM_BASE_URL: "https://api.sarvam.ai/v1",
      VOICE_LLM_MODEL: "sarvam-105b-conversations",
      VOICE_LLM_KEY_NAME: "SARVAM_API_KEY",
      SARVAM_API_KEY: "k",
    });
    expect(target?.subscriptionHeader).toBe(true);
    const openai = resolveAppTarget({
      VOICE_LLM_BASE_URL: "https://api.openai.com/v1",
      VOICE_LLM_MODEL: "gpt-5.6-luna",
      VOICE_LLM_KEY_NAME: "OPENAI_API_KEY",
      OPENAI_API_KEY: "k",
    });
    expect(openai?.subscriptionHeader).toBe(false);
    const cerebras = resolveAppTarget({
      VOICE_LLM_BASE_URL: "https://api.cerebras.ai/v1",
      VOICE_LLM_MODEL: "qwen-3.8-27b",
      VOICE_LLM_KEY_NAME: "CEREBRAS_API_KEY",
      CEREBRAS_API_KEY: "k",
    });
    expect(cerebras).toMatchObject({
      id: "voice_llm",
      baseURL: "https://api.cerebras.ai/v1",
      model: "qwen-3.8-27b",
      subscriptionHeader: false,
    });
  });
});

describe("the fixture run loop", () => {
  it("scores a model that emits every tool call in one turn", async () => {
    const seen: RequestInit[] = [];
    const run = await runFixture(SARVAM, FIXTURE, {
      fetchImpl: stubFetch([toolCallBody(groundTruthCalls(FIXTURE, NOW)), toolCallBody([])], seen),
      now: NOW,
    });
    expect(run.ok).toBe(true);
    expect(run.score?.wrong).toBe(0);
    expect(run.score?.missed).toBe(0);
    const body = JSON.parse(String(seen[0].body)) as { tools: unknown[]; tool_choice: string };
    expect(body.tools).toHaveLength(6);
    expect(body.tool_choice).toBe("auto");
  });


  it("does not truncate a model that emits exactly one tool call per turn", async () => {
    // The regression Greptile caught: the old default of 3 turns cut a
    // one-call-per-turn model off after its third call, then scored the slots it
    // never got to send as missed. That is the opposite of what this loop is for.
    const truth = groundTruthCalls(FIXTURE, NOW);
    expect(truth.length).toBeGreaterThan(3);
    expect(DEFAULT_MAX_TURNS).toBeGreaterThanOrEqual(truth.length);

    const bodies = [...truth.map((call) => toolCallBody([call])), toolCallBody([])];
    const run = await runFixture(SARVAM, FIXTURE, {
      now: NOW,
      fetchImpl: stubFetch(bodies),
    });

    expect(run.score?.missed).toBe(0);
    expect(run.score?.wrong).toBe(0);
    // correct counts slots, not calls: a slot this fixture leaves unanswered
    // scores correct by abstention, so it can exceed the number of calls sent.
    expect(run.score?.correct).toBeGreaterThanOrEqual(truth.length);
    // The load-bearing part: more turns were needed than the old default allowed.
    expect(run.turns).toBeGreaterThan(3);
  });

  it("does not score a one-call-per-turn model as if it emitted none", async () => {
    const calls = groundTruthCalls(FIXTURE, NOW);
    const run = await runFixture(SARVAM, FIXTURE, {
      fetchImpl: stubFetch([
        toolCallBody(calls.slice(0, 1)),
        toolCallBody(calls.slice(1)),
        toolCallBody([]),
      ]),
      maxTurns: 3,
      now: NOW,
    });
    expect(run.turns).toBe(3);
    expect(run.toolCalls).toHaveLength(calls.length);
    expect(run.score?.missed).toBe(0);
  });

  it("records a prose-only reply as zero tool calls rather than failing", async () => {
    const run = await runFixture(SARVAM, FIXTURE, {
      fetchImpl: stubFetch([toolCallBody([])]),
      now: NOW,
    });
    expect(run.ok).toBe(true);
    expect(run.toolCalls).toEqual([]);
    expect(run.assistantText).toEqual(["Thik hai."]);
    expect(run.score?.missed).toBe(5);
  });

  it("captures an HTTP failure as an error row instead of throwing", async () => {
    const run = await runFixture(SARVAM, FIXTURE, {
      fetchImpl: async () => new Response('{"error":"tools not supported"}', { status: 400 }),
      now: NOW,
    });
    expect(run.ok).toBe(false);
    expect(run.error).toContain("HTTP 400");
    expect(run.score).toBeNull();
  });

  it("reads the deprecated single function_call shape as one tool call", async () => {
    const body = JSON.stringify({
      choices: [
        {
          message: {
            content: null,
            function_call: { name: "save_issue_type", arguments: '{"issue_type":"road"}' },
          },
        },
      ],
    });
    const run = await runFixture(SARVAM, FIXTURE, {
      fetchImpl: stubFetch([body, toolCallBody([])]),
      now: NOW,
    });
    expect(run.toolCalls).toHaveLength(1);
  });
});

describe("the comparison table", () => {
  it("names a zero-tool-call model as the headline, not a footnote", async () => {
    const run = await runFixture(SARVAM, FIXTURE, {
      fetchImpl: stubFetch([toolCallBody([])]),
      now: NOW,
    });
    const summary = summarize("sarvam", SARVAM.model, [run]);
    expect(summary.fixturesWithAnyToolCall).toBe(0);
    const report = renderReport([summary], [{ targetId: "sarvam", runs: [run] }]);
    expect(report).toContain("CAN IT TOOL-CALL?");
    expect(report).toContain("emitted ZERO tool calls");
    expect(report).toContain("COMPARISON");
    expect(renderSummaryTable([summary])).toContain("median_ms");
  });

  it("takes the median latency of successful runs only", () => {
    expect(median([])).toBe(0);
    expect(median([30, 10, 20])).toBe(20);
    expect(median([10, 20, 30, 40])).toBe(25);
  });
});

it("gives the CLI the runner's max-turn default", () => {
  const source = readFileSync("scripts/bakeoff.ts", "utf8");
  expect(source).toMatch(/turns:\s*DEFAULT_MAX_TURNS/);
  expect(source).not.toMatch(/turns:\s*3\b/);
});
