import { describe, expect, it } from "vitest";
import { HOME_ISSUE_TYPES, parseIssueType } from "@/lib/issue-type-param";
import { ISSUE_TYPES } from "@/lib/types";

describe("parseIssueType", () => {
  it("accepts every IssueType, including home deep-link values", () => {
    for (const type of ISSUE_TYPES) {
      expect(parseIssueType(type)).toBe(type);
    }
    expect(HOME_ISSUE_TYPES).toEqual([
      "pothole",
      "waterlogging",
      "open_manhole",
      "road_cave_in",
    ]);
    expect(parseIssueType("pothole")).toBe("pothole");
    expect(parseIssueType("broken_paver_blocks")).toBe("broken_paver_blocks");
  });

  it("ignores missing, blank, and unknown values", () => {
    expect(parseIssueType(undefined)).toBeUndefined();
    expect(parseIssueType("")).toBeUndefined();
    expect(parseIssueType("not-an-issue")).toBeUndefined();
    expect(parseIssueType("POTHOLE")).toBeUndefined();
    expect(parseIssueType("bmc")).toBeUndefined();
  });

  it("uses the first value when Next repeats the query param", () => {
    expect(parseIssueType(["open_manhole", "pothole"])).toBe("open_manhole");
    expect(parseIssueType(["nope", "pothole"])).toBeUndefined();
    expect(parseIssueType([])).toBeUndefined();
  });
});
