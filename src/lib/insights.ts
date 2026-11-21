import "server-only";

import { listPlaces } from "@/lib/queries/places";
import type { RastabaazRepository } from "@/lib/repo/port";
import type { MapInsightCounts, PlaceSummary } from "@/lib/types";

export function insightsFromPlaces(places: PlaceSummary[]): MapInsightCounts {
  return {
    reports: places.reduce((total, place) => total + place.reportCount, 0),
    places: places.length,
    recurringPlaces: places.filter((place) => place.recurring).length,
  };
}

export async function getMapInsights(repo?: RastabaazRepository): Promise<MapInsightCounts> {
  return insightsFromPlaces(await listPlaces(repo));
}
