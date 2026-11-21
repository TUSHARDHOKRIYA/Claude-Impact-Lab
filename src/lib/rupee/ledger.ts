import type { AuditFlag, CityOverview, SpendSlice, WardLedger, WorkOrder } from "./types";
import type { Dataset } from "./load";

function sum(orders: WorkOrder[]): number {
  return orders.reduce((total, o) => total + o.costInr, 0);
}

function rate(orders: WorkOrder[], pick: (o: WorkOrder) => boolean): number {
  return orders.length ? orders.filter(pick).length / orders.length : 0;
}

function slice(orders: WorkOrder[], key: string, label: string): SpendSlice {
  return {
    key,
    label,
    spentInr: sum(orders),
    orders: orders.length,
    reopenRate: rate(orders, (o) => o.reopened),
    slaRate: rate(orders, (o) => o.slaMet),
  };
}

function groupBy(
  orders: WorkOrder[],
  keyOf: (o: WorkOrder) => string,
  labelOf: (o: WorkOrder) => string,
): SpendSlice[] {
  const groups = new Map<string, WorkOrder[]>();
  for (const o of orders) {
    const key = keyOf(o);
    const bucket = groups.get(key) ?? [];
    bucket.push(o);
    groups.set(key, bucket);
  }
  return [...groups.entries()]
    .map(([key, list]) => slice(list, key, labelOf(list[0])))
    .sort((a, b) => b.spentInr - a.spentInr || a.key.localeCompare(b.key));
}

/** Where one ward's monsoon repair money went. */
export function wardLedger(ds: Dataset, flags: AuditFlag[], wardCode: string): WardLedger | null {
  const ward = ds.wards.find((w) => w.code === wardCode);
  if (!ward) return null;

  const orders = ds.workOrders.filter((o) => o.ward === wardCode);
  const wardFlags = flags.filter((f) => f.ward === wardCode);
  const flaggedIds = new Set(wardFlags.map((f) => f.workOrderId));

  let flaggedInr = 0;
  let failedInr = 0;
  let heldInr = 0;
  for (const o of orders) {
    if (flaggedIds.has(o.id)) flaggedInr += o.costInr;
    else if (o.reopened) failedInr += o.costInr;
    else heldInr += o.costInr;
  }

  const linkedIds = new Set(ds.workOrders.flatMap((o) => o.complaintIds));
  const wardComplaints = ds.complaints.filter((c) => c.ward === wardCode);
  const heavyRainDays = new Set(
    ds.rainfall.filter((r) => r.rainfallMm >= 64.5).map((r) => r.date),
  ).size;

  return {
    ward,
    budgetInr: ward.budgetInr,
    spentInr: sum(orders),
    orders: orders.length,
    outcome: { heldInr, failedInr, flaggedInr },
    slaRate: rate(orders, (o) => o.slaMet),
    reopenRate: rate(orders, (o) => o.reopened),
    byContractor: groupBy(
      orders,
      (o) => o.contractorId,
      (o) => o.contractorName,
    ),
    byMethod: groupBy(
      orders,
      (o) => o.method,
      (o) => o.method,
    ),
    byWorkType: groupBy(
      orders,
      (o) => o.workType,
      (o) => o.workType,
    ),
    flags: wardFlags,
    complaints: {
      total: wardComplaints.length,
      linked: wardComplaints.filter((c) => linkedIds.has(c.id)).length,
      stillOpen: wardComplaints.filter(
        (c) =>
          !linkedIds.has(c.id) && (c.status === "Open" || c.status === "In Progress"),
      ).length,
    },
    context: {
      heavyRainDays,
      floodHotspots: ds.floodHotspots.filter((h) => h.ward === wardCode).length,
      roadsUnderDlp: ds.roads.filter((r) => r.ward === wardCode && r.underDlp).length,
    },
  };
}

export function allLedgers(ds: Dataset, flags: AuditFlag[]): WardLedger[] {
  return ds.wards
    .map((w) => wardLedger(ds, flags, w.code))
    .filter((l): l is WardLedger => l !== null);
}

/** City-wide total and a compact per-ward view built from the ledgers. */
export function cityOverview(ds: Dataset, flags: AuditFlag[]): CityOverview {
  const ledgers = allLedgers(ds, flags);
  const empty = { heldInr: 0, failedInr: 0, flaggedInr: 0 };
  const outcome = ledgers.reduce(
    (acc, l) => ({
      heldInr: acc.heldInr + l.outcome.heldInr,
      failedInr: acc.failedInr + l.outcome.failedInr,
      flaggedInr: acc.flaggedInr + l.outcome.flaggedInr,
    }),
    empty,
  );
  return {
    budgetInr: ledgers.reduce((n, l) => n + l.budgetInr, 0),
    spentInr: ledgers.reduce((n, l) => n + l.spentInr, 0),
    orders: ledgers.reduce((n, l) => n + l.orders, 0),
    outcome,
    wards: ledgers.map((l) => ({
      code: l.ward.code,
      name: l.ward.name,
      budgetInr: l.budgetInr,
      spentInr: l.spentInr,
      outcome: l.outcome,
      flagCount: l.flags.length,
      reopenRate: l.reopenRate,
    })),
  };
}
