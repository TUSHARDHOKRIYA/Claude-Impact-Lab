import { kolkataTodayStamp } from "@/lib/noticed-date";
import type { VoiceFixture } from "./slots";
import type { RawToolCall } from "./validate";

/**
 * The tool calls a perfect model would emit for a fixture. Used by the offline
 * self-check and by the test suite: if the scorer does not grade these as a
 * flawless run, the scorer is broken and no live number it produces is worth
 * reading.
 */
export function groundTruthCalls(fixture: VoiceFixture, _now = new Date()): RawToolCall[] {
  const { expected } = fixture;
  const calls: RawToolCall[] = [];
  const push = (name: string, args: Record<string, unknown>): void => {
    calls.push({ name, argumentsJson: JSON.stringify(args) });
  };

  const issueType = Array.isArray(expected.issue_type) ? expected.issue_type[0] : expected.issue_type;
  push("save_issue_type", { issue_type: issueType });

  if (expected.noticed_window) {
    push("save_noticed_window", { noticed_window: expected.noticed_window });
  }
  if (expected.recurs) push("save_recurs", { recurs: expected.recurs });
  if (expected.affects.length > 0) push("save_affects", { affects: expected.affects });
  if (expected.description) {
    const words = expected.description.mustMention.map((group) => group[0]);
    push("save_description", { description: `The ${words.join(" and the ")} were reported.` });
  }
  if (expected.pin) push("propose_pin", { landmark_id: expected.pin });
  return calls;
}

/**
 * A model that answers in prose and never calls a tool. This is the exact
 * failure mode the bake-off exists to detect, so the harness must be able to
 * recognise it offline.
 */
export function silentModelCalls(): RawToolCall[] {
  return [];
}

/** A model that calls tools but fills them with plausible rubbish. */
export function sloppyModelCalls(fixture: VoiceFixture, now = new Date()): RawToolCall[] {
  const todayStamp = kolkataTodayStamp(now);
  return [
    { name: "save_issue_type", argumentsJson: JSON.stringify({ issue_type: "garbage" }) },
    { name: "save_noticed_window", argumentsJson: JSON.stringify({ noticed_window: "do din pehle" }) },
    { name: "save_recurs", argumentsJson: JSON.stringify({ recurs: true }) },
    { name: "save_affects", argumentsJson: JSON.stringify({ affects: ["night safety"] }) },
    { name: "submit_report", argumentsJson: "{}" },
    {
      name: "save_description",
      argumentsJson: JSON.stringify({ description: `The photo shows a problem on ${todayStamp}.` }),
    },
    { name: "propose_pin", argumentsJson: JSON.stringify({ landmark_id: fixture.id }) },
  ];
}
