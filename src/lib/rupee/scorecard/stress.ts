import type { Dataset } from "../load";
import type { StressLevel } from "./types";

const HOTSPOT_KM = 0.6;
const DAY_MS = 86_400_000;

/** Average-rank percentile in (0, 1], the same convention as pandas rank(pct=True). */
export function percentileRanks(values: number[]): number[] {
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const out = new Array<number>(values.length);
  let start = 0;
  while (start < order.length) {
    let end = start;
    while (end + 1 < order.length && order[end + 1].v === order[start].v) end++;
    const rank = (start + end) / 2 + 1;
    for (let k = start; k <= end; k++) out[order[k].i] = rank / values.length;
    start = end + 1;
  }
  return out;
}

/** Linear-interpolated quantile, q between 0 and 1. */
export function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Mean rainfall across stations per date, then the total over the 30 days after a job completes. */
function rainfallAfter(ds: Dataset): (completedAt: string) => number | null {
  const byDate = new Map<string, number[]>();
  for (const row of ds.rainfall) byDate.set(row.date, [...(byDate.get(row.date) ?? []), row.rainfallMm]);
  const daily = new Map([...byDate].map(([date, mm]) => [date, mm.reduce((a, b) => a + b, 0) / mm.length]));
  return (completedAt) => {
    const day = completedAt.slice(0, 10);
    if (!daily.has(day)) return null;
    const start = Date.parse(`${day}T00:00:00Z`);
    let total = 0;
    for (let d = 1; d <= 30; d++) total += daily.get(dayKey(start + d * DAY_MS)) ?? 0;
    return total;
  };
}

/**
 * Stress per work order: Low, Medium or High. Built from the rain that fell in
 * the 30 days after the job, whether the road sits at a flood hotspot, and a
 * traffic proxy (the data has no vehicle types). Stress only raises what we
 * expect of a job. It is never a bonus or a penalty on its own.
 */
export function stressByOrder(ds: Dataset): Map<string, { stress: StressLevel; rain30dMm: number }> {
  const orders = ds.workOrders;
  const rainOf = rainfallAfter(ds);
  const rawRain = orders.map((o) => rainOf(o.completedAt));
  const fill = quantile(rawRain.filter((v): v is number => v !== null), 0.5);
  const rain = rawRain.map((v) => v ?? fill);

  const roadById = new Map(ds.roads.map((r) => [r.id, r]));
  const nearHotspot = (roadId: string): number => {
    const road = roadById.get(roadId);
    if (!road) return 0;
    const lat = (road.start.lat + road.end.lat) / 2;
    const lng = (road.start.lng + road.end.lng) / 2;
    return ds.floodHotspots.some((h) => haversineKm(lat, lng, h.lat, h.lng) <= HOTSPOT_KM) ? 1 : 0;
  };

  const traffic = ds.traffic;
  const vehicles = percentileRanks(traffic.map((t) => t.peakHourVehicles));
  const congestion = percentileRanks(traffic.map((t) => t.congestionIndex));
  const buses = percentileRanks(traffic.map((t) => t.busRoutesCount));
  const trafficIdx = new Map(traffic.map((t, i) => [t.roadId, (vehicles[i] + congestion[i] + buses[i]) / 3]));
  const trafficFill = quantile([...trafficIdx.values()], 0.5);

  const rainPct = percentileRanks(rain);
  const raw = orders.map((o, i) => (rainPct[i] + (trafficIdx.get(o.roadId) ?? trafficFill) + nearHotspot(o.roadId)) / 3);
  const lowCut = quantile(raw, 1 / 3);
  const highCut = quantile(raw, 2 / 3);

  const level = (v: number): StressLevel => (v <= lowCut ? "Low" : v <= highCut ? "Medium" : "High");
  return new Map(orders.map((o, i) => [o.id, { stress: level(raw[i]), rain30dMm: rain[i] }]));
}
