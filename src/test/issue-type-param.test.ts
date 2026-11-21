import { describe, expect, it } from "vitest";
import { HOME_ISSUE_TYPES, parseIssueType } from "@/lib/issue-type-param";
import { ISSUE_TYPES } from "@/lib/types";

describe("parseIssueType", () => {
  it("accepts every IssueType, including home deep-link values", () => {
    for (const type of ISSUE_TYPES) {
      expect(parseIssueType(type)).toBe(type);
    }
    expect(HOME_ISSUE_TYPES).toEqual([
      "footpath",
      "lighting",
      "road",
      "drainage",
      "waste",
      "other",
    ]);
    expect(parseIssueType("footpath")).toBe("footpath");
    expect(parseIssueType("parking_and_vehicle_occupation")).toBe(
      "parking_and_vehicle_occupation",
    );
  });

  it("ignores missing, blank, and unknown values", () => {
    expect(parseIssueType(undefined)).toBeUndefined();
    expect(parseIssueType("")).toBeUndefined();
    expect(parseIssueType("not-an-issue")).toBeUndefined();
    expect(parseIssueType("FOOTPATH")).toBeUndefined();
    expect(parseIssueType("bmc")).toBeUndefined();
  });

  it("uses the first value when Next repeats the query param", () => {
    expect(parseIssueType(["lighting", "road"])).toBe("lighting");
    expect(parseIssueType(["nope", "footpath"])).toBeUndefined();
    expect(parseIssueType([])).toBeUndefined();
  });
});
