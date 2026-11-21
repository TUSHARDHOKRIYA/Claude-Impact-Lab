import { describe, expect, it } from "vitest";
import { auditWorkOrders } from "../lib/rupee/audit";
import { loadDataset, type Dataset } from "../lib/rupee/load";
import type { WorkOrder } from "../lib/rupee/types";

function baseDs(): Dataset {
  return {
    wards: [], roads: [], workOrders: [], contractors: [], rateCard: [],
    complaints: [], floodHotspots: [], rainfall: [], tides: [], traffic: [],
    accidents: [], facilities: [],
  };
}

function order(overrides: Partial<WorkOrder>): WorkOrder {
  return {
    id: "WO1", complaintIds: [], ward: "F/S", roadId: "RD1", workType: "Pothole",
    method: "Cold mix patch", contractorId: "CT1", contractorName: "Test Co",
    assignedAt: "2025-06-01 00:00", startedAt: "2025-06-01 01:00",
    completedAt: "2025-06-01 05:00", areaSqm: 12, costInr: 21600,
    slaHours: 24, slaMet: true, reopened: false, remark: "",
    ...overrides,
  };
}

describe("auditWorkOrders", () => {
  const rateCard = [
    { method: "Cold mix patch", unit: "per sqm" as const, rateInr: 1800 },
    { method: "Drain desilting", unit: "per job" as const, rateInr: 90000 },
  ];

  it("flags over-rate bills but not normal variation", () => {
    const ds = baseDs();
    ds.rateCard = rateCard;
    ds.workOrders = [
      order({ id: "HIGH", costInr: 50000, complaintIds: ["BMC1"] }),
      order({ id: "OK", costInr: 25000, complaintIds: ["BMC2"] }),
    ];
    const flags = auditWorkOrders(ds);
    expect(flags.map((f) => f.workOrderId)).toEqual(["HIGH"]);
    expect(flags[0].amountAtRiskInr).toBe(28400);
    expect(flags[0].reason).toContain("cold mix patch of 12 sqm");
    expect(flags[0].reason).toContain("₹21,600");
  });

  it("flags the later unbilled repeat on the same road and method", () => {
    const ds = baseDs();
    ds.rateCard = rateCard;
    ds.roads = [{ id: "RD1" } as Dataset["roads"][number]];
    ds.workOrders = [
      order({ id: "EARLY", method: "Drain desilting", costInr: 90000, complaintIds: ["BMC1"], completedAt: "2025-06-01 05:00" }),
      order({ id: "LATE", method: "Drain desilting", costInr: 90000, complaintIds: [], completedAt: "2025-06-05 05:00" }),
    ];
    const flags = auditWorkOrders(ds);
    const doubles = flags.filter((f) => f.kind === "double_billed");
    expect(doubles).toHaveLength(1);
    expect(doubles[0].workOrderId).toBe("LATE");
    expect(doubles[0].evidence).toEqual(["EARLY"]);
    expect(doubles[0].amountAtRiskInr).toBe(90000);
  });

  it("flags work billed on a road still under DLP", () => {
    const ds = baseDs();
    ds.rateCard = rateCard;
    ds.roads = [{ id: "RD1", name: "Test Road", underDlp: true } as Dataset["roads"][number]];
    ds.workOrders = [order({ costInr: 21600 })];
    const flags = auditWorkOrders(ds);
    expect(flags).toHaveLength(1);
    expect(flags[0].kind).toBe("paid_under_dlp");
    expect(flags[0].roadName).toBe("Test Road");
    expect(flags[0].reason).toContain("Defect Liability Period");
  });

  it("stays factual on the real dataset", () => {
    const ds = loadDataset();
    const flags = auditWorkOrders(ds);
    const kinds = new Set(flags.map((f) => f.kind));
    expect(kinds.has("over_rate")).toBe(true);
    expect(kinds.has("double_billed")).toBe(true);
    expect(kinds.has("paid_under_dlp")).toBe(true);
    for (const f of flags) {
      expect(f.amountAtRiskInr).toBeLessThanOrEqual(f.costInr);
      expect(f.reason).not.toMatch(/fraud|scam|theft/i);
      expect(f.evidence).toBeInstanceOf(Array);
    }
  });
});
