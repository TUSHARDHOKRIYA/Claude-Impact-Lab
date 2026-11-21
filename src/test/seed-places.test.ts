import { describe, expect, it } from "vitest";

import { CITY } from "@/lib/city";
import { metersBetween } from "@/lib/geo";
import type { SeedItem } from "@/lib/repo/port";
import { seedItemsForRows, seedRoads, type SeedRow } from "@/lib/seed-roads";
import type { LocationRecord, SeedReport } from "@/lib/types";

const { lat: CENTER_LAT, lng: CENTER_LNG } = CITY.center;
const FAR_LAT = 19.000536;
const FAR_LNG = 72.834779;

function row(overrides: Partial<SeedRow> = {}): SeedRow {
  return {
    id: "rpt_seed_00000001",
    complaintId: "BMC25-000001",
    issueType: "pothole",
    lat: CENTER_LAT,
    lng: CENTER_LNG,
    noticedAt: "2025-06-01",
    recurs: false,
    accident: "none",
    description: "A pothole on this road.",
    ...overrides,
  };
}

function locationsOf(items: SeedItem[]): LocationRecord[] {
  return items.flatMap((item) => (item.entity === "location" ? [item.record] : []));
}

function reportsOf(items: SeedItem[]): SeedReport[] {
  return items.flatMap((item) => (item.entity === "report" ? [item.record] : []));
}

describe("seed places follow the live place rule", () => {
  it("shares one place between two reports of the same problem at the same spot", () => {
    const earliest = row({
      id: "rpt_seed_00000010",
      complaintId: "BMC25-000010",
      noticedAt: "2025-06-01",
    });
    const later = row({
      id: "rpt_seed_00000020",
      complaintId: "BMC25-000020",
      noticedAt: "2025-06-02",
    });
    const items = seedItemsForRows([later, earliest]);

    const locations = locationsOf(items);
    const reports = reportsOf(items);
    expect(locations).toHaveLength(1);
    expect(reports).toHaveLength(2);
    expect(locations[0].id).toBe("loc_seed_00000010");
    expect(locations[0].lat).toBe(earliest.lat);
    expect(locations[0].lng).toBe(earliest.lng);
    expect(locations[0].createdAt).toBe(earliest.noticedAt);
    expect(new Set(reports.map((report) => report.locationId))).toEqual(new Set([locations[0].id]));
    expect(reports.map((report) => report.id).sort()).toEqual([earliest.id, later.id]);
  });

  it("keeps two problems at the same spot as two places", () => {
    const items = seedItemsForRows([
      row({ issueType: "pothole" }),
      row({ id: "rpt_seed_00000002", complaintId: "BMC25-000002", issueType: "waterlogging" }),
    ]);

    const locations = locationsOf(items);
    expect(locations).toHaveLength(2);
    expect(new Set(locations.map((location) => location.issueType))).toEqual(
      new Set(["pothole", "waterlogging"]),
    );
    expect(locations[0].id).not.toBe(locations[1].id);
    expect(reportsOf(items).map((report) => report.locationId).sort()).toEqual(
      locations.map((location) => location.id).sort(),
    );
  });

  it("keeps far-apart reports of the same problem as two places", () => {
    expect(metersBetween(CENTER_LAT, CENTER_LNG, FAR_LAT, FAR_LNG)).toBeGreaterThan(40);
    const items = seedItemsForRows([
      row({ id: "rpt_seed_00000011", complaintId: "BMC25-000011" }),
      row({ id: "rpt_seed_00000012", complaintId: "BMC25-000012", lat: FAR_LAT, lng: FAR_LNG }),
    ]);

    expect(locationsOf(items)).toHaveLength(2);
    expect(reportsOf(items).map((report) => report.locationId).sort()).toEqual(
      locationsOf(items).map((location) => location.id).sort(),
    );
  });

  it("uses the same 40 m radius as a live join, not just an exact coordinate match", () => {
    const nearLat = CENTER_LAT + 0.0002;
    const farLat = CENTER_LAT + 0.0006;
    expect(metersBetween(CENTER_LAT, CENTER_LNG, nearLat, CENTER_LNG)).toBeLessThan(40);
    expect(metersBetween(CENTER_LAT, CENTER_LNG, farLat, CENTER_LNG)).toBeGreaterThan(40);

    const items = seedItemsForRows([
      row({ id: "rpt_seed_00000031", complaintId: "BMC25-000031" }),
      row({ id: "rpt_seed_00000032", complaintId: "BMC25-000032", lat: nearLat }),
      row({ id: "rpt_seed_00000033", complaintId: "BMC25-000033", lat: farLat }),
    ]);

    const locations = locationsOf(items);
    expect(locations).toHaveLength(2);
    const reports = reportsOf(items);
    const near = reports.find((report) => report.id === "rpt_seed_00000032");
    const far = reports.find((report) => report.id === "rpt_seed_00000033");
    expect(near?.locationId).toBe(reports.find((report) => report.id === "rpt_seed_00000031")?.locationId);
    expect(far?.locationId).not.toBe(near?.locationId);
  });

  it("emits the same ids and order on every call", () => {
    expect(seedRoads()).toEqual(seedRoads());
  });

  it("gives every seeded report a location that exists, with fewer places than reports", () => {
    const items = seedRoads();
    const locations = locationsOf(items);
    const reports = reportsOf(items);
    const ids = new Set(locations.map((location) => location.id));

    expect(reports.length).toBeGreaterThan(0);
    expect(locations.length).toBeLessThan(reports.length);
    expect(reports.every((report) => ids.has(report.locationId))).toBe(true);
    expect(new Set(locations.map((location) => location.slug)).size).toBe(locations.length);
  });
});
