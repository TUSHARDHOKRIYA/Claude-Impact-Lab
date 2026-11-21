/** "F/S" ward code to and from the "f-s" URL segment. */
export function wardSlug(code: string): string {
  return code.toLowerCase().replace(/\//g, "-");
}

export function wardFromSlug<T extends { ward: { code: string } }>(rows: readonly T[], slug: string): T | null {
  const wanted = slug.toLowerCase();
  return rows.find((row) => wardSlug(row.ward.code) === wanted) ?? null;
}

export function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/**
 * A ward's money score, 0 to 100: the share of its spend that held up
 * (not re-opened within 30 days and no audit flag). Same number as the green
 * part of the outcome bar, so the rank and the chart never disagree.
 */
export function moneyScore(row: { spentInr: number; outcome: { heldInr: number } }): number {
  return Math.round((row.outcome.heldInr / Math.max(row.spentInr, 1)) * 100);
}

export type ScoreBand = "good" | "fair" | "poor";

export function scoreBand(score: number): ScoreBand {
  return score >= 65 ? "good" : score >= 50 ? "fair" : "poor";
}
