import { describe, expect, it } from "vitest";
import { auditWorkOrders } from "../lib/rupee/audit";
import { loadDataset } from "../lib/rupee/load";
import { nextRupee } from "../lib/rupee/next-rupee";

const ds = loadDataset();
const flags = auditWorkOrders(ds);

describe("nextRupee", () => {
  const items = nextRupee(ds, flags, "F/S", 10);

  it("returns the requested number of roads with sequential ranks", () => {
    expect(items).toHaveLength(10);
    expect(items.map((i) => i.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("keeps scores in range and sorted", () => {
    for (const item of items) {
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    }
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].score).toBeGreaterThanOrEqual(items[i].score);
    }
  });

  it("gives at most four plain reasons", () => {
    for (const item of items) {
      expect(item.reasons.length).toBeLessThanOrEqual(4);
      for (const reason of item.reasons) {
        expect(reason.length).toBeGreaterThan(0);
        expect(reason).not.toMatch(/fraud|scam/i);
      }
    }
  });

  it("suggests a real method with a plausible estimate", () => {
    for (const item of items) {
      expect(item.suggestedMethod.length).toBeGreaterThan(0);
      expect(item.methodReopenRate).toBeGreaterThanOrEqual(0);
      expect(item.methodReopenRate).toBeLessThanOrEqual(1);
      expect(item.estCostInr).toBeGreaterThanOrEqual(0);
      expect(item.ward).toBe("F/S");
      expect(typeof item.underDlp).toBe("boolean");
    }
  });

  it("returns nothing for an unknown ward", () => {
    expect(nextRupee(ds, flags, "ZZZ")).toEqual([]);
  });
});
