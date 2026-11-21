import { getRupee } from "./index";
import { wardSlug } from "./slug";

export type RoadTrailSummary = {
  roadId: string;
  roadName: string;
  ward: string;
  wardHref: string;
  underDlp: boolean;
  lastResurfaced: string;
  spentInr: number;
  orders: number;
  reopenedCount: number;
  flagCount: number;
  lastContractorId: string | null;
  lastContractorName: string | null;
};

/** Look up the BMC spend, DLP guarantee, and last contractor for a snapped road segment. */
export function getRoadTrail(
  roadId: string | null | undefined,
): RoadTrailSummary | null {
  if (!roadId) return null;
  const { ds, flags } = getRupee();
  const road = ds.roads.find((r) => r.id === roadId);
  if (!road) return null;

  const orders = ds.workOrders
    .filter((o) => o.roadId === road.id)
    .sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  const roadFlags = flags.filter((f) => f.roadId === road.id);
  const latest = orders[0] ?? null;

  return {
    roadId: road.id,
    roadName: road.name,
    ward: road.ward,
    wardHref: `/wards/${wardSlug(road.ward)}`,
    underDlp: road.underDlp,
    lastResurfaced: road.lastResurfaced,
    spentInr: orders.reduce((sum, o) => sum + o.costInr, 0),
    orders: orders.length,
    reopenedCount: orders.filter((o) => o.reopened).length,
    flagCount: roadFlags.length,
    lastContractorId: latest?.contractorId ?? null,
    lastContractorName: latest ? latest.contractorName.replace(" (synthetic)", "") : null,
  };
}
