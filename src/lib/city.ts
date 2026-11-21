import localityRows from "@/lib/geo-data/localities.data.json";
import wardRows from "@/lib/geo-data/wards.data.json";

/**
 * Greater Mumbai, as far as the synthetic ward polygons reach. A pin must fall
 * inside one of the 24 ward polygons, not just inside this box.
 */
export const CITY = {
  name: "Mumbai",
  city: "Mumbai",
  center: { lat: 19.04, lng: 72.86 },
  bounds: {
    north: 19.275,
    south: 18.895,
    west: 72.795,
    east: 72.985,
  },
  defaultZoom: 11,
  /** Zoom once a pin is down, close enough to see which road it is on. */
  pinZoom: 16,
} as const;

export type Landmark = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Other spellings and Devanagari, so "परळ" and "Parel" find the same place. */
  aliases: string[];
};

export type Locality = Landmark & { ward: string };

type WardShape = { code: string; name: string; centroid: [number, number]; ring: [number, number][] };

export const LOCALITIES: Locality[] = localityRows as Locality[];
const WARDS = wardRows as WardShape[];

/** Quick picks on the place step: chronic monsoon trouble spots people name. */
const QUICK_PICK_NAMES = ["Hindmata", "Kings Circle", "Andheri", "Sion", "Kurla", "Dadar"];
export const LANDMARKS: Landmark[] = QUICK_PICK_NAMES.flatMap((name) => {
  const row = LOCALITIES.find((item) => item.name === name);
  return row ? [row] : [];
});

function insideRing(lat: number, lng: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [yi, xi] = ring[i];
    const [yj, xj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The ward code whose polygon holds the point, or null outside the city. */
export function wardAt(lat: number, lng: number): string | null {
  for (const ward of WARDS) if (insideRing(lat, lng, ward.ring)) return ward.code;
  return null;
}

export function wardName(code: string): string {
  return WARDS.find((ward) => ward.code === code)?.name ?? code;
}

export function isInsideCity(lat: number, lng: number): boolean {
  const { bounds } = CITY;
  if (!(lat <= bounds.north && lat >= bounds.south && lng >= bounds.west && lng <= bounds.east)) return false;
  return wardAt(lat, lng) !== null;
}

export function clampToCity(lat: number, lng: number): { lat: number; lng: number } {
  const { bounds } = CITY;
  return {
    lat: Math.min(bounds.north, Math.max(bounds.south, lat)),
    lng: Math.min(bounds.east, Math.max(bounds.west, lng)),
  };
}

/** Localities whose name or alias starts with, then contains, the query. */
export function searchLocalities(query: string, limit = 6): Locality[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const names = (row: Locality) => [row.name, ...row.aliases].map((n) => n.toLowerCase());
  const starts = LOCALITIES.filter((row) => names(row).some((n) => n.startsWith(q)));
  const contains = LOCALITIES.filter((row) => !starts.includes(row) && names(row).some((n) => n.includes(q)));
  return [...starts, ...contains].slice(0, limit);
}

export { clusterKey } from "@/lib/geo";
