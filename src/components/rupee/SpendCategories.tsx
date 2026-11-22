import Link from "next/link";

import { BandBadge } from "@/components/rupee/ScoreMeter";
import { formatInr, formatInrShort } from "@/lib/rupee/format";
import type { ContractorScorecard } from "@/lib/rupee/scorecard";
import { pct } from "@/lib/rupee/slug";
import type { SpendSlice } from "@/lib/rupee/types";

type Health = "held" | "shaky" | "failing";

const HEALTH_WORD: Record<Health, string> = {
  held: "Mostly held",
  shaky: "Some came back",
  failing: "Often came back",
};

/** Against a fair rate when we have one (contractors), else fixed cut-offs. */
function health(reopenRate: number, fairRate?: number): Health {
  if (fairRate !== undefined) {
    return reopenRate <= fairRate
      ? "held"
      : reopenRate <= fairRate + 0.05
        ? "shaky"
        : "failing";
  }
  return reopenRate < 0.1 ? "held" : reopenRate < 0.2 ? "shaky" : "failing";
}

/**
 * Budget-app style category rows: a name, the amount in a coloured pill, and a
 * bar under it. The bar's length is the row's share of the ward's spend; its
 * red tail is the part of that money spent on jobs re-opened within 30 days.
 * The sub-line says the same in words, so the colours are never the only cue.
 */
export function SpendCategories({
  caption,
  rows,
  totalInr,
  fairRate,
  scorecards,
}: {
  caption: string;
  rows: SpendSlice[];
  totalInr: number;
  /** Per-row fair re-open rate, keyed by slice key. */
  fairRate?: Map<string, number>;
  scorecards?: ReadonlyMap<string, Pick<ContractorScorecard, "overall" | "band">>;
}) {
  const biggest = Math.max(...rows.map((row) => row.spentInr), 1);
  return (
    <div className="rb-cats">
      <div className="rb-cats-head" aria-hidden="true">
        <span>{caption}</span>
        <span>Spent</span>
      </div>
      <ul aria-label={caption}>
        {rows.map((row) => {
          const fair = fairRate?.get(row.key);
          const card = scorecards?.get(row.key);
          const name = row.label.replace(" (synthetic)", "");
          const state = health(row.reopenRate, fair);
          const width = (row.spentInr / biggest) * 100;
          return (
            <li key={row.key} className="rb-cat">
              <div className="rb-cat-line">
                {card ? (
                  <Link href={`/contractors/${row.key}`} className="rb-cat-name ux4g-text-link-m">
                    {name}
                  </Link>
                ) : (
                  <span className="rb-cat-name">{name}</span>
                )}
                <span
                  className={`rb-cat-pill rb-cat-${state}`}
                  title={formatInr(row.spentInr)}
                >
                  {formatInrShort(row.spentInr)}
                </span>
              </div>
              <div className="rb-cat-bar" aria-hidden="true">
                <span style={{ width: `${width}%` }}>
                  <span
                    className="rb-cat-seg-ok"
                    style={{ flexGrow: 1 - row.reopenRate }}
                  />
                  {row.reopenRate > 0 ? (
                    <span
                      className="rb-cat-seg-back"
                      style={{ flexGrow: row.reopenRate }}
                    />
                  ) : null}
                </span>
              </div>
              <p className="rb-cat-sub">
                {card ? (
                  <>Score {card.overall.toFixed(0)} <BandBadge band={card.band} small />, </>
                ) : null}
                {row.orders} {row.orders === 1 ? "job" : "jobs"}, {pct(row.spentInr / Math.max(totalInr, 1))} of spend,{" "}
                <span className={`rb-cat-word rb-cat-${state}`}>
                  {pct(row.reopenRate)} came back
                  {fair !== undefined ? ` (fair ${pct(fair)})` : ""}
                </span>
                <span className="sr-only">. {HEALTH_WORD[state]}.</span>
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
