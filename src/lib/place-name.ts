import { LOCALITIES, wardAt } from "@/lib/city";
import { metersBetween } from "@/lib/geo";
import roadRows from "@/lib/geo-data/roads.data.json";
import { ISSUE_TYPE_LABELS, type IssueType, type LocationRecord } from "@/lib/types";

/** A pin this close to a mapped road segment is on that road. */
const ROAD_METERS = 250;
/** Localities are neighbourhood centres, so "near" is generous. */
const LOCALITY_METERS = 1500;
const CITY_NAME = "Mumbai";

type LatLng = [number, number];
type RoadSegment = { id: string; name: string; ward: string; a: LatLng; b: LatLng };

const roads = roadRows as RoadSegment[];

function pointToSegmentMeters(lat: number, lng: number, a: LatLng, b: LatLng): number {
  const cos = Math.cos((lat * Math.PI) / 180);
  const x = (longitude: number) => longitude * 111_320 * cos;
  const y = (latitude: number) => latitude * 111_320;
  const px = x(lng);
  const py = y(lat);
  const ax = x(a[1]);
  const ay = y(a[0]);
  const dx = x(b[1]) - ax;
  const dy = y(b[0]) - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** The nearest mapped road segment within 250 m, with its id for the money trail. */
export function nearestRoad(lat: number, lng: number): { id: string; name: string; meters: number } | null {
  let best: { id: string; name: string; meters: number } | null = null;
  for (const road of roads) {
    const meters = pointToSegmentMeters(lat, lng, road.a, road.b);
    if (meters <= ROAD_METERS && (!best || meters < best.meters)) best = { id: road.id, name: road.name, meters };
  }
  return best;
}

/** Nearest named road within 250 m, otherwise the city name. */
export function nearestStreetName(lat: number, lng: number): string {
  return nearestRoad(lat, lng)?.name ?? CITY_NAME;
}

/** Nearest locality within 1.5 km. */
export function nearestLandmarkName(lat: number, lng: number): string | null {
  let best: string | null = null;
  let bestMeters = LOCALITY_METERS;
  for (const locality of LOCALITIES) {
    const meters = metersBetween(lat, lng, locality.lat, locality.lng);
    if (meters < bestMeters) {
      bestMeters = meters;
      best = locality.name;
    }
  }
  return best;
}

export function hasNamedStreet(street: string): boolean {
  return street !== "" && street !== CITY_NAME;
}

export function namePlace(
  issueType: IssueType,
  lat: number,
  lng: number,
): { street: string; landmark: string | null; name: string } {
  const street = nearestStreetName(lat, lng);
  const landmark = nearestLandmarkName(lat, lng);
  const issue = ISSUE_TYPE_LABELS[issueType];
  const name = hasNamedStreet(street)
    ? landmark
      ? `${issue} on ${street}, ${landmark}`
      : `${issue} on ${street}`
    : landmark
      ? `${issue} near ${landmark}`
      : `${issue} in ${CITY_NAME}`;
  return { street, landmark, name };
}

/** A road or locality name for the pin, or the coordinates when nothing is nearby. */
export function describePlace(lat: number, lng: number): string {
  const street = nearestStreetName(lat, lng);
  const landmark = nearestLandmarkName(lat, lng);
  const ward = wardAt(lat, lng);
  const parts = [hasNamedStreet(street) ? street : null, landmark, ward ? `${ward} ward` : null].filter(Boolean);
  return parts.length ? parts.join(", ") : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function reportHeadline(issueLabel: string, street: string): string {
  return hasNamedStreet(street) ? `${issueLabel} on ${street}` : `${issueLabel} in ${CITY_NAME}`;
}

/** Stored places are kept as written. Kept for the read path's contract. */
export function repairStoredPlace(location: LocationRecord): LocationRecord {
  return location;
}
