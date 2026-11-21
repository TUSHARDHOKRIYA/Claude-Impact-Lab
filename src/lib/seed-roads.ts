import { wardAt } from "@/lib/city";
import seedRows from "@/lib/geo-data/seed-reports.data.json";
import { slugify } from "@/lib/id";
import { namePlace, nearestRoad } from "@/lib/place-name";
import type { SeedItem } from "@/lib/repo/port";
import type { AccidentSeen, IssueType, LocationRecord, SeedReport } from "@/lib/types";

type SeedRow = {
  id: string;
  complaintId: string;
  issueType: IssueType;
  lat: number;
  lng: number;
  noticedAt: string;
  recurs: boolean;
  accident: AccidentSeen;
  description: string;
};

/** Drawn stand-ins. Seeded reports never carry a real photo. */
const PHOTO: Record<IssueType, string> = {
  pothole: "/samples/road.svg",
  waterlogging: "/samples/drainage.svg",
  open_manhole: "/samples/obstruction.svg",
  choked_drain: "/samples/drainage.svg",
  road_cave_in: "/samples/road.svg",
  broken_paver_blocks: "/samples/paving.svg",
  other: "/samples/road.svg",
};

/**
 * Seeded reports are app complaints from the synthetic dataset
 * (`data/rupee/complaints.csv`), up to four per ward. Built by
 * `node scripts/build-geo.mjs`.
 */
export function seedRoads(): SeedItem[] {
  const items: SeedItem[] = [];
  for (const row of seedRows as SeedRow[]) {
    if (!wardAt(row.lat, row.lng)) continue;
    const named = namePlace(row.issueType, row.lat, row.lng);
    const locationId = `loc_${row.id.slice(4)}`;
    const location: LocationRecord = {
      id: locationId,
      name: named.name,
      slug: slugify(`${named.street} ${row.complaintId}`),
      issueType: row.issueType,
      lat: row.lat,
      lng: row.lng,
      street: named.street,
      ward: wardAt(row.lat, row.lng) ?? "",
      roadId: nearestRoad(row.lat, row.lng)?.id ?? null,
      createdAt: row.noticedAt,
    };
    const report: SeedReport = {
      id: row.id,
      locationId,
      issueType: row.issueType,
      lat: row.lat,
      lng: row.lng,
      photo: PHOTO[row.issueType],
      noticedAt: row.noticedAt,
      noticedWindow: null,
      recurs: row.recurs,
      accident: row.accident,
      description: row.description,
      isSample: true,
      createdAt: row.noticedAt,
    };
    items.push({ entity: "location", record: location }, { entity: "report", record: report });
  }
  return items;
}
