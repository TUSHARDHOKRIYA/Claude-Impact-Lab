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

describe("map time filtering", () => {
  const recent = item({ id: "rpt_recent", noticedAt: "2026-09-01", noticedWindow: "this_week" });
  const overSix = item({
    id: "rpt_old_window",
    noticedAt: "2026-01-01",
    noticedWindow: "over_six_months",
  });
  const sixYears = item({ id: "rpt_dated", noticedAt: "2018-01-01", noticedWindow: null });
  const lighting = item({
    id: "rpt_light",
    issueType: "waterlogging",
    noticedAt: "2026-08-01",
    noticedWindow: "this_month",
  });
  const legacy: MapReportPoint = {
    id: "rpt_legacy",
    locationId: "loc_1",
    lat: 18.93,
    lng: 72.83,
    issueType: "pothole",
    noticedAt: "2026-08-15",
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

  it("keeps over_six_months reports in All time only, on both projection paths", async () => {
    const r = repo([recent, overSix, sixYears, lighting]);
    const all = await listMapPoints(undefined, r);
    expect(ids(all).sort()).toEqual(["rpt_dated", "rpt_light", "rpt_old_window", "rpt_recent"]);
    const year = await listMapPoints({ since: "2025-09-27" }, r);
    expect(ids(year).sort()).toEqual(["rpt_light", "rpt_recent"]);
    const five = await listMapPoints({ since: "2021-09-27" }, r);
    expect(ids(five).sort()).toEqual(["rpt_light", "rpt_recent"]);
    const wasteYear = await listMapPoints({ issueType: "pothole", since: "2025-09-27" }, r);
    expect(ids(wasteYear)).toEqual(["rpt_recent"]);

    const points: MapReportPoint[] = [...all, legacy];
    expect(ids(filterMapPoints(points, "all", "all")).sort()).toEqual(
      ["rpt_dated", "rpt_legacy", "rpt_light", "rpt_old_window", "rpt_recent"],
    );
    expect(ids(filterMapPoints(points, "all", "1y")).sort()).toEqual(["rpt_legacy", "rpt_light", "rpt_recent"]);
    expect(ids(filterMapPoints(points, "all", "5y")).sort()).toEqual(["rpt_legacy", "rpt_light", "rpt_recent"]);
    expect(ids(filterMapPoints(points, "waterlogging", "1y"))).toEqual(["rpt_light"]);
    expect(ids(filterMapPoints(points, "pothole", "all")).sort()).toEqual([
      "rpt_dated",
      "rpt_legacy",
      "rpt_old_window",
      "rpt_recent",
    ]);
  });
});
