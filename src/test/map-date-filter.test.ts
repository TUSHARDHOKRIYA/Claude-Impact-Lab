import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { filterByReportedDate, reportedDateBounds, reportedDay } from "@/lib/map-date-filter";
import { listMapPoints, readReportPoint } from "@/lib/queries/reports";
import type { RastabaazRepository } from "@/lib/repo/port";
import type { ReportListItem, ReportRecord } from "@/lib/types";

function point(id: string, reportedAt: string) {
  return { id, reportedAt };
}

describe("reportedDay", () => {
  it("returns a bare date unchanged", () => {
    expect(reportedDay("2025-06-01")).toBe("2025-06-01");
  });

  it("reads an instant on its Kolkata day, not its UTC day", () => {
    // 19:00 UTC on 10 March is 00:30 IST on 11 March.
    expect(reportedDay("2026-03-10T19:00:00.000Z")).toBe("2026-03-11");
    // 18:29 UTC on 10 March is still 23:59 IST on 10 March.
    expect(reportedDay("2026-03-10T18:29:00.000Z")).toBe("2026-03-10");
  });

  it("returns null for values it cannot read", () => {
    expect(reportedDay("")).toBeNull();
    expect(reportedDay("not a date")).toBeNull();
  });
});

describe("filterByReportedDate", () => {
  const points = [
    point("early", "2026-03-01T06:00:00.000Z"),
    point("boundary-start", "2026-03-10T10:00:00.000Z"),
    point("midnight-ist", "2026-03-10T19:00:00.000Z"),
    point("seed", "2025-06-01"),
    point("broken", "garbage"),
  ];

  it("keeps everything when both bounds are null", () => {
    expect(filterByReportedDate(points, null, null).map((p) => p.id)).toEqual([
      "early",
      "boundary-start",
      "midnight-ist",
      "seed",
      "broken",
    ]);
  });

  it("is inclusive at both ends, compared on the Kolkata day", () => {
    // 2026-03-10 at 10:00 UTC and 2026-03-11 at 00:30 IST (19:00 UTC on the 10th).
    const ids = filterByReportedDate(points, "2026-03-10", "2026-03-11").map((p) => p.id);
    expect(ids).toEqual(["boundary-start", "midnight-ist"]);
  });

  it("puts 00:30 IST on the next day, so a to-date of the 10th excludes it", () => {
    const ids = filterByReportedDate(points, "2026-03-01", "2026-03-10").map((p) => p.id);
    expect(ids).toEqual(["early", "boundary-start"]);
  });

  it("applies an open-ended from or to on its own", () => {
    expect(filterByReportedDate(points, "2026-03-10", null).map((p) => p.id)).toEqual([
      "boundary-start",
      "midnight-ist",
    ]);
    expect(filterByReportedDate(points, null, "2025-12-31").map((p) => p.id)).toEqual(["seed"]);
  });

  it("drops unreadable dates once any bound is set", () => {
    expect(filterByReportedDate(points, "2000-01-01", null).map((p) => p.id)).not.toContain("broken");
  });

  it("treats a malformed bound as open", () => {
    expect(filterByReportedDate(points, "10/03/2026", "nope").map((p) => p.id)).toHaveLength(5);
  });

  it("returns a new array and keeps the point objects themselves", () => {
    const kept = filterByReportedDate(points, "2026-03-01", "2026-03-11");
    expect(kept).not.toBe(points);
    expect(kept[0]).toBe(points[0]);
  });
});

describe("reportedDateBounds", () => {
  it("gives the earliest and latest Kolkata day", () => {
    expect(
      reportedDateBounds([
        point("a", "2026-03-10T19:00:00.000Z"),
        point("b", "2025-06-01"),
        point("c", "2026-01-02T08:00:00.000Z"),
      ]),
    ).toEqual({ min: "2025-06-01", max: "2026-03-11" });
  });

  it("skips unreadable dates and returns null when none are readable", () => {
    expect(reportedDateBounds([point("a", "nope"), point("b", "2025-06-01")])).toEqual({
      min: "2025-06-01",
      max: "2025-06-01",
    });
    expect(reportedDateBounds([])).toBeNull();
    expect(reportedDateBounds([point("a", "nope")])).toBeNull();
  });
});

describe("reportedAt on map points", () => {
  function report(partial: Partial<ReportListItem> & Pick<ReportListItem, "id">): ReportListItem {
    return {
      locationId: "loc_1",
      issueType: "pothole",
      lat: 18.93,
      lng: 72.83,
      noticedAt: "2026-02-01",
      noticedWindow: "this_month",
      recurs: false,
      description: null,
      isSample: false,
      photoIsIllustration: false,
      createdAt: "2026-02-03T04:05:06.000Z",
      accident: null,
      ...partial,
    } as ReportListItem;
  }

  function repo(reports: ReportListItem[], records: ReportRecord[] = []): RastabaazRepository {
    return {
      loadCatalog: async () => ({ locations: [], reports, notes: [] }),
      getReport: async (id: string) => records.find((row) => row.id === id) ?? null,
    } as unknown as RastabaazRepository;
  }

  it("takes reportedAt from createdAt, and falls back to noticedAt when it is empty", async () => {
    const r = repo([
      report({ id: "rpt_filed", createdAt: "2026-02-03T04:05:06.000Z" }),
      report({ id: "rpt_seed", noticedAt: "2025-06-01", createdAt: "" }),
    ]);
    const points = await listMapPoints(undefined, r);
    expect(points.find((p) => p.id === "rpt_filed")?.reportedAt).toBe("2026-02-03T04:05:06.000Z");
    expect(points.find((p) => p.id === "rpt_seed")?.reportedAt).toBe("2025-06-01");
  });

  it("gives readReportPoint the same reportedAt as listMapPoints", async () => {
    const record: ReportRecord = {
      id: "rpt_one",
      locationId: "loc_1",
      issueType: "pothole",
      lat: 18.93,
      lng: 72.83,
      noticedAt: "2026-01-10",
      noticedWindow: "this_month",
      recurs: false,
      description: null,
      isSample: false,
      createdAt: "2026-02-03T04:05:06.000Z",
    };
    const r = repo([report({ id: "rpt_one" })], [record]);
    await expect(readReportPoint("rpt_one", r)).resolves.toMatchObject({
      reportedAt: "2026-02-03T04:05:06.000Z",
      noticedAt: "2026-01-10",
    });
  });
});
