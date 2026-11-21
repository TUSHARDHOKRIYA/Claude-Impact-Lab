export const MATCH_METERS = 40;
export const CLUSTER_GRID = 0.00028;
const NEIGHBOUR_STEPS = 2;

export function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const radius = 6371000;
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function clusterKey(lat: number, lng: number): string {
  const grid = CLUSTER_GRID;
  return `${(Math.round(lat / grid) * grid).toFixed(5)}:${(Math.round(lng / grid) * grid).toFixed(5)}`;
}

export function neighbourClusterKeys(lat: number, lng: number): string[] {
  const keys = new Set<string>();
  for (let dLat = -NEIGHBOUR_STEPS; dLat <= NEIGHBOUR_STEPS; dLat += 1) {
    for (let dLng = -NEIGHBOUR_STEPS; dLng <= NEIGHBOUR_STEPS; dLng += 1) {
      keys.add(clusterKey(lat + dLat * CLUSTER_GRID, lng + dLng * CLUSTER_GRID));
    }
  }
  return [...keys];
}

type IssueSpot = { lat: number; lng: number; issueType: string };

/**
 * The one "does this pin join this place?" rule. A place keeps the point of
 * its first report; a pin joins it only if it is the same problem within
 * MATCH_METERS of that point, and the nearest such place wins. Callers may
 * narrow the candidates with `neighbourClusterKeys`, but must not change the
 * match itself — live writes and seed grouping share this function so they
 * cannot disagree about what a place is.
 */
export function nearestMatching<T extends IssueSpot>(
  candidates: Iterable<T>,
  lat: number,
  lng: number,
  issueType: string,
): T | null {
  let best: T | null = null;
  let bestMetres = Infinity;
  for (const candidate of candidates) {
    if (candidate.issueType !== issueType) continue;
    const metres = metersBetween(lat, lng, candidate.lat, candidate.lng);
    if (metres > MATCH_METERS || metres >= bestMetres) continue;
    best = candidate;
    bestMetres = metres;
  }
  return best;
}
