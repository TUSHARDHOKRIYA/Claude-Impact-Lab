import { spatialGridKey } from "../resolve/spatial";
import type { NormalizedComplaintRecord } from "../types";

export type ComplaintCandidateIndex = {
  byRoadId: Map<string, NormalizedComplaintRecord[]>;
  bySpatialGrid: Map<string, NormalizedComplaintRecord[]>;
  byWardLocality: Map<string, NormalizedComplaintRecord[]>;
};

/**
 * Builds multi-dimensional spatial and locality buckets for efficient
 * candidate generation, preventing O(N^2) combinatorial scans.
 */
export function buildCandidateIndex(
  complaints: NormalizedComplaintRecord[],
): ComplaintCandidateIndex {
  const byRoadId = new Map<string, NormalizedComplaintRecord[]>();
  const bySpatialGrid = new Map<string, NormalizedComplaintRecord[]>();
  const byWardLocality = new Map<string, NormalizedComplaintRecord[]>();

  for (const c of complaints) {
    // 1. Index by resolved road ID
    if (c.resolution.roadId) {
      const list = byRoadId.get(c.resolution.roadId) ?? [];
      list.push(c);
      byRoadId.set(c.resolution.roadId, list);
    }

    // 2. Index by ~300m spatial grid if GPS is available
    if (c.gps) {
      const gridKey = spatialGridKey(c.gps.lat, c.gps.lng, 300);
      const list = bySpatialGrid.get(gridKey) ?? [];
      list.push(c);
      bySpatialGrid.set(gridKey, list);
    }

    // 3. Index by ward + locality text for non-GPS complaints
    if (c.resolution.ward && c.rawLocality) {
      const locKey = `${c.resolution.ward}:${c.rawLocality.toLowerCase().trim()}`;
      const list = byWardLocality.get(locKey) ?? [];
      list.push(c);
      byWardLocality.set(locKey, list);
    }
  }

  return { byRoadId, bySpatialGrid, byWardLocality };
}
