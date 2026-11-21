import type { AuditFlag, LatLng, Road, WorkOrder } from "./types";
import type { Complaint, Dataset } from "./load";
import { formatInr } from "./format";

/** Road-surface work types covered by a resurfacing Defect Liability Period. */
const DLP_SURFACE_TYPES = new Set([
  "Pothole",
  "Broken paver blocks",
  "Road cave-in",
]);

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

function distM(lat: number, lng: number, a: LatLng, b: LatLng): number {
  const refLat = (a.lat + b.lat) / 2;
  const mx = 111_320 * Math.cos((refLat * Math.PI) / 180);
  const my = 110_540;
  const ax = (a.lng - lng) * mx;
  const ay = (a.lat - lat) * my;
  const bx = (b.lng - lng) * mx;
  const by = (b.lat - lat) * my;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (-ax * dx - ay * dy) / len2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

function baseFlag(roadById: Map<string, Road>, order: WorkOrder): AuditFlag {
  const road = roadById.get(order.roadId);
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

function overRateFlag(
  ds: Dataset,
  roadById: Map<string, Road>,
  order: WorkOrder,
): AuditFlag | null {
  const expected = expectedCostInr(ds, order);
  if (expected == null || expected <= 0 || order.costInr <= expected * 1.35) {
    return null;
  }
  const flag = baseFlag(roadById, order);
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

function doubleBilledFlag(
  ds: Dataset,
  roadById: Map<string, Road>,
  order: WorkOrder,
): AuditFlag | null {
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
  const flag = baseFlag(roadById, order);
  flag.kind = "double_billed";
  flag.amountAtRiskInr = order.costInr;
  flag.evidence = [earlier.id];
  flag.reason = `A second ${lowerFirst(order.method)} bill of ${formatInr(order.costInr)} was raised on this road within seven days of ${earlier.id}, with no complaint linked to it.`;
  return flag;
}

function dlpFlag(
  roadById: Map<string, Road>,
  order: WorkOrder,
): AuditFlag | null {
  const road = roadById.get(order.roadId);
  if (!road?.underDlp || !DLP_SURFACE_TYPES.has(order.workType)) return null;
  const flag = baseFlag(roadById, order);
  flag.kind = "paid_under_dlp";
  flag.amountAtRiskInr = order.costInr;
  flag.reason = `This road is still under its Defect Liability Period for surface repairs, so the resurfacing contractor should fix ${lowerFirst(order.workType)} damage at no cost to BMC.`;
  return flag;
}

function phantomCompletionFlag(
  roadById: Map<string, Road>,
  complaintsByWard: Map<string, Complaint[]>,
  order: WorkOrder,
): AuditFlag | null {
  if (!order.completedAt) return null;
  const road = roadById.get(order.roadId);
  if (!road?.start || !road?.end) return null;
  const wardComplaints = complaintsByWard.get(order.ward);
  if (!wardComplaints?.length) return null;

  const linked = new Set(order.complaintIds);
  const spike = wardComplaints.filter((c) => {
    if (linked.has(c.id) || c.lat == null || c.lng == null) return false;
    const gap = daysBetween(c.receivedAt, order.completedAt);
    if (gap <= 0 || gap > 14) return false;
    return distM(c.lat, c.lng, road.start, road.end) <= 250;
  });
  if (spike.length < 2) return null;

  const flag = baseFlag(roadById, order);
  flag.kind = "phantom_completion";
  flag.amountAtRiskInr = order.costInr;
  flag.evidence = spike.slice(0, 3).map((c) => c.id);
  flag.reason = `${spike.length} new complaints were filed within 250 m of this road in the 14 days after ${order.id} was marked completed, suggesting the repair may not have held or finished cleanly.`;
  return flag;
}

/** Flag over-billing, same-road repeat bills, surface repairs paid under DLP, and post-closure complaint spikes. */
export function auditWorkOrders(ds: Dataset): AuditFlag[] {
  const roadById = new Map(ds.roads.map((r) => [r.id, r]));
  const complaintsByWard = new Map<string, Complaint[]>();
  for (const c of ds.complaints) {
    if (!c.ward || c.lat == null || c.lng == null) continue;
    const bucket = complaintsByWard.get(c.ward) ?? [];
    bucket.push(c);
    complaintsByWard.set(c.ward, bucket);
  }

  const flags: AuditFlag[] = [];
  for (const order of ds.workOrders) {
    const checks = [
      overRateFlag(ds, roadById, order),
      doubleBilledFlag(ds, roadById, order),
      dlpFlag(roadById, order),
      phantomCompletionFlag(roadById, complaintsByWard, order),
    ];
    for (const flag of checks) {
      if (flag) flags.push(flag);
    }
  }
  return flags;
}
