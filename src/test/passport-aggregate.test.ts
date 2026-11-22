import { describe, expect, it } from "vitest";
import { getRoadPassport } from "@/lib/passport/aggregate";

describe("Road Reliability Passport aggregation", () => {
  it("computes complete passport data for a valid road segment (RD0001)", () => {
    const passport = getRoadPassport("RD0001");
    expect(passport).not.toBeNull();
    if (!passport) return;

    expect(passport.road.id).toBe("RD0001");
    expect(passport.road.name).toBe("Shahid Bhagat Singh Marg");
    expect(passport.road.ward).toBe("A");
    expect(passport.road.surface).toBe("Asphalt");
    expect(passport.road.lanes).toBeGreaterThanOrEqual(1);
    expect(passport.road.lengthM).toBeGreaterThan(0);

    // Summary calculations
    expect(passport.summary.totalBilledInr).toBeGreaterThan(0);
    expect(passport.summary.totalOrders).toBe(3);
    expect(passport.summary.totalBilledInr).toBe(44640);
    expect(passport.summary.heldInr + passport.summary.failedInr + passport.summary.flaggedInr).toBe(
      passport.summary.totalBilledInr,
    );

    // Work orders & breakdown
    expect(passport.workOrders.length).toBe(3);
    expect(passport.methodBreakdown.length).toBeGreaterThan(0);
    expect(passport.contractorBreakdown.length).toBeGreaterThan(0);

    // Recommended actions
    expect(passport.recommendedActions.length).toBeGreaterThanOrEqual(1);
    for (const action of passport.recommendedActions) {
      expect(["critical", "high", "medium", "low"]).toContain(action.priority);
      expect(action.headline.length).toBeGreaterThan(5);
      expect(action.explanation.length).toBeGreaterThan(10);
      expect(action.actionRequiredBy.length).toBeGreaterThan(3);
    }

    // Evidence Graph
    expect(passport.evidenceEdges.length).toBeGreaterThan(0);
    for (const edge of passport.evidenceEdges) {
      expect(edge.relationship).toBe("explicit_source_link");
      expect(edge.confidence).toBe(1.0);
    }

    // Provenance
    expect(passport.provenance.isSynthetic).toBe(true);
    expect(passport.provenance.algorithmVersion).toContain("2.0.0");
    expect(passport.provenance.contractualDisclaimer).toContain("billed");
  });

  it("handles non-existent road IDs gracefully by returning null", () => {
    const passport = getRoadPassport("NON_EXISTENT_ROAD_ID_9999");
    expect(passport).toBeNull();
  });

  it("evaluates under_dlp roads and flags contractual verification", () => {
    // Find a road that has underDlp = true
    const passport = getRoadPassport("RD0005");
    expect(passport).not.toBeNull();
    if (!passport) return;

    if (passport.road.underDlp && passport.workOrders.length > 0) {
      const dlpAction = passport.recommendedActions.find(
        (a) => a.kind === "dlp_verification",
      );
      expect(dlpAction).toBeDefined();
      expect(dlpAction?.priority).toBe("critical");
    }
  });
});
