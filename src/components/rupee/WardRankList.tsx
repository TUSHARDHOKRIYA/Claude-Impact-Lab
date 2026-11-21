import Link from "next/link";

import { OUTCOME_PARTS, OutcomeBar } from "@/components/rupee/OutcomeBar";
import { formatInr, formatInrShort } from "@/lib/rupee/format";
import { moneyScore, scoreBand, wardSlug } from "@/lib/rupee/slug";
import type { CityOverview, NextRupeeItem } from "@/lib/rupee/types";

type Row = CityOverview["wards"][number];

const BAND_WORD = { good: "Good", fair: "Fair", poor: "Poor" } as const;

function share(value: number, of: number): number {
  return Math.round((value / Math.max(of, 1)) * 100);
}

function Breakdown({ row }: { row: Row }) {
  const unspent = row.budgetInr - row.spentInr;
  return (
    <div className="rb-rank-money">
      <ul className="rb-rank-parts">
        {OUTCOME_PARTS.map((part) => (
          <li key={part.key}>
            <span className={`rb-swatch rb-seg-${part.tone}`} aria-hidden="true" />
            <span className="rb-rank-part-label">{part.label}</span>
            <span className="rb-num">{formatInrShort(row.outcome[part.key])}</span>
            <span className="rb-num rb-rank-part-pct">{share(row.outcome[part.key], row.spentInr)}%</span>
          </li>
        ))}
      </ul>
      <p className="rb-rank-budget">
        {formatInrShort(row.spentInr)} of a {formatInrShort(row.budgetInr)} budget
        {unspent > 0
          ? `, ${formatInrShort(unspent)} unspent.`
          : unspent < 0
            ? `, ${formatInrShort(-unspent)} over.`
            : "."}{" "}
        {Math.round(row.reopenRate * 100)}% of jobs re-opened within 30 days.
      </p>
    </div>
  );
}

function FixFirst({ item }: { item: NextRupeeItem }) {
  return (
    <div className="rb-fixfirst rb-fixfirst-s">
      <p className="rb-fixfirst-kicker">Fix first</p>
      <p className="rb-fixfirst-road">{item.roadName}</p>
      <p className="rb-fixfirst-why">{item.reasons[0]}</p>
      <p className="rb-fixfirst-how">
        {item.underDlp
          ? "Under guarantee: the contractor who laid it fixes it free."
          : `${item.suggestedMethod}, about ${formatInr(item.estCostInr)}`}
      </p>
    </div>
  );
}

/**
 * Wards as a ranked list of rows that open in place: the closed row is rank,
 * ward, a thin outcome bar and the score; open, it shows where the money went
 * and the first road to fix. The rank is always the score rank, even when the
 * list is sorted another way, so "#3" means the same thing everywhere.
 */
export function WardRankList({
  rows,
  rankOf,
  fixFirst,
}: {
  rows: Row[];
  rankOf: Map<string, number>;
  fixFirst: Map<string, NextRupeeItem>;
}) {
  return (
    <ol className="rb-rank" aria-label="Wards with their money score">
      {rows.map((row) => {
        const score = moneyScore(row);
        const band = scoreBand(score);
        const rank = rankOf.get(row.code) ?? 0;
        const next = fixFirst.get(row.code);
        return (
          <li key={row.code}>
            <details className="rb-rank-item" name="ward-rank">
              <summary className="rb-rank-row touch-target">
                <span className="rb-rank-no" data-top={rank <= 3 ? "true" : undefined}>
                  <span className="sr-only">Rank </span>
                  {rank}
                </span>
                <span className="rb-rank-main">
                  <span className="rb-rank-title">
                    <strong>{row.code}</strong> <span className="rb-rank-name">{row.name}</span>
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
                    {row.flagCount > 0 ? `, ${row.flagCount} ${row.flagCount === 1 ? "bill" : "bills"} flagged` : ""}
                  </span>
                </span>
                <span className={`rb-rank-score rb-score-${band}`}>
                  <span className="rb-rank-score-n">{score}</span>
                  <span className="rb-rank-score-w">{BAND_WORD[band]}</span>
                </span>
                <svg className="rb-rank-chev" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="rb-rank-panel">
                <Breakdown row={row} />
                {next ? <FixFirst item={next} /> : null}
                <Link href={`/wards/${wardSlug(row.code)}`} className="ux4g-btn ux4g-btn-m ux4g-btn-outline-primary touch-target rb-rank-open">
                  Open {row.code} ward
                </Link>
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}
