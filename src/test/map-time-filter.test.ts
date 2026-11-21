import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { filterMapPoints } from "@/components/map/MapFilters";
import { listMapPoints, readReportPoint } from "@/lib/queries/reports";
import type { RastabaazRepository } from "@/lib/repo/port";
import type { MapReportPoint, ReportListItem, ReportRecord } from "@/lib/types";

function item(partial: Partial<ReportListItem> & Pick<ReportListItem, "id">): ReportListItem {
  return {
    locationId: "loc_1",
    issueType: "pothole",
    lat: 18.93,
    lng: 72.83,
    noticedAt: "2026-09-01",
    noticedWindow: "this_week",
    recurs: false,
    description: null,
    isSample: false,
    photoIsIllustration: false,
    createdAt: "2026-09-01",
    ...partial,
  };
}

function repo(reports: ReportListItem[], records: ReportRecord[] = []): RastabaazRepository {
  return {
    loadCatalog: async () => ({ locations: [], reports, notes: [] }),
    getReport: async (id: string) => records.find((row) => row.id === id) ?? null,
  } as unknown as RastabaazRepository;
}

function ids(points: MapReportPoint[]): string[] {
  return points.map((point) => point.id);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-27T06:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("map issue and reported-date filtering", () => {
  const legacy: MapReportPoint = {
    id: "rpt_legacy",
    locationId: "loc_1",
    lat: 18.93,
    lng: 72.83,
    issueType: "pothole",
    noticedAt: "2026-08-15",
    reportedAt: "2026-08-15",
  };

  it("carries noticedWindow on listMapPoints and readReportPoint", async () => {
    const record: ReportRecord = {
      id: "rpt_window",
      locationId: "loc_1",
      issueType: "pothole",
      lat: 18.93,
      lng: 72.83,
      noticedAt: "2026-01-01",
      noticedWindow: "over_six_months",
      recurs: false,
      description: null,
      isSample: false,
      createdAt: "2026-09-01",
    };
    const listed = item({
      id: "rpt_window",
      noticedAt: "2026-01-01",
      noticedWindow: "over_six_months",
    });
    const r = repo([listed, item({ id: "rpt_null", noticedWindow: null })], [record]);
    const points = await listMapPoints(undefined, r);
    expect(points.find((point) => point.id === "rpt_window")?.noticedWindow).toBe("over_six_months");
    expect(points.find((point) => point.id === "rpt_null")?.noticedWindow).toBeNull();
    await expect(readReportPoint("rpt_window", r)).resolves.toMatchObject({
      id: "rpt_window",
      noticedWindow: "over_six_months",
    });
  });

  it("filters map points by issue and reported-date range together", () => {
    const points: MapReportPoint[] = [
      { ...legacy, id: "rpt_aug", reportedAt: "2026-08-15" },
      { ...legacy, id: "rpt_sep", reportedAt: "2026-09-01" },
      { ...legacy, id: "rpt_jan", reportedAt: "2026-01-01" },
      { ...legacy, id: "rpt_light", reportedAt: "2026-08-20", issueType: "waterlogging" },
      { ...legacy, id: "rpt_broken", reportedAt: "garbage" },
    ];
    // No bounds keeps every point, including unreadable dates.
    expect(ids(filterMapPoints(points, "all")).sort()).toEqual([
      "rpt_aug", "rpt_broken", "rpt_jan", "rpt_light", "rpt_sep",
    ]);
    expect(ids(filterMapPoints(points, "all", { from: "2026-08-01", to: "2026-08-31" })).sort()).toEqual([
      "rpt_aug", "rpt_light",
    ]);
    expect(ids(filterMapPoints(points, "waterlogging", { from: "2026-08-01", to: null }))).toEqual([
      "rpt_light",
    ]);
    expect(ids(filterMapPoints(points, "pothole", { from: "2026-09-01", to: null }))).toEqual(["rpt_sep"]);
    expect(ids(filterMapPoints(points, "all", { from: null, to: "2026-01-31" }))).toEqual(["rpt_jan"]);
  });
});
