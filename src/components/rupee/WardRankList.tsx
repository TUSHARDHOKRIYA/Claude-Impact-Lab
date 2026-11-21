import Link from "next/link";

import { OutcomeBar } from "@/components/rupee/OutcomeBar";
import { formatInrShort } from "@/lib/rupee/format";
import { moneyScore, scoreBand, wardSlug } from "@/lib/rupee/slug";
import type { CityOverview } from "@/lib/rupee/types";

type Row = CityOverview["wards"][number];

const BAND_WORD = { good: "Good", fair: "Fair", poor: "Poor" } as const;

/**
 * Wards as a ranked stack of big tappable rows: rank, ward, a thin outcome
 * bar, and the score on the right. The rank is always the score rank, even
 * when the list is sorted another way, so "#3" means the same thing everywhere.
 */
export function WardRankList({
  rows,
  rankOf,
}: {
  rows: Row[];
  rankOf: Map<string, number>;
}) {
  return (
    <ol className="rb-rank" aria-label="Wards with their money score">
      {rows.map((row) => {
        const score = moneyScore(row);
        const band = scoreBand(score);
        const rank = rankOf.get(row.code) ?? 0;
        return (
          <li key={row.code}>
            <Link
              href={`/wards/${wardSlug(row.code)}`}
              className="rb-rank-row touch-target"
            >
              <span
                className="rb-rank-no"
                data-top={rank <= 3 ? "true" : undefined}
              >
                <span className="sr-only">Rank </span>
                {rank}
              </span>
              <span className="rb-rank-main">
                <span className="rb-rank-title">
                  <strong>{row.code}</strong>{" "}
                  <span className="rb-rank-name">{row.name}</span>
                </span>
                <OutcomeBar
                  compact
                  outcome={row.outcome}
                  spentInr={row.spentInr}
                  budgetInr={row.budgetInr}
                  label={`${row.code} ward spend by outcome`}
                />
                <span className="rb-rank-sub">
                  {formatInrShort(row.spentInr)} spent
                  {row.flagCount > 0
                    ? ` · ${row.flagCount} ${row.flagCount === 1 ? "flag" : "flags"}`
                    : ""}
                </span>
              </span>
              <span className={`rb-rank-score rb-score-${band}`}>
                <span className="rb-rank-score-n">{score}</span>
                <span className="rb-rank-score-w">{BAND_WORD[band]}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
