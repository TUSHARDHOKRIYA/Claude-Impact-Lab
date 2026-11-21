import { kolkataDayStamp } from "@/lib/noticed-date";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD`, or null when the value is not that shape. */
function asDay(value: string | null | undefined): string | null {
  return typeof value === "string" && DAY.test(value) ? value : null;
}

/**
 * The Kolkata calendar day (`YYYY-MM-DD`) a stored `reportedAt` falls on, or
 * null when it cannot be read. An instant is shifted to IST before the date
 * is taken, so a report filed at 00:30 IST is not counted on the day before.
 * A bare date (seed rows) is already a day and is returned unchanged.
 */
export function reportedDay(value: string): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  if (DAY.test(value)) return value;
  if (Number.isNaN(Date.parse(value))) return null;
  return kolkataDayStamp(value);
}

/**
 * Keeps the points whose reported day falls between `from` and `to` (both
 * inclusive, `YYYY-MM-DD`, Kolkata days). A null or malformed bound is open.
 * With no bounds at all every point is kept, including unreadable dates.
 */
export function filterByReportedDate<T extends { reportedAt: string }>(
  points: T[],
  from: string | null,
  to: string | null,
): T[] {
  const lo = asDay(from);
  const hi = asDay(to);
  return points.filter((point) => {
    if (lo === null && hi === null) return true;
    const day = reportedDay(point.reportedAt);
    if (day === null) return false;
    if (lo !== null && day < lo) return false;
    if (hi !== null && day > hi) return false;
    return true;
  });
}

/** Earliest and latest reported Kolkata day among the points, or null when none is readable. */
export function reportedDateBounds<T extends { reportedAt: string }>(
  points: T[],
): { min: string; max: string } | null {
  let min: string | null = null;
  let max: string | null = null;
  for (const point of points) {
    const day = reportedDay(point.reportedAt);
    if (day === null) continue;
    if (min === null || day < min) min = day;
    if (max === null || day > max) max = day;
  }
  return min !== null && max !== null ? { min, max } : null;
}
