import type { AuditFlag, LatLng, NextRupeeItem, Road } from "./types";
import type {
  Accident,
  Complaint,
  Dataset,
  Facility,
  FloodHotspot,
  Traffic,
} from "./load";

const ROAD_CAUSE = /pothole|waterlogged|uneven|open chamber/i;
const WEIGHTS = { open: 25, reopened: 20, accidents: 15, flood: 15, traffic: 10, facilities: 15 };

type Candidate = { text: string; weight: number };

/** Distance in metres from a point to a line segment, using a local flat-Earth frame. */
function distToSegment(lat: number, lng: number, a: LatLng, b: LatLng): number {
  const refLat = (a.lat + b.lat) / 2;
  const refLng = (a.lng + b.lng) / 2;
  const mx = 111_320 * Math.cos((refLat * Math.PI) / 180);
  const my = 110_540;
  const ax = (a.lng - refLng) * mx;
  const ay = (a.lat - refLat) * my;
  const bx = (b.lng - refLng) * mx;
  const by = (b.lat - refLat) * my;
  const px = (lng - refLng) * mx;
  const py = (lat - refLat) * my;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function norm(value: number, max: number): number {
  return value / Math.max(1, max);
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function dominantWorkType(ds: Dataset, roadId: string): string {
  const counts = new Map<string, number>();
  for (const order of ds.workOrders) {
    if (order.roadId === roadId) counts.set(order.workType, (counts.get(order.workType) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "Pothole";
}

function methodSuggestion(ds: Dataset, roadId: string): { method: string; reopenRate: number; estCostInr: number } {
  const workType = dominantWorkType(ds, roadId);
  const relevant = ds.workOrders.filter((o) => o.workType === workType);
  const byMethod = new Map<string, typeof relevant>();
  for (const order of relevant) {
    const bucket = byMethod.get(order.method) ?? [];
    bucket.push(order);
    byMethod.set(order.method, bucket);
  }
  const score = (list: typeof relevant) => ({
    reopenRate: list.filter((o) => o.reopened).length / list.length,
    orders: list.length,
  });
  const eligible = [...byMethod.entries()].map(([method, list]) => ({ method, ...score(list) }));
  const established = eligible.filter((m) => m.orders >= 10);
  const pool = established.length ? established : eligible;
  const chosen = pool.sort((a, b) => a.reopenRate - b.reopenRate || b.orders - a.orders)[0];
  const method = chosen?.method ?? "Cold mix patch";

  const entry = ds.rateCard.find((r) => r.method === method);
  const methodOrders = ds.workOrders.filter((o) => o.method === method);
  const estCostInr = entry
    ? Math.round(entry.unit === "per sqm"
        ? entry.rateInr * median(methodOrders.map((o) => o.areaSqm))
        : entry.rateInr)
    : 0;
  return { method, reopenRate: chosen?.reopenRate ?? 0, estCostInr };
}

/** Rank the roads of one ward by how urgently the next rupee should reach them. */
export function nextRupee(
  ds: Dataset,
  flags: AuditFlag[],
  wardCode: string,
  limit = 10,
): NextRupeeItem[] {
  void flags;
  const roads = ds.roads.filter((r) => r.ward === wardCode);
  if (!roads.length) return [];

  const trafficByRoad = new Map<string, Traffic>(ds.traffic.map((t) => [t.roadId, t]));
  const accidentsByRoad = new Map<string, Accident[]>();
  for (const a of ds.accidents) {
    const bucket = accidentsByRoad.get(a.roadId) ?? [];
    bucket.push(a);
    accidentsByRoad.set(a.roadId, bucket);
  }
  const facilitiesByRoad = new Map<string, Facility[]>();
  for (const f of ds.facilities) {
    const bucket = facilitiesByRoad.get(f.ambulanceEntryRoad) ?? [];
    bucket.push(f);
    facilitiesByRoad.set(f.ambulanceEntryRoad, bucket);
  }
  const reopenedByRoad = new Map<string, number>();
  for (const o of ds.workOrders) {
    if (o.reopened) reopenedByRoad.set(o.roadId, (reopenedByRoad.get(o.roadId) ?? 0) + 1);
  }

  const linkedIds = new Set(ds.workOrders.flatMap((o) => o.complaintIds));
  const openByRoad = new Map<string, Complaint[]>();
  for (const c of ds.complaints) {
    if (linkedIds.has(c.id) || c.lat == null || c.lng == null) continue;
    if (c.status !== "Open" && c.status !== "In Progress") continue;
    let best: { road: Road; distance: number } | null = null;
    for (const r of roads) {
      const distance = distToSegment(c.lat, c.lng, r.start, r.end);
      if (distance <= 300 && (!best || distance < best.distance)) best = { road: r, distance };
    }
    if (best) {
      const bucket = openByRoad.get(best.road.id) ?? [];
      bucket.push(c);
      openByRoad.set(best.road.id, bucket);
    }
  }

  const maxPeak = Math.max(1, ...ds.traffic.map((t) => t.peakHourVehicles));
  const roadsWithFlood = roads.map((r) => ({
    r,
    flood: ds.floodHotspots
      .filter((h) => distToSegment(h.lat, h.lng, r.start, r.end) <= 400)
      .sort((a, b) =>
        distToSegment(a.lat, a.lng, r.start, r.end) - distToSegment(b.lat, b.lng, r.start, r.end),
      ),
  }));

  const maxOpen = Math.max(...roads.map((r) => openByRoad.get(r.id)?.length ?? 0));
  const maxReopened = Math.max(...roads.map((r) => reopenedByRoad.get(r.id) ?? 0));
  const maxAccidents = Math.max(...roads.map((r) => accidentWeight(accidentsByRoad.get(r.id) ?? [])));
  const maxFlood = Math.max(...roadsWithFlood.map((x) => floodWeight(x.flood)));
  const maxFacilities = Math.max(...roads.map((r) => facilityWeight(facilitiesByRoad.get(r.id) ?? [])));

  const items: NextRupeeItem[] = roadsWithFlood.map(({ r, flood }) => {
    const open = openByRoad.get(r.id) ?? [];
    const reopened = reopenedByRoad.get(r.id) ?? 0;
    const accidents = accidentsByRoad.get(r.id) ?? [];
    const facilities = facilitiesByRoad.get(r.id) ?? [];
    const traffic = trafficByRoad.get(r.id);
    const accW = accidentWeight(accidents);
    const floodW = floodWeight(flood);
    const facilityW = facilityWeight(facilities);
    const trafficW = traffic
      ? 0.5 * (traffic.peakHourVehicles / maxPeak) +
        0.3 * (traffic.congestionIndex / 10) +
        0.2 * (traffic.busRoutesCount > 0 ? 1 : 0)
      : 0;

    const contributions = {
      open: WEIGHTS.open * norm(open.length, maxOpen),
      reopened: WEIGHTS.reopened * norm(reopened, maxReopened),
      accidents: WEIGHTS.accidents * norm(accW, maxAccidents),
      flood: WEIGHTS.flood * norm(floodW, maxFlood),
      traffic: WEIGHTS.traffic * trafficW,
      facilities: WEIGHTS.facilities * norm(facilityW, maxFacilities),
    };
    const score = Math.max(0, Math.min(100, Math.round(Object.values(contributions).reduce((a, b) => a + b, 0))));

    const candidates: Candidate[] = [];
    if (open.length) {
      candidates.push({ text: `${plural(open.length, "open complaint")} with no work order`, weight: contributions.open });
    }
    if (reopened) {
      candidates.push({
        text: `${reopened} ${reopened === 1 ? "fix" : "fixes"} re-opened within 30 days`,
        weight: contributions.reopened,
      });
    }
    if (accidents.length) {
      candidates.push({ text: `${plural(accidents.length, "accident")} reported on this road`, weight: contributions.accidents });
    }
    if (flood.length) {
      const top = flood[0];
      const tide = top.tideSensitive ? ", worsened by high tides" : "";
      candidates.push({
        text: `Floods at ${top.name} above ${top.floodThresholdMm} mm of rain${tide}`,
        weight: contributions.flood,
      });
    }
    const ambulance = facilities.find((f) => f.emergencyServices) ?? facilities[0];
    if (ambulance) {
      candidates.push({ text: `${ambulance.name} uses this road for ambulances`, weight: contributions.facilities });
    }
    if (traffic && trafficW > 0) {
      candidates.push({
        text: `Heavy traffic: ${traffic.congestionIndex}/10 congestion, ${traffic.busRoutesCount} bus routes`,
        weight: contributions.traffic,
      });
    }

    const suggestion = methodSuggestion(ds, r.id);
    return {
      rank: 0,
      roadId: r.id,
      roadName: r.name,
      ward: wardCode,
      score,
      reasons: candidates.sort((a, b) => b.weight - a.weight).slice(0, 4).map((c) => c.text),
      suggestedMethod: suggestion.method,
      methodReopenRate: suggestion.reopenRate,
      estCostInr: suggestion.estCostInr,
      openComplaints: open.length,
      accidents: accidents.length,
      floodHotspot: flood[0]?.name ?? null,
      facilities: facilities.map((f) => f.name),
      underDlp: r.underDlp,
    };
  });

  return items
    .sort((a, b) => b.score - a.score || a.roadId.localeCompare(b.roadId))
    .slice(0, limit)
    .map((item, i) => ({ ...item, rank: i + 1 }));
}

function accidentWeight(accidents: Accident[]): number {
  return accidents.reduce((sum, a) => sum + (ROAD_CAUSE.test(a.probableCause) ? 2 : 1), 0);
}

function floodWeight(hotspots: FloodHotspot[]): number {
  return hotspots.reduce((sum, h) => sum + (h.tideSensitive ? 2 : 1), 0);
}

function facilityWeight(facilities: Facility[]): number {
  return facilities.reduce(
    (sum, f) => sum + (f.type === "Hospital" && f.emergencyServices ? 2 : 1),
    0,
  );
}
