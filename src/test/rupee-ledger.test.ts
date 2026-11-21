import { describe, expect, it } from "vitest";
import { auditWorkOrders } from "../lib/rupee/audit";
import { allLedgers, cityOverview } from "../lib/rupee/ledger";
import { loadDataset } from "../lib/rupee/load";

const ds = loadDataset();
const flags = auditWorkOrders(ds);
const ledgers = allLedgers(ds, flags);

describe("ward ledgers", () => {
  it("covers all 24 wards", () => {
    expect(ds.wards).toHaveLength(24);
    expect(ledgers).toHaveLength(24);
  });

  it("puts every rupee in exactly one outcome bucket", () => {
    for (const l of ledgers) {
      const { heldInr, failedInr, flaggedInr } = l.outcome;
      expect(heldInr + failedInr + flaggedInr, l.ward.code).toBe(l.spentInr);
      expect(heldInr).toBeGreaterThanOrEqual(0);
      expect(failedInr).toBeGreaterThanOrEqual(0);
      expect(flaggedInr).toBeGreaterThanOrEqual(0);
    }
  });

  it("counts flagged spend once, whatever the number of flags", () => {
    for (const l of ledgers) {
      const flaggedOrderIds = new Set(l.flags.map((f) => f.workOrderId));
      const expected = ds.workOrders
        .filter((o) => o.ward === l.ward.code && flaggedOrderIds.has(o.id))
        .reduce((n, o) => n + o.costInr, 0);
      expect(l.outcome.flaggedInr, l.ward.code).toBe(expected);
    }
  });

  it("sorts every breakdown by spend", () => {
    for (const l of ledgers) {
      for (const breakdown of [l.byContractor, l.byMethod, l.byWorkType]) {
        for (let i = 1; i < breakdown.length; i++) {
          expect(breakdown[i - 1].spentInr).toBeGreaterThanOrEqual(breakdown[i].spentInr);
        }
      }
    }
  });

  it("matches city totals to the raw work orders", () => {
    const overview = cityOverview(ds, flags);
    const rawSpent = ds.workOrders.reduce((n, o) => n + o.costInr, 0);
    expect(overview.spentInr).toBe(rawSpent);
    expect(overview.wards).toHaveLength(24);
    expect(overview.outcome.heldInr + overview.outcome.failedInr + overview.outcome.flaggedInr).toBe(rawSpent);
    expect(overview.budgetInr).toBe(ds.wards.reduce((n, w) => n + w.budgetInr, 0));
  });
});
