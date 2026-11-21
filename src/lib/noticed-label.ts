import { formatDay } from "@/lib/format";
import { kolkataDayStamp } from "@/lib/noticed-date";
import type { NoticedWindow } from "@/lib/types";

type Noticed = {
  noticedAt: string;
  noticedWindow: NoticedWindow | null;
  /** Recorded instant. Windowed copy anchors here, never to the sort estimate. */
  createdAt: string;
};

function windowPhrase(window: NoticedWindow, createdAt: string): string {
  const date = formatDay(kolkataDayStamp(createdAt), "long");
  switch (window) {
    case "today":
      return `Noticed on ${date}`;
    case "this_week":
      return `Noticed in the week up to ${date}`;
    case "this_month":
      return `Noticed in the month up to ${date}`;
    case "one_to_six_months":
      return `Noticed 1 to 6 months before ${date}`;
    case "over_six_months":
      return `Noticed more than six months before ${date}`;
  }
}

/**
 * Windowed rows name the window against the recorded Kolkata date.
 * A row with no window keeps the date that was stored on it.
 */
export function noticedWhen(report: Noticed): string {
  if (report.noticedWindow) return windowPhrase(report.noticedWindow, report.createdAt);
  return `Noticed on ${formatDay(report.noticedAt, "long")}`;
}

/** Same sentence the report page leads with. */
export function noticedLead(report: Noticed): string {
  return noticedWhen(report);
}
