import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MemoryRastabaazRepository } from "@/lib/repo/memory";
import { setRepositoryForTests } from "@/lib/repo/context";
import { toListItem, type RastabaazRepository } from "@/lib/repo/port";
import { createReport, getMapInsights, getPlacePage, getReportPage, listPlaces, readReportPlace } from "@/lib/queries";
import type { LocationRecord, ReportRecord } from "@/lib/types";

const PHOTO = "data:image/jpeg;base64,/9j/4AAQ";

describe("queries on the memory repository", () => {
  beforeEach(() => {
    setRepositoryForTests(new MemoryRastabaazRepository({ strictPhoto: false }));
  });

  afterEach(() => {
    setRepositoryForTests(null);
  });

  it("assembles a report page from catalog pieces", async () => {
    const created = await createReport({
      issueType: "waterlogging",
      lat: 18.9314,
      lng: 72.8329,
      photo: PHOTO,
      noticedAt: "2026-09-01",
      recurs: true,
            description: "Bags on the edge",
    });
    const page = await getReportPage(created.report.id);
    expect(page?.report).not.toHaveProperty("photo");
    expect(page?.location.id).toBe(created.location.id);
    expect(page?.place.reportCount).toBe(1);
    expect(page?.similar).toEqual([]);
  });

  it("lists similar reports without photos", async () => {
    const first = await createReport({
      issueType: "waterlogging",
      lat: 18.9314,
      lng: 72.8329,
      photo: PHOTO,
      noticedAt: "2026-09-01",
      recurs: true,
            description: "Bags on the edge",
    });
    const second = await createReport({
      issueType: "waterlogging",
      lat: 18.9314,
      lng: 72.8329,
      photo: PHOTO,
      noticedAt: "2026-09-02",
      recurs: true,
            description: "Bags again",
    });
    const page = await getReportPage(second.report.id);
    expect(page?.report).not.toHaveProperty("photo");
    expect(page?.similar).toHaveLength(1);
    expect(page?.similar[0].id).toBe(first.report.id);
    expect(page?.similar[0]).not.toHaveProperty("photo");
  });

  it("counts unresolved places", async () => {
    await createReport({
      issueType: "pothole",
      lat: 18.92855,
      lng: 72.83135,
      photo: PHOTO,
      noticedAt: "2026-09-01",
      recurs: false,
      description: null,
    });
    const places = await listPlaces();
    const insights = await getMapInsights();
    expect(places.length).toBe(1);
    expect(insights.places).toBe(1);
    expect(insights.reports).toBe(1);
    expect(insights.recurringPlaces).toBe(0);
  });

  it("reads a place and a report without the whole catalog", async () => {
    const repo = new MemoryRastabaazRepository({ strictPhoto: false });
    setRepositoryForTests(repo);
    const created = await createReport({
      issueType: "waterlogging",
      lat: 18.9314,
      lng: 72.8329,
      photo: PHOTO,
      noticedAt: "2026-09-01",
      recurs: false,
            description: null,
    });
    const catalog = vi.spyOn(repo, "loadCatalog");
    const place = await getPlacePage(created.location.slug);
    const report = await getReportPage(created.report.id);
    expect(catalog).not.toHaveBeenCalled();
    expect(place?.reports).toHaveLength(1);
    expect(place?.place.reportCount).toBe(1);
    expect(report?.similar).toEqual([]);
    expect(report?.report.photoIsIllustration).toBe(false);
    await repo.updateReport({ id: created.report.id, issueType: "pothole" });
    expect(await getPlacePage(created.location.slug)).toBeNull();
  });
});

function row(id: string, locationId: string, description: string, noticedAt: string): ReportRecord {
  return {
    id,
    locationId,
    issueType: "waterlogging",
    lat: 18.93,
    lng: 72.83,
    noticedAt,
    noticedWindow: null,
    recurs: false,
    description,
    isSample: false,
    createdAt: noticedAt,
  };
}

const location: LocationRecord = {
  id: "loc_1",
  name: "Waste on Rampart Row",
  slug: "rampart-waste",
  issueType: "waterlogging",
  lat: 18.93,
  lng: 72.83,
  street: "Rampart Row",
  ward: "A Ward",
  createdAt: "2026-01-01",
};

describe("readReportPlace", () => {
  it("unions the consistent report with gsi1 and the catalog, and the consistent copy wins", async () => {
    const consistent = row("rpt_new", "loc_1", "from the table", "2026-09-27");
    const stale = toListItem(row("rpt_new", "loc_1", "stale index copy", "2026-09-27"));
    const listedSibling = row("rpt_old", "loc_1", "already listed", "2026-08-01");
    const catalogOnly = row("rpt_cat", "loc_1", "catalog only", "2026-07-01");
    const elsewhere = toListItem(row("rpt_other", "loc_2", "other place", "2026-09-28"));
    const table = new Map([
      [consistent.id, consistent],
      [listedSibling.id, listedSibling],
      [catalogOnly.id, catalogOnly],
    ]);
    const repo = {
      getReport: async (id: string) => table.get(id) ?? null,
      getLocation: async () => location,
      listReportsForLocation: async () => [stale, toListItem(listedSibling)],
      loadCatalog: async () => ({
        locations: [location],
        reports: [stale, toListItem(catalogOnly), elsewhere],
        notes: [],
      }),
    } as unknown as RastabaazRepository;
    const place = await readReportPlace("rpt_new", repo);
    expect(place?.reportCount).toBe(3);
    expect(place?.recurring).toBe(true);
    expect(place?.latestReport?.id).toBe("rpt_new");
    expect(place?.latestReport?.description).toBe("from the table");
  });

  it("drops a moved sibling still listed in both indexes and uses current sibling data", async () => {
    const consistent = row("rpt_new", "loc_1", "from the table", "2026-09-20");
    const staleMoved = toListItem(row("rpt_moved", "loc_1", "old place copy", "2026-09-28"));
    const currentMoved = row("rpt_moved", "loc_2", "now elsewhere", "2026-09-28");
    const staleSibling = toListItem(row("rpt_sib", "loc_1", "stale sibling copy", "2026-09-25"));
    const currentSibling = row("rpt_sib", "loc_1", "current sibling data", "2026-09-25");
    const table = new Map([
      [consistent.id, consistent],
      [currentMoved.id, currentMoved],
      [currentSibling.id, currentSibling],
    ]);
    const repo = {
      getReport: async (id: string) => table.get(id) ?? null,
      getLocation: async () => location,
      listReportsForLocation: async () => [staleMoved, staleSibling],
      loadCatalog: async () => ({
        locations: [location],
        reports: [staleMoved, staleSibling],
        notes: [],
      }),
    } as unknown as RastabaazRepository;
    const place = await readReportPlace("rpt_new", repo);
    expect(place?.reportCount).toBe(2);
    expect(place?.recurring).toBe(true);
    expect(place?.latestReport?.id).toBe("rpt_sib");
    expect(place?.latestReport?.description).toBe("current sibling data");
  });
});
