import { describe, expect, it } from "vitest";
import { generateBudgetScenarios, rankRoadPriorities } from "@/lib/passport/scenarios";

describe("Spend vs Need Prioritisation & Scenarios", () => {
  it("ranks roads using 5 visible multi-dimensional criteria", () => {
    const ranked = rankRoadPriorities();
    expect(ranked.length).toBe(291);

    const top = ranked[0];
    expect(top.rank).toBe(1);
    expect(top.compositeScore).toBeGreaterThanOrEqual(ranked[ranked.length - 1].compositeScore);

    const dims = top.dimensions;
    expect(dims.infrastructureVulnerability.name).toBe("Infrastructure Vulnerability");
    expect(dims.publicSafety.name).toBe("Public Safety");
    expect(dims.serviceDeficit.name).toBe("Service Deficit");
    expect(dims.maintenanceBurden.name).toBe("Maintenance Burden");
    expect(dims.resourceEquity.name).toBe("Resource Equity");

    expect(top.recommendedIntervention.length).toBeGreaterThan(5);
    expect(top.estCostInr).toBeGreaterThan(0);
  });

  it("generates 4 distinct deterministic budget scenarios", () => {
    const scenarios = generateBudgetScenarios();
    expect(scenarios.length).toBe(4);

    const ids = scenarios.map((s) => s.id);
    expect(ids).toContain("pre_monsoon");
    expect(ids).toContain("balanced");
    expect(ids).toContain("critical_safety");
    expect(ids).toContain("monsoon_emergency");

    for (const sc of scenarios) {
      expect(sc.budgetEnvelopeInr).toBeGreaterThan(0);
      expect(sc.allocatedInr).toBeLessThanOrEqual(sc.budgetEnvelopeInr);
      expect(sc.roadsFundedCount).toBeGreaterThan(0);
      expect(sc.fundedRoads.length).toBe(sc.roadsFundedCount);
    }
  });
});
