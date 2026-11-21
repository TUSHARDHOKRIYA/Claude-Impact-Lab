import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getPlacePage, readReportPlace } from "@/lib/queries";
import { toListItem, type KhabarRepository } from "@/lib/repo/port";
import type { LocationRecord, ReportRecord } from "@/lib/types";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function flush(): Promise<void> {
  for (let i = 0; i < 15; i++) await Promise.resolve();
}

function row(id: string, locationId: string, description: string): ReportRecord {
  return {
    id,
    locationId,
    issueType: "waste",
    lat: 18.93,
    lng: 72.83,
    noticedAt: "2026-09-01",
    noticedWindow: null,
    recurs: false,
    affects: [],
    description,
    isSample: false,
    createdAt: "2026-09-01",
  };
}

const location: LocationRecord = {
  id: "loc_batch",
  name: "Waste on Rampart Row",
  slug: "batch-confirm-waste",
  issueType: "waste",
  lat: 18.93,
  lng: 72.83,
  street: "Rampart Row",
  ward: "A Ward",
  createdAt: "2026-01-01",
};

const siblingIds = Array.from({ length: 10 }, (_, i) => `rpt_b${i}`);

function gatedGetReport(table: Map<string, ReportRecord | null>) {
  const started: string[] = [];
  let inFlight = 0;
  let peak = 0;
  const gates = new Map(siblingIds.map((id) => [id, deferred<ReportRecord | null>()]));
  const getReport = (id: string) => {
    const gate = gates.get(id);
    if (!gate) return Promise.resolve(table.get(id) ?? null);
    started.push(id);
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    return gate.promise.finally(() => {
      inFlight -= 1;
    });
  };
  const release = (ids: string[]) => {
    for (const id of ids) gates.get(id)?.resolve(table.get(id) ?? null);
  };
  return { getReport, started, peak: () => peak, release };
}

describe("sibling confirm batches of 8", () => {
  it("caps getPlacePage catalog fallback at 8 in flight and returns every still-here row", async () => {
    const keep = siblingIds.slice(0, 9).map((id) => row(id, location.id, `live ${id}`));
    const gone = siblingIds[9]!;
    const table = new Map<string, ReportRecord | null>(keep.map((report) => [report.id, report]));
    table.set(gone, null);
    const { getReport, started, peak, release } = gatedGetReport(table);
    const repo = {
      getLocationBySlug: async () => location,
      listReportsForLocation: async () => [],
      loadCatalog: async () => ({
        locations: [location],
        reports: siblingIds.map((id) => toListItem(row(id, location.id, `catalog ${id}`))),
        notes: [],
      }),
      getReport,
    } as unknown as KhabarRepository;
    const pending = getPlacePage(location.slug, repo);
    await flush();
    expect(started).toEqual(siblingIds.slice(0, 8));
    expect(peak()).toBe(8);
    release(started);
    await flush();
    expect(started).toEqual(siblingIds);
    expect(peak()).toBe(8);
    release(siblingIds.slice(8));
    const page = await pending;
    expect(page?.reports.map((report) => report.id)).toEqual(keep.map((report) => report.id));
    expect(page?.reports.every((report) => (report.description ?? "").startsWith("live "))).toBe(true);
    expect(page?.place.reportCount).toBe(9);
  });

  it("caps readReportPlace sibling reads at 8, dedupes both indexes, and keeps the submitted row once", async () => {
    const submitted = { ...row("rpt_new", location.id, "from the table"), noticedAt: "2026-09-27" };
    const keep = siblingIds.slice(0, 9).map((id) => row(id, location.id, `live ${id}`));
    const moved = row(siblingIds[9]!, "loc_elsewhere", "now elsewhere");
    const table = new Map<string, ReportRecord | null>([[submitted.id, submitted], ...keep.map((r) => [r.id, r] as const)]);
    table.set(moved.id, moved);
    const { getReport, started, peak, release } = gatedGetReport(table);
    let submittedReads = 0;
    const repo = {
      getReport: (id: string) => {
        if (id === submitted.id) {
          submittedReads += 1;
          return Promise.resolve(submitted);
        }
        return getReport(id);
      },
      getLocation: async () => location,
      listReportsForLocation: async () => [
        toListItem(submitted),
        ...siblingIds.map((id) => toListItem(row(id, location.id, `listed ${id}`))),
      ],
      loadCatalog: async () => ({
        locations: [location],
        reports: [
          toListItem(submitted),
          ...siblingIds.map((id) => toListItem(row(id, location.id, `catalog ${id}`))),
          toListItem(row(siblingIds[0]!, location.id, "duplicate catalog copy")),
        ],
        notes: [],
      }),
    } as unknown as KhabarRepository;
    const pending = readReportPlace(submitted.id, repo);
    await flush();
    expect(submittedReads).toBe(1);
    expect(started).toEqual(siblingIds.slice(0, 8));
    expect(peak()).toBe(8);
    release(started);
    await flush();
    expect(started).toEqual(siblingIds);
    expect(peak()).toBe(8);
    release(siblingIds.slice(8));
    const place = await pending;
    expect(submittedReads).toBe(1);
    expect(place?.reportCount).toBe(10);
    expect(place?.latestReport?.id).toBe(submitted.id);
    expect(place?.latestReport?.description).toBe("from the table");
  });
});
