import type { Dataset } from "../load";
import type { Buckets } from "./score";
import type { MethodSlice, RepeatExample, RepeatRoad, Repeats, ScoredOrder, Volume, WardSlice } from "./types";

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const rate = (orders: ScoredOrder[], pick: (o: ScoredOrder) => boolean) =>
  orders.length ? orders.filter(pick).length / orders.length : 0;
const sum = (orders: ScoredOrder[], pick: (o: ScoredOrder) => number) => orders.reduce((n, o) => n + pick(o), 0);

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) out.set(key(item), [...(out.get(key(item)) ?? []), item]);
  return out;
}

/**
 * Repeat-repair evidence. Shown next to the score, never inside it: the data
 * has no pothole-level coordinates, so "the same spot" can only mean the same
 * road segment and the same kind of problem within a short window.
 */
export function repeatsOf(contractorId: string, orders: ScoredOrder[]): Repeats {
  const repeats = orders.filter((o) => o.repeatOf);
  const perRoad = groupBy(orders, (o) => o.roadId);
  const topRoads: RepeatRoad[] = [...perRoad.values()]
    .filter((jobs) => jobs.length > 1)
    .map((jobs) => ({
      roadId: jobs[0].roadId,
      roadName: jobs[0].roadName,
      ward: jobs[0].ward,
      jobs: jobs.length,
      reopened: jobs.filter((o) => o.reopened).length,
      costInr: sum(jobs, (o) => o.costInr),
    }))
    .sort((a, b) => b.jobs - a.jobs || b.costInr - a.costInr)
    .slice(0, 8);
  const examples: RepeatExample[] = repeats
    .map((o) => ({
      roadId: o.roadId,
      roadName: o.roadName,
      ward: o.ward,
      workOrderId: o.id,
      earlierWorkOrderId: o.repeatOf!.workOrderId,
      days: o.repeatOf!.days,
      workType: o.workType,
      costInr: o.costInr,
      sameContractor: o.repeatOf!.contractorId === contractorId,
    }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 8);
  return {
    reopened: orders.filter((o) => o.reopened).length,
    reopenedInr: sum(orders.filter((o) => o.reopened), (o) => o.costInr),
    repeatJobs: repeats.length,
    repeatInr: sum(repeats, (o) => o.costInr),
    byThisContractor: repeats.filter((o) => o.repeatOf!.contractorId === contractorId).length,
    roadsFixedTwice: [...perRoad.values()].filter((jobs) => jobs.length > 1).length,
    roadsFixedThreePlus: [...perRoad.values()].filter((jobs) => jobs.length > 2).length,
    topRoads,
    examples,
  };
}

export function wardSlices(ds: Dataset, orders: ScoredOrder[], buckets: Buckets): WardSlice[] {
  const wardInfo = new Map(ds.wards.map((w) => [w.code, w]));
  return [...groupBy(orders, (o) => o.ward)]
    .map(([ward, jobs]) => ({
      ward,
      wardName: wardInfo.get(ward)?.name ?? "",
      jobs: jobs.length,
      billedInr: sum(jobs, (o) => o.costInr),
      budgetShare: sum(jobs, (o) => o.costInr) / Math.max(wardInfo.get(ward)?.budgetInr ?? 0, 1),
      reopenRate: rate(jobs, (o) => o.reopened),
      expectedReopenRate: mean(jobs.map(buckets.reopenRate)),
      slaMissRate: rate(jobs, (o) => !o.slaMet),
      expectedSlaMissRate: mean(jobs.map(buckets.slaMissRate)),
      avgCostRatio: mean(jobs.map((o) => o.costRatio)),
    }))
    .sort((a, b) => b.jobs - a.jobs || a.ward.localeCompare(b.ward));
}

export function methodSlices(orders: ScoredOrder[], buckets: Buckets): MethodSlice[] {
  return [...groupBy(orders, (o) => o.method)]
    .map(([method, jobs]) => ({
      method,
      jobs: jobs.length,
      reopenRate: rate(jobs, (o) => o.reopened),
      expectedReopenRate: mean(jobs.map(buckets.reopenRate)),
      slaMissRate: rate(jobs, (o) => !o.slaMet),
      expectedSlaMissRate: mean(jobs.map(buckets.slaMissRate)),
    }))
    .sort((a, b) => b.jobs - a.jobs);
}

export function volumeOf(orders: ScoredOrder[]): Volume {
  const dates = orders.map((o) => o.completedAt.slice(0, 10)).sort();
  const dlp = orders.filter((o) => o.underDlp);
  return {
    jobs: orders.length,
    billedInr: sum(orders, (o) => o.costInr),
    expectedBilledInr: sum(orders, (o) => o.expectedCostInr),
    wards: new Set(orders.map((o) => o.ward)).size,
    roads: new Set(orders.map((o) => o.roadId)).size,
    highStressShare: rate(orders, (o) => o.stress === "High"),
    mediumStressShare: rate(orders, (o) => o.stress === "Medium"),
    lowStressShare: rate(orders, (o) => o.stress === "Low"),
    complaintsLinked: sum(orders, (o) => o.complaints),
    jobsWithoutComplaint: orders.filter((o) => o.complaints === 0).length,
    paidUnderDlpJobs: dlp.length,
    paidUnderDlpInr: sum(dlp, (o) => o.costInr),
    firstJob: dates[0] ?? "",
    lastJob: dates[dates.length - 1] ?? "",
  };
}
