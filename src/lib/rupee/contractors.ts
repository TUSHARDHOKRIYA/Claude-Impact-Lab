import type { AuditFlag, AuditFlagKind, ContractorScore } from "./types";
import type { Dataset } from "./load";
import { expectedCostInr } from "./audit";

type Band = "low" | "mid" | "high";

function bandOf(index: number): Band {
  if (index < 0.4) return "low";
  if (index > 0.65) return "high";
  return "mid";
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function rateOf<T>(items: T[], pick: (item: T) => boolean): number {
  return items.length ? items.filter(pick).length / items.length : 0;
}

/**
 * Fair scorecards: durability expectations are adjusted for the type of work
 * and how flood-prone the wards were, so volume alone is not punished.
 */
export function contractorScores(ds: Dataset, flags: AuditFlag[]): ContractorScore[] {
  const wardBand = new Map(ds.wards.map((w) => [w.code, bandOf(w.lowLyingIndex)]));
  const cityReopenRate = rateOf(ds.workOrders, (o) => o.reopened);

  const baseline = new Map<string, { reopened: number; total: number }>();
  const groupKey = (workType: string, band: Band) => `${workType}|${band}`;
  for (const order of ds.workOrders) {
    const key = groupKey(order.workType, wardBand.get(order.ward) ?? "mid");
    const bucket = baseline.get(key) ?? { reopened: 0, total: 0 };
    bucket.total++;
    if (order.reopened) bucket.reopened++;
    baseline.set(key, bucket);
  }
  const baselineRate = (key: string) => {
    const bucket = baseline.get(key);
    return bucket && bucket.total > 0 ? bucket.reopened / bucket.total : cityReopenRate;
  };

  const costByOrder = new Map(ds.workOrders.map((o) => [o.id, o.costInr]));
  const flagsByContractor = new Map<string, AuditFlag[]>();
  for (const flag of flags) {
    const bucket = flagsByContractor.get(flag.contractorId) ?? [];
    bucket.push(flag);
    flagsByContractor.set(flag.contractorId, bucket);
  }

  return ds.contractors
    .map((contractor): ContractorScore => {
      const orders = ds.workOrders.filter((o) => o.contractorId === contractor.id);
      const ownFlags = flagsByContractor.get(contractor.id) ?? [];
      const flaggedCounts: Record<AuditFlagKind, number> = {
        over_rate: 0,
        double_billed: 0,
        paid_under_dlp: 0,
        phantom_completion: 0,
      };
      for (const flag of ownFlags) flaggedCounts[flag.kind]++;
      const flaggedIds = new Set(ownFlags.map((f) => f.workOrderId));

      const expectedReopenRate = orders.length
        ? orders.reduce((sum, o) => {
            const band = wardBand.get(o.ward) ?? "mid";
            return sum + baselineRate(groupKey(o.workType, band));
          }, 0) / orders.length
        : cityReopenRate;

      const costRatios = orders
        .map((o) => {
          const expected = expectedCostInr(ds, o);
          return expected && expected > 0 ? o.costInr / expected : null;
        })
        .filter((r): r is number => r !== null);

      const lowShare = orders.length
        ? orders.filter((o) => wardBand.get(o.ward) === "high").length / orders.length
        : 0;
      const lowPct = Math.round(lowShare * 100);
      const contextNote = lowPct > 0
        ? `${lowPct}% of their jobs were in low-lying wards, where repairs fail more often.`
        : "Their jobs were mostly in wards with less flood exposure.";

      return {
        contractor,
        orders: orders.length,
        spentInr: orders.reduce((sum, o) => sum + o.costInr, 0),
        slaRate: rateOf(orders, (o) => o.slaMet),
        reopenRate: rateOf(orders, (o) => o.reopened),
        expectedReopenRate,
        medianCostRatio: median(costRatios),
        flags: flaggedCounts,
        flaggedInr: [...flaggedIds].reduce((sum, id) => sum + (costByOrder.get(id) ?? 0), 0),
        wards: [...new Set(orders.map((o) => o.ward))],
        contextNote,
      };
    })
    .sort((a, b) => b.spentInr - a.spentInr || a.contractor.id.localeCompare(b.contractor.id));
}
