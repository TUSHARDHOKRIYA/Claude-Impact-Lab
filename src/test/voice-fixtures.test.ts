import { describe, expect, it } from "vitest";
import { LANDMARKS } from "@/lib/city";
import { PINNABLE_LANDMARKS } from "@/lib/landmarks";
import { isNoticedDate, kolkataTodayStamp } from "@/lib/noticed-date";
import { ISSUE_TYPES } from "@/lib/types";
import { VOICE_FIXTURES } from "@/lib/voice/fixtures";
import { buildSystemPrompt } from "@/lib/voice/prompt";
import { resolveExpectedDate, shiftStamp, stampWeekday } from "@/lib/voice/slots";
import { FORBIDDEN_TOOL_NAMES, VOICE_TOOLS, VOICE_TOOL_NAMES } from "@/lib/voice/tools";

/** Voice may pin any in-bounds landmark from the data file, which includes the app's own five. */
const LANDMARK_IDS = PINNABLE_LANDMARKS.map((landmark) => landmark.id);
const NOW = new Date("2026-09-15T06:00:00.000Z"); // 11:30 IST, Tuesday

describe("bake-off fixtures", () => {
  it("has 3 to 7 fixtures with unique ids", () => {
    expect(VOICE_FIXTURES.length).toBeGreaterThanOrEqual(3);
    expect(VOICE_FIXTURES.length).toBeLessThanOrEqual(7);
    const ids = VOICE_FIXTURES.map((fixture) => fixture.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses only real enum values and real landmark ids in ground truth", () => {
    for (const fixture of VOICE_FIXTURES) {
      const types = Array.isArray(fixture.expected.issue_type)
        ? fixture.expected.issue_type
        : [fixture.expected.issue_type];
      for (const type of types) expect(ISSUE_TYPES).toContain(type);
      if (fixture.expected.pin !== null) expect(LANDMARK_IDS).toContain(fixture.expected.pin);
      expect(["true", "false", null]).toContain(fixture.expected.recurs);
      expect(fixture.transcript.trim().length).toBeGreaterThan(40);
      expect(fixture.probes.trim().length).toBeGreaterThan(0);
    }
  });

  it("uses only the five noticed windows in ground truth", () => {
    for (const fixture of VOICE_FIXTURES) {
      const expected = fixture.expected.noticed_window;
      if (expected === null) continue;
      expect(["today", "this_week", "this_month", "one_to_six_months", "over_six_months"]).toContain(expected);
    }
  });

  it("covers key hard cases the brief names", () => {
    const ids = VOICE_FIXTURES.map((fixture) => fixture.id);
    // Relative dates
    expect(VOICE_FIXTURES.some((f) => /do din se/i.test(f.transcript))).toBe(true);
    // A landmark named in Devanagari.
    const devanagari = VOICE_FIXTURES.find((f) => /[ऀ-ॿ]/.test(f.transcript));
    expect(devanagari?.expected.pin).toBeTruthy();
    // A hallucination probe: at least one slot that must NOT be filled.
    expect(
      VOICE_FIXTURES.some((f) => f.expected.noticed_window === null || f.expected.recurs === null),
    ).toBe(true);
    expect(ids.length).toBe(new Set(ids).size);
  });
});

describe("tool schemas", () => {
  it("has exactly the five tools and no submit tool", () => {
    expect(VOICE_TOOL_NAMES).toHaveLength(5);
    expect(VOICE_TOOLS).toHaveLength(5);
    const names = VOICE_TOOLS.map((tool) => tool.function.name);
    expect(names).toEqual([...VOICE_TOOL_NAMES]);
    for (const forbidden of FORBIDDEN_TOOL_NAMES) expect(names).not.toContain(forbidden);
    const json = JSON.stringify(VOICE_TOOLS);
    for (const forbidden of FORBIDDEN_TOOL_NAMES) {
      expect(json).not.toContain(`"name":"${forbidden}"`);
    }
  });

  it("carries the app's exact enums, so a valid call cannot be rejected downstream", () => {
    const byName = new Map(VOICE_TOOLS.map((tool) => [tool.function.name, tool]));
    const issue = byName.get("save_issue_type")?.function.parameters.properties.issue_type;
    expect((issue as { enum: string[] }).enum).toEqual([...ISSUE_TYPES]);
    const pin = byName.get("propose_pin")?.function.parameters.properties.landmark_id;
    expect((pin as { enum: string[] }).enum).toEqual(LANDMARK_IDS);
    expect(LANDMARK_IDS).toEqual(expect.arrayContaining(LANDMARKS.map((landmark) => landmark.id)));
    const windowTool = byName.get("save_noticed_window")?.function.parameters;
    expect((windowTool as { required: string[] }).required).toEqual(["noticed_window"]);
    const windowEnum = windowTool?.properties.noticed_window as { enum: string[] };
    expect(windowEnum.enum).toEqual([
      "today",
      "this_week",
      "this_month",
      "one_to_six_months",
      "over_six_months",
    ]);
  });
});

describe("date anchoring", () => {
  it("tells the model how speech maps onto the five noticed windows", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("aaj");
    expect(prompt).toContain("this_week");
    expect(prompt).toContain("pichhle hafte");
    expect(prompt).toContain("over_six_months");
    expect(prompt).toContain("hindmata");
    // Every landmark a fixture pins to must be nameable from the prompt.
    for (const fixture of VOICE_FIXTURES) {
      if (fixture.expected.pin) expect(prompt).toContain(fixture.expected.pin);
    }
  });

  it("resolves a weekday backwards, never to today and never forwards", () => {
    const today = "2026-09-15"; // a Tuesday
    expect(stampWeekday(today)).toBe(2);
    expect(resolveExpectedDate({ kind: "last_weekday", weekday: 2 }, today)).toBe("2026-09-08");
    expect(resolveExpectedDate({ kind: "last_weekday", weekday: 3 }, today)).toBe("2026-09-09");
    expect(resolveExpectedDate({ kind: "days_ago", days: 2 }, today)).toBe("2026-09-13");
    expect(shiftStamp("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftStamp("2024-03-01", -1)).toBe("2024-02-29");
  });
});
