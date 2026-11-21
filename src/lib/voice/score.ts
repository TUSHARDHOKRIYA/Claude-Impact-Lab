import {
  VOICE_SLOTS,
  type DescriptionCheck,
  type ExpectedSlots,
  type VoiceFixture,
  type VoiceSlot,
} from "./slots";
import { validateToolCall, type NormalizedCall, type RawToolCall } from "./validate";

export type SlotVerdict =
  /** Emitted and right. */
  | "correct"
  /** Correctly stayed silent on a slot the transcript never stated. */
  | "correct_abstain"
  /** Emitted and wrong. */
  | "wrong"
  /** The transcript stated it and the model never emitted it. */
  | "missed"
  /** Invented a slot the transcript never stated. Counts as wrong. */
  | "hallucinated"
  /** Fixture declines to grade this slot. */
  | "not_scored";

export type SlotResult = {
  slot: VoiceSlot;
  verdict: SlotVerdict;
  expected: string;
  got: string | null;
};

export type FixtureScore = {
  fixtureId: string;
  slots: SlotResult[];
  correct: number;
  wrong: number;
  missed: number;
  toolCalls: number;
  validCalls: number;
  invalidCalls: { name: string; reason: string }[];
};

export function checkDescription(check: DescriptionCheck, text: string): boolean {
  const lower = text.toLowerCase();
  const hasEvery = check.mustMention.every((group) =>
    group.some((word) => lower.includes(word.toLowerCase())),
  );
  if (!hasEvery) return false;
  return !check.mustNotMention.some((word) => lower.includes(word.toLowerCase()));
}

function show(value: NormalizedCall["value"] | null): string | null {
  if (value === null) return null;
  return Array.isArray(value) ? value.join("+") : value;
}

/**
 * Later calls win. That mirrors the real app: each tool call is one React state
 * setter, so a model that corrects itself ends up with its last answer.
 */
function lastWins(calls: NormalizedCall[]): Map<VoiceSlot, NormalizedCall["value"]> {
  const map = new Map<VoiceSlot, NormalizedCall["value"]>();
  for (const call of calls) map.set(call.slot, call.value);
  return map;
}

type Graded = { verdict: SlotVerdict; expected: string };

function gradeSlot(
  slot: VoiceSlot,
  expected: ExpectedSlots,
  got: NormalizedCall["value"] | undefined,
): Graded {
  const present = got !== undefined;
  if (slot === "description") {
    const check = expected.description;
    if (check === null) return { verdict: "not_scored", expected: "(not scored)" };
    if (!present) return { verdict: "missed", expected: "an English translation" };
    const label = check.mustMention.map((group) => group[0]).join(" + ");
    const ok = typeof got === "string" && checkDescription(check, got);
    return { verdict: ok ? "correct" : "wrong", expected: `mentions ${label}` };
  }

  if (slot === "issue_type") {
    const allowed = Array.isArray(expected.issue_type) ? expected.issue_type : [expected.issue_type];
    const label = allowed.join(" or ");
    if (!present) return { verdict: "missed", expected: label };
    const matches = typeof got === "string" && (allowed as string[]).includes(got);
    return { verdict: matches ? "correct" : "wrong", expected: label };
  }

  const want =
    slot === "noticed_window"
      ? expected.noticed_window
      : slot === "recurs"
        ? expected.recurs
        : expected.pin;

  if (want === null || want === undefined) {
    return { verdict: present ? "hallucinated" : "correct_abstain", expected: "(no call)" };
  }
  if (!present) return { verdict: "missed", expected: want };
  return { verdict: got === want ? "correct" : "wrong", expected: want };
}

export function scoreFixture(
  fixture: VoiceFixture,
  rawCalls: RawToolCall[],
  _now = new Date(),
): FixtureScore {
  const valid: NormalizedCall[] = [];
  const invalidCalls: { name: string; reason: string }[] = [];
  for (const raw of rawCalls) {
    const verdict = validateToolCall(raw);
    if (verdict.ok) valid.push(verdict.call);
    else invalidCalls.push({ name: verdict.name, reason: verdict.reason });
  }

  const emitted = lastWins(valid);
  const slots: SlotResult[] = VOICE_SLOTS.map((slot) => {
    const got = emitted.get(slot);
    const graded = gradeSlot(slot, fixture.expected, got);
    return { slot, verdict: graded.verdict, expected: graded.expected, got: show(got ?? null) };
  });

  const count = (...verdicts: SlotVerdict[]): number =>
    slots.filter((row) => verdicts.includes(row.verdict)).length;

  return {
    fixtureId: fixture.id,
    slots,
    correct: count("correct", "correct_abstain"),
    wrong: count("wrong", "hallucinated"),
    missed: count("missed"),
    toolCalls: rawCalls.length,
    validCalls: valid.length,
    invalidCalls,
  };
}
