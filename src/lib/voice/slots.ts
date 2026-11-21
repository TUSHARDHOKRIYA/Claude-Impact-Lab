import type { IssueType, NoticedWindow } from "@/lib/types";

/**
 * The four form slots plus the pin proposal. These names are the scoring keys,
 * not tool names. Tool names live in `./tools`.
 */
export const VOICE_SLOTS = [
  "issue_type",
  "noticed_window",
  "recurs",
  "description",
  "pin",
] as const;

export type VoiceSlot = (typeof VOICE_SLOTS)[number];

/**
 * Ground truth for a date cannot be a literal stamp: a fixture saying "do din se"
 * means two days before whatever today is when the bake-off runs. It is stored
 * relative and resolved against the injected Asia/Kolkata today stamp.
 */
export type ExpectedDate =
  | { kind: "days_ago"; days: number }
  | { kind: "last_weekday"; weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6 };

/**
 * Exact-matching a free-text description is meaningless. Each group in
 * `mustMention` is a set of alternatives; at least one member of every group
 * must appear (case-insensitively) for the slot to score correct.
 */
export type DescriptionCheck = {
  mustMention: string[][];
  mustNotMention: string[];
};

export type ExpectedSlots = {
  /** An array means any listed value is acceptable (overlapping categories). */
  issue_type: IssueType | IssueType[];
  /** null means the transcript gives no time and the tool must NOT be called. */
  noticed_window: NoticedWindow | null;
  /** null means recurrence was never stated and the tool must NOT be called. */
  recurs: "true" | "false" | null;
  /** null means the description is not scored for this fixture. */
  description: DescriptionCheck | null;
  /** A landmark id, or null when no landmark was named and no pin may be proposed. */
  pin: string | null;
};

export type VoiceFixture = {
  id: string;
  /** Which known-hard case this fixture exists to probe. */
  probes: string;
  /** Scripted transcript. Not audio: STT is deliberately out of this comparison. */
  transcript: string;
  expected: ExpectedSlots;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Shift a YYYY-MM-DD stamp by whole days. Noon UTC anchoring avoids DST/edge drift. */
export function shiftStamp(stamp: string, deltaDays: number): string {
  const year = Number(stamp.slice(0, 4));
  const month = Number(stamp.slice(5, 7));
  const day = Number(stamp.slice(8, 10));
  const moved = new Date(Date.UTC(year, month - 1, day, 12) + deltaDays * 86_400_000);
  return [
    moved.getUTCFullYear(),
    pad(moved.getUTCMonth() + 1),
    pad(moved.getUTCDate()),
  ].join("-");
}

/** Day of week for a stamp, 0 = Sunday. */
export function stampWeekday(stamp: string): number {
  const year = Number(stamp.slice(0, 4));
  const month = Number(stamp.slice(5, 7));
  const day = Number(stamp.slice(8, 10));
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

/**
 * Resolve relative ground truth against today. Weekday names always resolve
 * backwards — "pichhle Mangalvaar" on a Tuesday is the Tuesday a week ago,
 * never today and never forward. The contract states this rule and the
 * fixtures are scored by it.
 */
export function resolveExpectedDate(expected: ExpectedDate, todayStamp: string): string {
  if (expected.kind === "days_ago") return shiftStamp(todayStamp, -expected.days);
  const today = stampWeekday(todayStamp);
  const back = (today - expected.weekday + 7) % 7 || 7;
  return shiftStamp(todayStamp, -back);
}
