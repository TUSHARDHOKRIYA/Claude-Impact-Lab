import type { NoticedWindow } from "@/lib/types";

const KOLKATA_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** Days before the recorded Kolkata date. Sorting and map filters use the result. */
export const NOTICED_WINDOW_MIDPOINT_DAYS: Record<NoticedWindow, number> = {
  today: 0,
  this_week: 3,
  this_month: 15,
  one_to_six_months: 105,
  over_six_months: 270,
};

/**
 * Estimate used only for sorting. `recorded` is a Kolkata `YYYY-MM-DD`.
 * Subtracts whole calendar days in UTC so a month boundary cannot shift.
 */
export function estimateNoticedAt(recorded: string, window: NoticedWindow): string {
  const year = Number(recorded.slice(0, 4));
  const month = Number(recorded.slice(5, 7));
  const day = Number(recorded.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - NOTICED_WINDOW_MIDPOINT_DAYS[window]);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/** Kolkata calendar day of a stored instant, or the date itself when it has no time. */
export function kolkataDayStamp(value: string): string {
  if (!value.includes("T")) return value.slice(0, 10);
  return kolkataTodayStamp(new Date(value));
}

export function kolkataTodayStamp(now = new Date()): string {
  const kolkata = new Date(now.getTime() + KOLKATA_OFFSET_MS);
  return [
    kolkata.getUTCFullYear(),
    String(kolkata.getUTCMonth() + 1).padStart(2, "0"),
    String(kolkata.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function isNoticedDate(value: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const parsed = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return false;
  }
  return value <= kolkataTodayStamp(now);
}
