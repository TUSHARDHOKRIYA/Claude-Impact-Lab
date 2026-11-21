import "server-only";

import { cache } from "react";
import { isReportId } from "@/lib/id";
import { mapInBatches } from "@/lib/queries/batch";
import { loadSharedCatalog } from "@/lib/queries/catalog";
import { getRepository } from "@/lib/repo/context";
import { toListItem, type KhabarRepository } from "@/lib/repo/port";
import { buildHistory, toPlaceSummary } from "@/lib/place-summary";
import type {
  DeskNote,
  IssueType,
  MapReportPoint,
  PlaceSummary,
  ReportListItem,
  ReportPageData,
} from "@/lib/types";

function resolveRepo(repo?: KhabarRepository): KhabarRepository {
  return repo ?? getRepository();
}

export async function listMapPoints(
  filters?: { issueType?: IssueType; since?: string },
  repo?: KhabarRepository,
): Promise<MapReportPoint[]> {
  const catalog = await loadSharedCatalog(repo);
  return catalog.reports
    .filter((report) => {
      if (filters?.issueType && report.issueType !== filters.issueType) return false;
      if (filters?.since) {
        if (report.noticedWindow === "over_six_months") return false;
        if (report.noticedAt < filters.since) return false;
      }
      return true;
    })
    .sort((a, b) => b.noticedAt.localeCompare(a.noticedAt))
    .map(({ id, locationId, lat, lng, issueType, noticedAt, noticedWindow }) => ({
      id,
      locationId,
      lat,
      lng,
      issueType,
      noticedAt,
      noticedWindow,
    }));
}

export async function listAllReports(repo?: KhabarRepository): Promise<ReportListItem[]> {
  const catalog = await loadSharedCatalog(repo);
  return [...catalog.reports].sort((a, b) => b.noticedAt.localeCompare(a.noticedAt));
}

export async function listNotesByReport(repo?: KhabarRepository): Promise<Map<string, DeskNote[]>> {
  const catalog = await loadSharedCatalog(repo);
  const grouped = new Map<string, DeskNote[]>();
  const notes = [...catalog.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const note of notes) {
    const list = grouped.get(note.reportId) ?? [];
    list.push(note);
    grouped.set(note.reportId, list);
  }
  return grouped;
}

/**
 * Indexes can each miss the row or still name a sibling the desk has moved.
 * Confirm every indexed id against the table, keep only rows still here, and
 * write the consistent report last so it wins a tie on id.
 */
async function unionPlaceReports(
  repo: KhabarRepository,
  locationId: string,
  consistent: ReportListItem,
  listed: ReportListItem[],
  fromCatalog: ReportListItem[],
): Promise<ReportListItem[]> {
  const ids = [...new Set([...fromCatalog, ...listed].map((row) => row.id))].filter(
    (id) => id !== consistent.id,
  );
  const confirmed = await mapInBatches(ids, (id) => repo.getReport(id));
  const byId = new Map<string, ReportListItem>();
  for (const current of confirmed) {
    if (current?.locationId === locationId) byId.set(current.id, toListItem(current));
  }
  byId.set(consistent.id, consistent);
  return [...byId.values()];
}

/**
 * The place a just-recorded report belongs to. The map catalog and the place's
 * gsi1 list are both eventually consistent, so either can omit the new report
 * or still be counting the ones already there. The union is what the preview,
 * the counts and the insight strip have to show.
 */
export async function readReportPlace(id: string, repo?: KhabarRepository): Promise<PlaceSummary | null> {
  if (!isReportId(id)) return null;
  const r = resolveRepo(repo);
  const report = await r.getReport(id);
  if (!report) return null;
  const location = await r.getLocation(report.locationId);
  if (!location) return null;
  const [listed, catalog] = await Promise.all([
    r.listReportsForLocation(location.id),
    loadSharedCatalog(r),
  ]);
  const fromCatalog = catalog.reports.filter((row) => row.locationId === location.id);
  const reports = await unionPlaceReports(r, location.id, toListItem(report), listed, fromCatalog);
  return toPlaceSummary(location, reports);
}

export async function readReportPoint(id: string, repo?: KhabarRepository): Promise<MapReportPoint | null> {
  if (!isReportId(id)) return null;
  const report = await resolveRepo(repo).getReport(id);
  if (!report) return null;
  return {
    id: report.id,
    locationId: report.locationId,
    lat: report.lat,
    lng: report.lng,
    issueType: report.issueType,
    noticedAt: report.noticedAt,
    noticedWindow: report.noticedWindow,
  };
}

export const getReportPage = cache(async function getReportPage(
  id: string,
  repo?: KhabarRepository,
): Promise<ReportPageData | null> {
  if (!isReportId(id)) return null;
  const r = resolveRepo(repo);
  const report = await r.getReport(id);
  if (!report) return null;
  const location = await r.getLocation(report.locationId);
  if (!location) return null;
  const listed = await r.listReportsForLocation(location.id);
  const publicReport = toListItem(report);
  const reports = listed.some((row) => row.id === report.id) ? listed : [publicReport, ...listed];
  const similar = reports.filter((other) => other.id !== report.id);
  return {
    report: publicReport,
    location,
    place: toPlaceSummary(location, reports),
    similar,
    history: buildHistory(reports),
    connectedCount: similar.length,
  };
});
