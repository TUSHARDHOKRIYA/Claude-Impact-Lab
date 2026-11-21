import type { AuditFlag, WorkOrder } from "./types";
import type { Dataset } from "./load";
import { formatInr } from "./format";

/** Rate-card expectation for an order, or null when the method is not listed. */
export function expectedCostInr(
  ds: Dataset,
  order: Pick<WorkOrder, "method" | "areaSqm">,
): number | null {
  const entry = ds.rateCard.find((r) => r.method === order.method);
  if (!entry) return null;
  return entry.unit === "per sqm" ? entry.rateInr * order.areaSqm : entry.rateInr;
}

export function daysBetween(later: string, earlier: string): number {
  const t = (s: string) => new Date(s.replace(" ", "T")).getTime();
  return (t(later) - t(earlier)) / 86_400_000;
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function baseFlag(ds: Dataset, order: WorkOrder): AuditFlag {
  const road = ds.roads.find((r) => r.id === order.roadId);
  return {
    kind: "over_rate",
    workOrderId: order.id,
    ward: order.ward,
    roadId: order.roadId,
    roadName: road?.name ?? order.roadId,
    contractorId: order.contractorId,
    contractorName: order.contractorName,
    completedAt: order.completedAt,
    costInr: order.costInr,
    amountAtRiskInr: 0,
    reason: "",
    evidence: [],
  };
}

function overRateFlag(ds: Dataset, order: WorkOrder): AuditFlag | null {
  const expected = expectedCostInr(ds, order);
  if (expected == null || expected <= 0 || order.costInr <= expected * 1.35) {
    return null;
  }
  const flag = baseFlag(ds, order);
  flag.kind = "over_rate";
  flag.amountAtRiskInr = Math.round(order.costInr - expected);
  const method = lowerFirst(order.method);
  const scope =
    ds.rateCard.find((r) => r.method === order.method)?.unit === "per sqm"
      ? ` of ${order.areaSqm} sqm`
      : "";
  flag.reason = `Billed ${formatInr(order.costInr)} for a ${method}${scope}; the rate card puts it near ${formatInr(expected)}.`;
  return flag;
}

function doubleBilledFlag(ds: Dataset, order: WorkOrder): AuditFlag | null {
  if (order.complaintIds.length > 0) return null;
  const earlier = ds.workOrders
    .filter(
      (o) =>
        o.id !== order.id &&
        o.roadId === order.roadId &&
        o.method === order.method &&
        daysBetween(order.completedAt, o.completedAt) >= 0 &&
        daysBetween(order.completedAt, o.completedAt) <= 7,
    )
    .sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))[0];
  if (!earlier) return null;
  const flag = baseFlag(ds, order);
  flag.kind = "double_billed";
  flag.amountAtRiskInr = order.costInr;
  flag.evidence = [earlier.id];
  flag.reason = `A second ${lowerFirst(order.method)} bill of ${formatInr(order.costInr)} was raised on this road within seven days of ${earlier.id}, with no complaint linked to it.`;
  return flag;
}

function dlpFlag(ds: Dataset, order: WorkOrder): AuditFlag | null {
  const road = ds.roads.find((r) => r.id === order.roadId);
  if (!road?.underDlp) return null;
  const flag = baseFlag(ds, order);
  flag.kind = "paid_under_dlp";
  flag.amountAtRiskInr = order.costInr;
  flag.reason = `This road is still under its Defect Liability Period, so the original contractor should repair it at no cost to BMC.`;
  return flag;
}

/** Flag over-billing, same-road repeat bills and repairs paid for under DLP. */
export function auditWorkOrders(ds: Dataset): AuditFlag[] {
  const flags: AuditFlag[] = [];
  for (const order of ds.workOrders) {
    const checks = [overRateFlag(ds, order), doubleBilledFlag(ds, order), dlpFlag(ds, order)];
    for (const flag of checks) {
      if (flag) flags.push(flag);
    }
  }
  return flags;
}
