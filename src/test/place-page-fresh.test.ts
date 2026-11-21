import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { CITY } from "@/lib/city";
import { getPlacePage } from "@/lib/queries";
import { setRepositoryForTests } from "@/lib/repo/context";
import { MemoryRastabaazRepository } from "@/lib/repo/memory";
import { toListItem, type RastabaazRepository } from "@/lib/repo/port";
import type { CreateReportInput, LocationRecord, ReportRecord } from "@/lib/types";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function submission(overrides: Partial<CreateReportInput> = {}): CreateReportInput {
  return {
    issueType: "pothole",
    lat: CITY.center.lat,
    lng: CITY.center.lng,
    photo: "data:image/jpeg;base64,/9j/4AAQ",
    noticedAt: "2026-09-01",
    recurs: false,
        description: "Loose stones",
    ...overrides,
  };
}

describe("getPlacePage just after a report is recorded", () => {
  let repo: MemoryRastabaazRepository;

  beforeEach(() => {
    repo = new MemoryRastabaazRepository({ strictPhoto: false });
    setRepositoryForTests(repo);
  });

  afterEach(() => {
    setRepositoryForTests(null);
  });

  it("merges a fresh report the location index has not listed, and the consistent copy wins", async () => {
    const first = await repo.createReport(submission({ description: "First", noticedAt: "2026-09-01" }));
    const second = await repo.createReport(submission({ description: "from the table", noticedAt: "2026-09-02" }));
    const stale = { ...toListItem(second.report), description: "stale index copy" };
    vi.spyOn(repo, "listReportsForLocation").mockResolvedValue([toListItem(first.report), stale]);
    const page = await getPlacePage(first.location.slug, repo, second.report.id);
    expect(page?.place.reportCount).toBe(2);
    expect(page?.reports.find((row) => row.id === second.report.id)?.description).toBe("from the table");
  });

  it("opens a new place from the consistent report when both indexes are empty", async () => {
    const created = await repo.createReport(submission());
    vi.spyOn(repo, "listReportsForLocation").mockResolvedValue([]);
    vi.spyOn(repo, "loadCatalog").mockResolvedValue({
      locations: [created.location],
      reports: [],
      notes: [],
    });
    const page = await getPlacePage(created.location.slug, repo, created.report.id);
    expect(page?.reports.map((row) => row.id)).toEqual([created.report.id]);
    expect(await getPlacePage(created.location.slug, repo)).toBeNull();
  });

  it("drops a catalog fallback row whose report has moved", async () => {
    const created = await repo.createReport(submission({ issueType: "pothole" }));
    await repo.updateReport({ id: created.report.id, issueType: "waterlogging" });
    const moved = await repo.getReport(created.report.id);
    expect(moved?.locationId === created.location.id).toBe(false);
    vi.spyOn(repo, "listReportsForLocation").mockResolvedValue([]);
    vi.spyOn(repo, "loadCatalog").mockResolvedValue({
      locations: [created.location],
      reports: [{ ...toListItem(moved!), locationId: created.location.id }],
      notes: [],
    });
    expect(await getPlacePage(created.location.slug, repo)).toBeNull();
  });

  it("ignores a malformed report id", async () => {
    const created = await repo.createReport(submission());
    const getReport = vi.spyOn(repo, "getReport");
    const page = await getPlacePage(created.location.slug, repo, "not-an-id");
    expect(page?.reports).toHaveLength(1);
    expect(getReport).not.toHaveBeenCalled();
  });
});

function fallbackRow(id: string, locationId: string, description: string): ReportRecord {
  return {
    id,
    locationId,
    issueType: "waterlogging",
    lat: 18.93,
    lng: 72.83,
    noticedAt: "2026-09-01",
    noticedWindow: null,
    recurs: false,
    description,
    isSample: false,
    createdAt: "2026-09-01",
  };
}

const fallbackLocation: LocationRecord = {
  id: "loc_fallback",
  name: "Waste on Rampart Row",
  slug: "fallback-concurrent-waste",
  issueType: "waterlogging",
  lat: 18.93,
  lng: 72.83,
  street: "Rampart Row",
  ward: "A Ward",
  createdAt: "2026-01-01",
};

describe("getPlacePage catalog fallback confirmation", () => {
  it("starts every candidate getReport before any resolves, and drops missing or moved rows", async () => {
    const keep = fallbackRow("rpt_keep", fallbackLocation.id, "from the table");
    const staleKeep = { ...toListItem(keep), description: "catalog copy" };
    const gone = toListItem(fallbackRow("rpt_gone", fallbackLocation.id, "deleted copy"));
    const movedStale = toListItem(fallbackRow("rpt_moved", fallbackLocation.id, "old place copy"));
    const movedCurrent = fallbackRow("rpt_moved", "loc_elsewhere", "now elsewhere");
    const started: string[] = [];
    const gates = {
      rpt_keep: deferred<ReportRecord | null>(),
      rpt_gone: deferred<ReportRecord | null>(),
      rpt_moved: deferred<ReportRecord | null>(),
    };
    const repo = {
      getLocationBySlug: async () => fallbackLocation,
      listReportsForLocation: async () => [],
      loadCatalog: async () => ({
        locations: [fallbackLocation],
        reports: [staleKeep, gone, movedStale],
        notes: [],
      }),
      getReport: (id: string) => {
        started.push(id);
        return gates[id as keyof typeof gates].promise;
      },
    } as unknown as RastabaazRepository;
    const pending = getPlacePage(fallbackLocation.slug, repo);
    for (let i = 0; i < 15; i++) await Promise.resolve();
    expect(started).toEqual(["rpt_keep", "rpt_gone", "rpt_moved"]);
    gates.rpt_keep.resolve(keep);
    gates.rpt_gone.resolve(null);
    gates.rpt_moved.resolve(movedCurrent);
    const page = await pending;
    expect(page?.reports.map((row) => row.id)).toEqual(["rpt_keep"]);
    expect(page?.reports[0]?.description).toBe("from the table");
    expect(page?.place.reportCount).toBe(1);
  });
});
