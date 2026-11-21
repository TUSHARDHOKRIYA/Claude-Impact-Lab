import { describe, expect, it } from "vitest";
import { VOICE_FIXTURES } from "@/lib/voice/fixtures";
import { checkDescription, scoreFixture } from "@/lib/voice/score";
import { groundTruthCalls, sloppyModelCalls } from "@/lib/voice/self-check";
import type { VoiceFixture } from "@/lib/voice/slots";
import { validateToolCall, type RawToolCall } from "@/lib/voice/validate";

const NOW = new Date("2026-09-15T06:00:00.000Z");

function fixtureById(id: string): VoiceFixture {
  const found = VOICE_FIXTURES.find((fixture) => fixture.id === id);
  if (!found) throw new Error(`no fixture ${id}`);
  return found;
}

function call(name: string, args: Record<string, unknown>): RawToolCall {
  return { name, argumentsJson: JSON.stringify(args) };
}

describe("tool call validation", () => {
  it("accepts the calls the app accepts", () => {
    expect(validateToolCall(call("save_issue_type", { issue_type: "pothole" })).ok).toBe(true);
    expect(validateToolCall(call("save_noticed_window", { noticed_window: "today" })).ok).toBe(true);
    expect(validateToolCall(call("save_recurs", { recurs: "false" })).ok).toBe(true);
    expect(validateToolCall(call("save_description", { description: "" })).ok).toBe(true);
    expect(validateToolCall(call("propose_pin", { landmark_id: "loc-hindmata" })).ok).toBe(true);
    expect(validateToolCall(call("propose_pin", { landmark_id: "loc-sion" })).ok).toBe(true);
  });

  it("rejects exactly what the form and server action reject", () => {
    const reasons = [
      call("save_issue_type", { issue_type: "garbage" }),
      call("save_noticed_window", { noticed_window: "do din pehle" }),
      call("save_noticed_window", { noticed_window: "2027-01-01" }),
      call("save_noticed_window", { noticed_window: "next_year" }),
      call("save_recurs", { recurs: true }),
      // Not a known locality id: a pin may never land there.
      call("propose_pin", { landmark_id: "non-existent-locality" }),
      call("save_issue_type", {}),
      { name: "submit", argumentsJson: "{}" },
      { name: "save_issue_type", argumentsJson: "not json" },
    ].map((raw) => validateToolCall(raw));
    expect(reasons.every((verdict) => !verdict.ok)).toBe(true);
    const submit = validateToolCall({ name: "submit", argumentsJson: "{}" });
    expect(submit.ok).toBe(false);
    if (!submit.ok) expect(submit.reason).toContain("no such tool");
  });

  it("treats an empty argument string as an empty object, not a crash", () => {
    const verdict = validateToolCall({ name: "save_issue_type", argumentsJson: "" });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toContain("missing required argument");
  });
});

describe("description checking", () => {
  it("needs one alternative from every group and no forbidden word", () => {
    const check = { mustMention: [["pothole", "hole"], ["road"]], mustNotMention: ["photo"] };
    expect(checkDescription(check, "A large HOLE in the Road.")).toBe(true);
    expect(checkDescription(check, "A pothole.")).toBe(false);
    expect(checkDescription(check, "The photo shows a pothole in the road.")).toBe(false);
  });
});

describe("scoring against ground truth", () => {
  it("grades a perfect model as perfect on every fixture", () => {
    for (const fixture of VOICE_FIXTURES) {
      const score = scoreFixture(fixture, groundTruthCalls(fixture));
      expect(score.invalidCalls, `${fixture.id}: ${JSON.stringify(score.invalidCalls)}`).toEqual([]);
      expect(score.wrong, `${fixture.id}`).toBe(0);
      expect(score.missed, `${fixture.id}`).toBe(0);
      expect(score.correct).toBe(5);
    }
  });

  it("grades a silent model as all-missed, which is the finding this exists for", () => {
    const fixture = fixtureById("pothole-do-din");
    const score = scoreFixture(fixture, []);
    expect(score.toolCalls).toBe(0);
    expect(score.missed).toBe(4);
    expect(score.correct).toBe(1); // the pin: no landmark named, so silence is right
    expect(score.wrong).toBe(0);
  });

  it("catches a sloppy model: bad enums, relative dates and an invented submit tool", () => {
    const fixture = fixtureById("pothole-do-din");
    const score = scoreFixture(fixture, sloppyModelCalls(fixture));
    expect(score.invalidCalls.length).toBeGreaterThanOrEqual(4);
    expect(score.invalidCalls.map((entry) => entry.name)).toContain("submit_report");
    expect(score.wrong).toBeGreaterThan(0);
  });

  it("counts a filled slot the transcript never stated as hallucinated, not correct", () => {
    const fixture = fixtureById("manhole-school");
    const calls = [
      ...groundTruthCalls(fixture),
      call("save_recurs", { recurs: "true" }),
    ];
    const score = scoreFixture(fixture, calls);
    const verdicts = Object.fromEntries(score.slots.map((slot) => [slot.slot, slot.verdict]));
    expect(verdicts.recurs).toBe("hallucinated");
    expect(score.wrong).toBe(1);
  });

  it("marks duration read as recurrence wrong, not correct", () => {
    const fixture = fixtureById("pothole-do-din");
    const score = scoreFixture(fixture, [call("save_recurs", { recurs: "true" })]);
    const recurs = score.slots.find((slot) => slot.slot === "recurs");
    expect(recurs?.verdict).toBe("wrong");
    expect(recurs?.expected).toBe("false");
  });

  it("accepts either category where the two genuinely overlap", () => {
    const fixture: VoiceFixture = {
      id: "mock-overlap",
      probes: "overlap",
      transcript: "Road problem",
      expected: {
        issue_type: ["pothole", "road_cave_in"],
        noticed_window: null,
        recurs: null,
        description: null,
        pin: null,
      },
    };
    for (const value of ["pothole", "road_cave_in"]) {
      const score = scoreFixture(fixture, [call("save_issue_type", { issue_type: value })]);
      expect(score.slots.find((slot) => slot.slot === "issue_type")?.verdict).toBe("correct");
    }
    const wrong = scoreFixture(fixture, [call("save_issue_type", { issue_type: "open_manhole" })]);
    expect(wrong.slots.find((slot) => slot.slot === "issue_type")?.verdict).toBe("wrong");
  });

  it("lets a later call overwrite an earlier one, as the React setter would", () => {
    const fixture = fixtureById("pothole-do-din");
    const score = scoreFixture(
      fixture,
      [
        call("save_issue_type", { issue_type: "waterlogging" }),
        call("save_issue_type", { issue_type: "pothole" }),
      ],
      NOW,
    );
    expect(score.slots.find((slot) => slot.slot === "issue_type")?.verdict).toBe("correct");
  });

  it("grades the noticed window the same way on any run date", () => {
    const fixture = fixtureById("pothole-do-din");
    const later = new Date("2027-01-10T06:00:00.000Z");
    const score = scoreFixture(fixture, groundTruthCalls(fixture, later), later);
    expect(score.slots.find((slot) => slot.slot === "noticed_window")?.expected).toBe("this_week");
    expect(score.wrong).toBe(0);
  });
});
