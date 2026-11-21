import "server-only";

import { cache } from "react";
import { isReportId } from "@/lib/id";
import { mapInBatches } from "@/lib/queries/batch";
import { loadSharedCatalog } from "@/lib/queries/catalog";
import { getRepository } from "@/lib/repo/context";
import { toListItem, type RastabaazRepository } from "@/lib/repo/port";
import { buildHistory, toPlaceSummary } from "@/lib/place-summary";
import type { Catalog, LocationRecord, PlaceHistoryEvent, PlaceSummary, ReportListItem } from "@/lib/types";

export type PlacePageData = {
  location: LocationRecord;
  place: PlaceSummary;
  reports: ReportListItem[];
  history: PlaceHistoryEvent[];
};

function resolveRepo(repo?: RastabaazRepository): RastabaazRepository {
  return repo ?? getRepository();
}

function reportsFor(locationId: string, catalog: Catalog): ReportListItem[] {
  return catalog.reports.filter((report) => report.locationId === locationId);
}

export function assemblePlace(
  location: LocationRecord,
  catalog: Catalog,
  reports = reportsFor(location.id, catalog),
): PlacePageData {
  return {
    location,
    place: toPlaceSummary(location, reports),
    reports,
    history: buildHistory(reports),
  };
}

/**
 * A place with no reports is not news.
 *
 * The desk changing a report's problem moves it to the place for the new one,
 * and when it was the only report there the old place is left standing empty.
 * Empty places are kept rather than deleted: the row still holds its geo-cell
 * lock slot. Hidden, it costs nothing, and the next report of that problem at
 * that spot joins it and brings it back.
 */
export async function listPlaces(repo?: RastabaazRepository): Promise<PlaceSummary[]> {
  const catalog = await loadSharedCatalog(repo);
  return [...catalog.locations]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((location) => assemblePlace(location, catalog))
    .filter((page) => page.reports.length > 0)
    .map((page) => page.place);
}

/**
 * byType can still name this place after the desk moved the report. Keep a
 * fallback row only when a consistent read says it is still here.
 */
async function confirmedFallback(repo: RastabaazRepository, locationId: string): Promise<ReportListItem[]> {
  const candidates = reportsFor(locationId, await loadSharedCatalog(repo));
  const current = await mapInBatches(candidates, (row) => repo.getReport(row.id));
  return current.flatMap((report) => (report?.locationId === locationId ? [toListItem(report)] : []));
}

function withConsistentReport(reports: ReportListItem[], fresh: ReportListItem): ReportListItem[] {
  return [fresh, ...reports.filter((row) => row.id !== fresh.id)];
}

export const getPlacePage = cache(async function getPlacePage(
  slug: string,
  repo?: RastabaazRepository,
  reportId?: string,
): Promise<PlacePageData | null> {
  const r = resolveRepo(repo);
  const location = await r.getLocationBySlug(slug);
  if (!location) return null;
  let reports = await r.listReportsForLocation(location.id);
  // gsi1 can trail byType for a moment after a new report, and byType is
  // what put this place on the map. Only then is the catalog worth reading.
  if (reports.length === 0) reports = await confirmedFallback(r, location.id);
  // The link from a just-recorded report carries its id. gsi1 may not list it yet.
  if (reportId && isReportId(reportId)) {
    const fresh = await r.getReport(reportId);
    if (fresh?.locationId === location.id) reports = withConsistentReport(reports, toListItem(fresh));
  }
  if (reports.length === 0) return null;
  return {
    location,
    place: toPlaceSummary(location, reports),
    reports,
    history: buildHistory(reports),
  };
});
