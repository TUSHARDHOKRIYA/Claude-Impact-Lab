import { isInsideCity, wardAt } from "@/lib/city";
import type { Road } from "@/lib/rupee/types";
import { STANDARD_WARDS } from "@/lib/rupee/validation/rules";
import type { LocationResolution } from "../types";
import { resolveLocality } from "./locality";
import { snapGpsToRoad } from "./road";

export type LocationResolverContext = {
  roadsByWard: Map<string, Road[]>;
};

export type RawLocationInput = {
  lat: number | null | undefined;
  lng: number | null | undefined;
  localityText: string | null | undefined;
  wardCode: string | null | undefined;
};

/**
 * Resolves location following strict 5-level priority:
 * 1. Reliable GPS coordinates with proximity road snapping.
 * 2. Exact locality alias match.
 * 3. Fuzzy locality alias match with confidence explanation.
 * 4. Ward-only fallback.
 * 5. Unresolved location.
 */
export function resolveLocation(
  input: RawLocationInput,
  ctx: LocationResolverContext,
): LocationResolution {
  const warnings: string[] = [];

  // Priority 1: Reliable GPS coordinates
  if (input.lat != null && input.lng != null && Number.isFinite(input.lat) && Number.isFinite(input.lng)) {
    const lat = input.lat;
    const lng = input.lng;

    if (isInsideCity(lat, lng)) {
      const detectedWard = wardAt(lat, lng) ?? input.wardCode ?? null;
      const candidateRoads = detectedWard ? ctx.roadsByWard.get(detectedWard) ?? [] : [];
      const snap = snapGpsToRoad(lat, lng, candidateRoads);

      if (snap.warning) warnings.push(snap.warning);

      if (snap.snapped && snap.road) {
        return {
          roadId: snap.road.id,
          roadName: snap.road.name,
          ward: snap.road.ward,
          locality: input.localityText?.trim() ?? null,
          distanceToRoadM: snap.distanceM,
          method: "gps_road_snap",
          confidence: snap.confidence,
          warnings,
        };
      }

      // GPS inside city but beyond road snap threshold
      return {
        roadId: null,
        roadName: null,
        ward: detectedWard,
        locality: input.localityText?.trim() ?? null,
        distanceToRoadM: snap.distanceM,
        method: "gps_ward_only",
        confidence: 0.65,
        warnings,
      };
    }

    warnings.push(`GPS (${lat}, ${lng}) falls outside municipal ward boundaries.`);
  }

  // Priority 2 & 3: Locality alias resolution (Exact & Fuzzy)
  const locMatch = resolveLocality(input.localityText);
  if (locMatch) {
    const resolvedWard = locMatch.locality.ward;
    warnings.push(locMatch.explanation);

    if (locMatch.matchType === "exact") {
      return {
        roadId: null,
        roadName: null,
        ward: resolvedWard,
        locality: locMatch.locality.name,
        distanceToRoadM: null,
        method: "exact_locality",
        confidence: 0.85,
        warnings,
      };
    }

    // Fuzzy locality match
    return {
      roadId: null,
      roadName: null,
      ward: resolvedWard,
      locality: locMatch.locality.name,
      distanceToRoadM: null,
      method: "fuzzy_locality",
      confidence: locMatch.confidence,
      warnings,
    };
  }

  // Priority 4: Ward-only resolution
  if (input.wardCode && STANDARD_WARDS.has(input.wardCode.trim().toUpperCase())) {
    const cleanWard = input.wardCode.trim().toUpperCase();
    warnings.push(`Resolved solely from reported ward code "${cleanWard}".`);
    return {
      roadId: null,
      roadName: null,
      ward: cleanWard,
      locality: input.localityText?.trim() || null,
      distanceToRoadM: null,
      method: "ward_fallback",
      confidence: 0.45,
      warnings,
    };
  }

  // Priority 5: Unresolved
  warnings.push("Could not resolve location from GPS, locality gazetteer, or ward code.");
  return {
    roadId: null,
    roadName: null,
    ward: null,
    locality: input.localityText?.trim() || null,
    distanceToRoadM: null,
    method: "unresolved",
    confidence: 0.0,
    warnings,
  };
}
