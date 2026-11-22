import { describe, expect, it } from "vitest";
import { getRoadExplorerStats, listRoadSummaries } from "@/lib/passport/roads";

describe("Road Explorer & Summaries", () => {
  it("returns all 291 roads by default", () => {
    const roads = listRoadSummaries();
    expect(roads.length).toBe(291);

    const first = roads[0];
    expect(first).toBeDefined();
    expect(first.id).toMatch(/^RD\d{4}$/);
    expect(first.name.length).toBeGreaterThan(0);
    expect(first.ward.length).toBeGreaterThanOrEqual(1);
    expect(first.totalBilledInr).toBeGreaterThanOrEqual(0);
    expect(first.reopenRate).toBeGreaterThanOrEqual(0);
    expect(first.reopenRate).toBeLessThanOrEqual(1);
    expect(["held", "under_review", "flagged", "high_risk"]).toContain(first.status);
  });

  it("filters accurately by ward", () => {
    const wardARoads = listRoadSummaries({ ward: "A" });
    expect(wardARoads.length).toBeGreaterThan(0);
    for (const r of wardARoads) {
      expect(r.ward).toBe("A");
    }
  });

  it("filters by audit flags and active DLP", () => {
    const flagged = listRoadSummaries({ hasFlags: true });
    for (const r of flagged) {
      expect(r.flagCount).toBeGreaterThan(0);
      expect(r.status).toBe("flagged");
    }

    const dlpRoads = listRoadSummaries({ underDlp: true });
    for (const r of dlpRoads) {
      expect(r.underDlp).toBe(true);
    }
  });

  it("sorts by billed amount descending by default", () => {
    const sorted = listRoadSummaries({ sortBy: "billed_desc" });
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].totalBilledInr).toBeGreaterThanOrEqual(sorted[i + 1].totalBilledInr);
    }
  });

  it("computes citywide road explorer summary statistics", () => {
    const stats = getRoadExplorerStats();
    expect(stats.totalRoads).toBe(291);
    expect(stats.totalBilledInr).toBeGreaterThan(100_000_000);
    expect(stats.flaggedRoadsCount).toBeGreaterThan(0);
    expect(stats.dlpRoadsCount).toBeGreaterThan(0);
    expect(stats.averageReopenRate).toBeGreaterThan(0);
  });
});
