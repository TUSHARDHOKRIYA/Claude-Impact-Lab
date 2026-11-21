import { isInsideCity, wardAt } from "@/lib/city";

/** One place from the Photon geocoder, already limited to the city. */
export type PlaceHit = {
  id: string;
  name: string;
  detail: string;
  /** BMC ward code from the ward polygons, or null. */
  ward: string | null;
  lat: number;
  lng: number;
};

export const PHOTON_URL = "https://photon.komoot.io/api/";
/** minLon,minLat,maxLon,maxLat around Greater Mumbai. */
export const PLACE_BBOX = "72.77,18.89,73.05,19.28";
const UPSTREAM_LIMIT = 8;
export const MAX_PLACE_RESULTS = 6;
export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 80;
const UPSTREAM_TIMEOUT_MS = 4000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_CAP = 200;
const USER_AGENT = "rastabaaz-place-search";

type Deps = { fetch?: typeof fetch; now?: () => number };
type CacheEntry = { at: number; hits: PlaceHit[] };

const cache = new Map<string, CacheEntry>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A trimmed string with content, or "" for anything else. */
function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** The trimmed query when its length is in range, otherwise null. */
export function normalizePlaceQuery(raw: string): string | null {
  const q = raw.trim();
  if (q.length < MIN_QUERY_LENGTH || q.length > MAX_QUERY_LENGTH) return null;
  return q;
}

/** Street, locality and district, skipping empties, repeats and the name itself. */
function detailOf(name: string, props: Record<string, unknown>): string {
  const seen = new Set([name.toLowerCase()]);
  const parts: string[] = [];
  for (const part of [props.street, props.locality, props.district].map(text)) {
    const key = part.toLowerCase();
    if (!part || seen.has(key)) continue;
    seen.add(key);
    parts.push(part);
  }
  return parts.join(", ");
}

function idOf(props: Record<string, unknown>, lat: number, lng: number): string {
  const osmType = text(props.osm_type);
  const osmId = props.osm_id;
  const hasOsmId = typeof osmId === "number" || (typeof osmId === "string" && osmId.length > 0);
  if (osmType && hasOsmId) return `${osmType}${osmId}`;
  return `pt:${lat.toFixed(5)},${lng.toFixed(5)}`;
}

/** One GeoJSON feature to a hit, or null when it is unnamed, off the map or outside the city. */
function toHit(feature: unknown): PlaceHit | null {
  if (!isRecord(feature) || !isRecord(feature.geometry)) return null;
  const coords = feature.geometry.coordinates;
  if (!Array.isArray(coords)) return null;
  const [lng, lat] = coords;
  if (typeof lng !== "number" || typeof lat !== "number") return null;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  const props = isRecord(feature.properties) ? feature.properties : {};
  const name = text(props.name);
  if (!name || !isInsideCity(lat, lng)) return null;

  return {
    id: idOf(props, lat, lng),
    name,
    detail: detailOf(name, props),
    ward: wardAt(lat, lng),
    lat,
    lng,
  };
}

/**
 * Pure mapping from a Photon FeatureCollection to place hits. Drops unnamed
 * features and anything outside the city, merges repeats of the same name at
 * the same spot (about 110 m), and keeps at most MAX_PLACE_RESULTS.
 */
export function mapPhotonCollection(json: unknown): PlaceHit[] {
  const features = isRecord(json) && Array.isArray(json.features) ? json.features : [];
  const seen = new Set<string>();
  const hits: PlaceHit[] = [];
  for (const feature of features) {
    if (hits.length >= MAX_PLACE_RESULTS) break;
    const hit = toHit(feature);
    if (!hit) continue;
    const key = `${hit.name.toLowerCase()}|${hit.lat.toFixed(3)}|${hit.lng.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push(hit);
  }
  return hits;
}

/** Photon's JSON, or null on any transport, status or parse failure. Never throws. */
async function fetchPhoton(q: string, doFetch: typeof fetch): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const url = `${PHOTON_URL}?q=${encodeURIComponent(q)}&bbox=${PLACE_BBOX}&limit=${UPSTREAM_LIMIT}&lang=en`;
    const res = await doFetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function remember(key: string, entry: CacheEntry): void {
  if (!cache.has(key) && cache.size >= CACHE_CAP) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, entry);
}

/**
 * Place search for the report form. Answers from a 10-minute cache keyed by
 * the lowercased query. Upstream failures return [] and are not cached.
 */
export async function searchPlaces(raw: string, deps: Deps = {}): Promise<PlaceHit[]> {
  const q = normalizePlaceQuery(raw);
  if (!q) return [];
  const key = q.toLowerCase();
  const now = (deps.now ?? Date.now)();
  const cached = cache.get(key);
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.hits;
  if (cached) cache.delete(key);

  const json = await fetchPhoton(q, deps.fetch ?? fetch);
  if (json === null) return [];
  const hits = mapPhotonCollection(json);
  remember(key, { at: now, hits });
  return hits;
}

export function clearPlaceSearchCache(): void {
  cache.clear();
}
