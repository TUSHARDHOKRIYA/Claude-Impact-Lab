import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import { scoreFixture, type FixtureScore } from "./score";
import type { VoiceFixture } from "./slots";
import type { ModelTarget } from "./targets";
import { VOICE_TOOLS } from "./tools";
import { validateToolCall, type RawToolCall } from "./validate";
import { ChatHttpError, chatCompletion, type ChatMessage, type FetchLike } from "./chat";

/**
 * Five tools means five calls if a model emits one per turn. The default must
 * exceed that, or a correct-but-slow model is scored as having missed slots.
 */
export const DEFAULT_MAX_TURNS = 8;

export type FixtureRun = {
  targetId: string;
  model: string;
  fixtureId: string;
  ok: boolean;
  error: string | null;
  turns: number;
  latencyMs: number;
  turnLatencies: number[];
  toolCalls: RawToolCall[];
  assistantText: string[];
  score: FixtureScore | null;
};

export type RunOptions = {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  /** A model that emits one call per turn must not be scored as if it emitted none. */
  maxTurns?: number;
  now?: Date;
};

function toolReply(raw: RawToolCall): string {
  const verdict = validateToolCall(raw);
  return verdict.ok
    ? JSON.stringify({ status: "saved", slot: verdict.call.slot })
    : JSON.stringify({ status: "rejected", reason: verdict.reason });
}

/**
 * One fixture against one model. Runs a bounded tool loop rather than a single
 * shot, because a model that emits one tool call per turn is filling the form
 * correctly, just slowly, and a single-shot harness would score that as zero.
 *
 * Every tool result is a stub. Nothing here touches the form, the server action,
 * or the database — this is a measurement harness, not the voice layer.
 */
export async function runFixture(
  target: ModelTarget,
  fixture: VoiceFixture,
  options: RunOptions = {},
): Promise<FixtureRun> {
  const now = options.now ?? new Date();
  // Five tools exist, so a model that emits one call per turn needs five turns to
  // fill every slot. A lower default cuts it off mid-form and scores the unsent
  // slots as missed, which understates exactly the behaviour this loop exists to
  // measure. Eight leaves headroom for a closing turn.
  const maxTurns = options.maxTurns ?? DEFAULT_MAX_TURNS;
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: buildUserPrompt(fixture.transcript) },
  ];
  const collected: RawToolCall[] = [];
  const assistantText: string[] = [];
  const turnLatencies: number[] = [];

  const base = { targetId: target.id, model: target.model, fixtureId: fixture.id };

  for (let turn = 0; turn < maxTurns; turn += 1) {
    let result;
    try {
      result = await chatCompletion(target, messages, VOICE_TOOLS, {
        fetchImpl: options.fetchImpl,
        timeoutMs: options.timeoutMs,
      });
    } catch (error) {
      const latencyMs =
        error instanceof ChatHttpError
          ? turnLatencies.reduce((a, b) => a + b, 0) + error.latencyMs
          : turnLatencies.reduce((a, b) => a + b, 0);
      return {
        ...base,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        turns: turn + 1,
        latencyMs,
        turnLatencies,
        toolCalls: collected,
        assistantText,
        score: null,
      };
    }

    turnLatencies.push(result.latencyMs);
    if (result.content) assistantText.push(result.content);
    if (result.toolCalls.length === 0) break;

    const raws = result.toolCalls.map((call) => ({
      name: call.function.name,
      argumentsJson: call.function.arguments,
    }));
    collected.push(...raws);

    messages.push({ role: "assistant", content: result.content, tool_calls: result.toolCalls });
    for (const call of result.toolCalls) {
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: toolReply({ name: call.function.name, argumentsJson: call.function.arguments }),
      });
    }
  }

  return {
    ...base,
    ok: true,
    error: null,
    turns: turnLatencies.length,
    latencyMs: turnLatencies.reduce((a, b) => a + b, 0),
    turnLatencies,
    toolCalls: collected,
    assistantText,
    score: scoreFixture(fixture, collected, now),
  };
}

export type TargetSummary = {
  targetId: string;
  model: string;
  fixtures: number;
  errors: number;
  fixturesWithAnyToolCall: number;
  toolCalls: number;
  invalidCalls: number;
  correct: number;
  wrong: number;
  missed: number;
  medianLatencyMs: number;
};

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function summarize(targetId: string, model: string, runs: FixtureRun[]): TargetSummary {
  const scored = runs.filter((run) => run.score !== null);
  const add = (pick: (score: NonNullable<FixtureRun["score"]>) => number): number =>
    scored.reduce((total, run) => total + pick(run.score as FixtureScore), 0);
  return {
    targetId,
    model,
    fixtures: runs.length,
    errors: runs.filter((run) => !run.ok).length,
    fixturesWithAnyToolCall: runs.filter((run) => run.toolCalls.length > 0).length,
    toolCalls: runs.reduce((total, run) => total + run.toolCalls.length, 0),
    invalidCalls: add((score) => score.invalidCalls.length),
    correct: add((score) => score.correct),
    wrong: add((score) => score.wrong),
    missed: add((score) => score.missed),
    medianLatencyMs: median(runs.filter((run) => run.ok).map((run) => run.latencyMs)),
  };
}
