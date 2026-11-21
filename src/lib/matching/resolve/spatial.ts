/**
 * Spatial calculation helpers for Mumbai urban coordinates (~19°N, 72.8°E).
 */

export type LatLng = { lat: number; lng: number };

/**
 * Calculates Euclidean distance in metres from a point P to a line segment AB
 * using a local flat-Earth projection centered at the segment midpoint.
 */
export function distToSegment(lat: number, lng: number, a: LatLng, b: LatLng): number {
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
  const projX = ax + t * dx;
  const projY = ay + t * dy;

  return Math.hypot(px - projX, py - projY);
}

/** Great-circle distance between two points in metres using the Haversine formula. */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6_371_000; // Earth radius in metres
  const phi1 = (a.lat * Math.PI) / 180;
  const phi2 = (b.lat * Math.PI) / 180;
  const deltaPhi = ((b.lat - a.lat) * Math.PI) / 180;
  const deltaLambda = ((b.lng - a.lng) * Math.PI) / 180;

  const sinDeltaPhi = Math.sin(deltaPhi / 2);
  const sinDeltaLambda = Math.sin(deltaLambda / 2);

  const term =
    sinDeltaPhi * sinDeltaPhi +
    Math.cos(phi1) * Math.cos(phi2) * sinDeltaLambda * sinDeltaLambda;

  const c = 2 * Math.atan2(Math.sqrt(term), Math.sqrt(1 - term));
  return R * c;
}

/** Generates a discrete spatial grid key (e.g., ~500m cells) for candidate blocking. */
export function spatialGridKey(lat: number, lng: number, cellSizeM = 500): string {
  // Approximate metre conversions at 19°N
  const latStep = cellSizeM / 110_540;
  const lngStep = cellSizeM / (111_320 * Math.cos((19.0 * Math.PI) / 180));

  const latBucket = Math.floor(lat / latStep);
  const lngBucket = Math.floor(lng / lngStep);

  return `${latBucket}:${lngBucket}`;
}
