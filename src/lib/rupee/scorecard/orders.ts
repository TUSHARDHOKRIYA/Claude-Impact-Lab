import { daysBetween, expectedCostInr } from "../audit";
import type { Dataset } from "../load";
import { stressByOrder } from "./stress";
import type { ScoredOrder } from "./types";

/** "Far over the rate card". Normal jobs vary 20 to 30% around it, so 1.5x is well outside. */
export const OUTLIER_FACTOR = 1.5;
/** A repeat is the same kind of problem fixed again on the same road this soon after. */
export const REPEAT_WINDOW_DAYS = 45;

/** Every work order with its stress level, rate-card ratio and repeat link. */
export function buildScoredOrders(ds: Dataset): ScoredOrder[] {
  const stress = stressByOrder(ds);
  const roadById = new Map(ds.roads.map((r) => [r.id, r]));

  const orders = ds.workOrders.map((o): ScoredOrder => {
    const road = roadById.get(o.roadId);
    const expected = expectedCostInr(ds, o) ?? o.costInr;
    const costRatio = expected > 0 ? o.costInr / expected : 1;
    const context = stress.get(o.id);
    return {
      id: o.id,
      ward: o.ward,
      roadId: o.roadId,
      roadName: road?.name ?? o.roadId,
      workType: o.workType,
      method: o.method,
      contractorId: o.contractorId,
      completedAt: o.completedAt,
      areaSqm: o.areaSqm,
      costInr: o.costInr,
      expectedCostInr: expected,
      costRatio,
      slaHours: o.slaHours,
      slaMet: o.slaMet,
      reopened: o.reopened,
      stress: context?.stress ?? "Medium",
      rain30dMm: context?.rain30dMm ?? 0,
      underDlp: road?.underDlp ?? false,
      complaints: o.complaintIds.length,
      repeatOf: null,
      overBilled: costRatio > OUTLIER_FACTOR,
    };
  });

  const byRoad = new Map<string, ScoredOrder[]>();
  for (const order of orders) byRoad.set(order.roadId, [...(byRoad.get(order.roadId) ?? []), order]);
  for (const jobs of byRoad.values()) {
    jobs.sort((a, b) => (a.completedAt < b.completedAt ? -1 : a.completedAt > b.completedAt ? 1 : 0));
    for (let i = 1; i < jobs.length; i++) {
      const days = Math.floor(daysBetween(jobs[i].completedAt, jobs[i - 1].completedAt));
      if (days <= REPEAT_WINDOW_DAYS && jobs[i].workType === jobs[i - 1].workType) {
        jobs[i].repeatOf = { workOrderId: jobs[i - 1].id, days, contractorId: jobs[i - 1].contractorId };
      }
    }
  }
  return orders;
}
