import type { Road } from "@/lib/rupee/types";
import { distToSegment } from "./spatial";

export const ROAD_SNAP_MAX_DISTANCE_M = 80;
export const ROAD_SNAP_EXCELLENT_DISTANCE_M = 40;

export type RoadSnapResult = {
  road: Road | null;
  distanceM: number | null;
  confidence: number;
  snapped: boolean;
  warning?: string;
};

/**
 * Snaps a GPS point to the nearest road segment in candidate roads.
 * Strictly enforces maximum proximity threshold (80m) to avoid false ward-wide associations.
 */
export function snapGpsToRoad(
  lat: number,
  lng: number,
  candidateRoads: Road[],
): RoadSnapResult {
  if (candidateRoads.length === 0) {
    return {
      road: null,
      distanceM: null,
      confidence: 0,
      snapped: false,
      warning: "No candidate roads available in this ward.",
    };
  }

  let minDistance = Number.POSITIVE_INFINITY;
  let closestRoad: Road | null = null;

  for (const road of candidateRoads) {
    const d = distToSegment(lat, lng, road.start, road.end);
    if (d < minDistance) {
      minDistance = d;
      closestRoad = road;
    }
  }

  const roundedDistance = Math.round(minDistance * 10) / 10;

  if (minDistance <= ROAD_SNAP_EXCELLENT_DISTANCE_M && closestRoad) {
    return {
      road: closestRoad,
      distanceM: roundedDistance,
      confidence: 0.95,
      snapped: true,
    };
  }

  if (minDistance <= ROAD_SNAP_MAX_DISTANCE_M && closestRoad) {
    return {
      road: closestRoad,
      distanceM: roundedDistance,
      confidence: 0.8,
      snapped: true,
      warning: `Point is ${roundedDistance}m from road segment "${closestRoad.id}".`,
    };
  }

  // Outside 80m threshold: Do NOT snap to road!
  return {
    road: null,
    distanceM: roundedDistance,
    confidence: 0.5,
    snapped: false,
    warning: `Nearest road segment is ${roundedDistance}m away (> ${ROAD_SNAP_MAX_DISTANCE_M}m threshold). Resolved to ward only.`,
  };
}
