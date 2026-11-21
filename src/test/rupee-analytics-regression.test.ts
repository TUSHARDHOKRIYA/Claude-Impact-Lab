import { describe, expect, it } from "vitest";
import { auditWorkOrders } from "../lib/rupee/audit";
import { contractorScores } from "../lib/rupee/contractors";
import { allLedgers, cityOverview, wardLedger } from "../lib/rupee/ledger";
import { loadDataset } from "../lib/rupee/load";
import { nextRupee } from "../lib/rupee/next-rupee";

const ds = loadDataset();
const flags = auditWorkOrders(ds);

describe("rupee analytics regression tests", () => {
  it("preserves exact cityOverview aggregations", () => {
    const overview = cityOverview(ds, flags);
    const rawSpent = ds.workOrders.reduce((n, o) => n + o.costInr, 0);
    const rawBudget = ds.wards.reduce((n, w) => n + w.budgetInr, 0);

    expect(overview.wards).toHaveLength(24);
    expect(overview.orders).toBe(ds.workOrders.length);
    expect(overview.spentInr).toBe(rawSpent);
    expect(overview.budgetInr).toBe(rawBudget);

    const { heldInr, failedInr, flaggedInr } = overview.outcome;
    expect(heldInr + failedInr + flaggedInr).toBe(rawSpent);
    expect(heldInr).toBeGreaterThan(0);
    expect(failedInr).toBeGreaterThan(0);
    expect(flaggedInr).toBeGreaterThan(0);
  });

  it("preserves wardLedger outcomes for representative wards", () => {
    const testWards = ["A", "F/S", "K/W", "G/N"];

    for (const code of testWards) {
      const ledger = wardLedger(ds, flags, code);
      expect(ledger).not.toBeNull();
      if (!ledger) continue;

      expect(ledger.ward.code).toBe(code);

      const wardOrders = ds.workOrders.filter((o) => o.ward === code);
      const wardSpent = wardOrders.reduce((n, o) => n + o.costInr, 0);

      expect(ledger.orders).toBe(wardOrders.length);
      expect(ledger.spentInr).toBe(wardSpent);

      const { heldInr, failedInr, flaggedInr } = ledger.outcome;
      expect(heldInr + failedInr + flaggedInr).toBe(wardSpent);

      // SLA and reopen rates between 0 and 1
      expect(ledger.slaRate).toBeGreaterThanOrEqual(0);
      expect(ledger.slaRate).toBeLessThanOrEqual(1);
      expect(ledger.reopenRate).toBeGreaterThanOrEqual(0);
      expect(ledger.reopenRate).toBeLessThanOrEqual(1);

      // Check breakdown invariants
      for (const breakdown of [ledger.byContractor, ledger.byMethod, ledger.byWorkType]) {
        const sum = breakdown.reduce((n, s) => n + s.spentInr, 0);
        expect(sum).toBe(wardSpent);
      }

      // Context
      expect(ledger.context.heavyRainDays).toBeGreaterThanOrEqual(0);
      expect(ledger.context.floodHotspots).toBeGreaterThanOrEqual(0);
      expect(ledger.context.roadsUnderDlp).toBeGreaterThanOrEqual(0);
    }
  });

  it("preserves contractorScores structure and fair context", () => {
    const scores = contractorScores(ds, flags);
    expect(scores).toHaveLength(ds.contractors.length);

    for (const s of scores) {
      expect(s.contractor.id).toBeTruthy();
      expect(s.orders).toBeGreaterThanOrEqual(0);
      expect(s.spentInr).toBeGreaterThanOrEqual(0);
      expect(s.slaRate).toBeGreaterThanOrEqual(0);
      expect(s.slaRate).toBeLessThanOrEqual(1);
      expect(s.reopenRate).toBeGreaterThanOrEqual(0);
      expect(s.reopenRate).toBeLessThanOrEqual(1);
      expect(s.expectedReopenRate).toBeGreaterThanOrEqual(0);
      expect(s.expectedReopenRate).toBeLessThanOrEqual(1);
      expect(s.medianCostRatio).toBeGreaterThanOrEqual(0);
      expect(s.flaggedInr).toBeGreaterThanOrEqual(0);
      expect(s.contextNote).toBeTruthy();
    }
  });

  it("preserves nextRupee priority rankings and scoring invariants", () => {
    const items = nextRupee(ds, flags, "A");
    expect(items.length).toBeGreaterThan(0);

    let prevScore = 100;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      expect(item.rank).toBe(i + 1);
      expect(item.score).toBeLessThanOrEqual(prevScore);
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
      expect(item.reasons.length).toBeGreaterThan(0);
      expect(item.reasons.length).toBeLessThanOrEqual(4);
      expect(item.suggestedMethod).toBeTruthy();
      expect(item.estCostInr).toBeGreaterThan(0);
      prevScore = item.score;
    }
  });

  it("deterministically produces identical allLedgers results", () => {
    const run1 = allLedgers(ds, flags);
    const run2 = allLedgers(ds, flags);
    expect(run1.length).toBe(run2.length);
    for (let i = 0; i < run1.length; i++) {
      expect(run1[i].ward.code).toBe(run2[i].ward.code);
      expect(run1[i].spentInr).toBe(run2[i].spentInr);
      expect(run1[i].outcome).toEqual(run2[i].outcome);
    }
  });
});
