import { describe, expect, it } from "vitest";

describe("vitest harness", () => {
  it("resolves the @ alias", async () => {
    const { ISSUE_TYPES } = await import("@/lib/types");
    expect(ISSUE_TYPES).toContain("pothole");
  });
});
