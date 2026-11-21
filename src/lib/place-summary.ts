import type {
  LocationRecord,
  PlaceHistoryEvent,
  PlaceSummary,
  ReportListItem,
} from "@/lib/types";

function latestFirst(reports: ReportListItem[]): ReportListItem[] {
  return [...reports].sort((a, b) => b.noticedAt.localeCompare(a.noticedAt));
}

export function toPlaceSummary(location: LocationRecord, reports: ReportListItem[]): PlaceSummary {
  const ordered = latestFirst(reports);
  return {
    location,
    reportCount: reports.length,
    recurring: reports.length >= 2 || reports.some((report) => report.recurs),
    latestReport: ordered[0] ?? null,
  };
}

export function buildHistory(reports: ReportListItem[]): PlaceHistoryEvent[] {
  return reports
    .map((report) => ({
      id: `report-${report.id}`,
      at: report.noticedAt,
      kind: "report" as const,
      title: "Street report",
      body: report.description ?? "A person recorded a condition here.",
      href: `/reports/${report.id}`,
      noticedWindow: report.noticedWindow,
      createdAt: report.createdAt,
    }))
    .sort((a, b) => b.at.localeCompare(a.at));
}
