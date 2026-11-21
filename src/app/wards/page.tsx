import type { Metadata } from "next";
import Link from "next/link";

import { GovBadge } from "@/components/gov/GovBadge";
import { OutcomeBar } from "@/components/rupee/OutcomeBar";
import { formatInrShort, getRupee } from "@/lib/rupee";
import { pct, wardSlug } from "@/lib/rupee/slug";

export const metadata: Metadata = {
  title: "Ward money trail",
  description:
    "Mumbai's 24 wards: what each spent on monsoon road repairs, how much held up, and how much needs an explanation.",
};

function toExplainShare(row: { spentInr: number; outcome: { flaggedInr: number; failedInr: number } }): number {
  return (row.outcome.flaggedInr + row.outcome.failedInr) / Math.max(row.spentInr, 1);
}

const SORTS = [
  { key: "code", label: "By ward" },
  { key: "explain", label: "Most to explain" },
] as const;

type Props = { searchParams: Promise<{ sort?: string }> };

export default async function WardsPage({ searchParams }: Props) {
  const { overview } = getRupee();
  const sort = (await searchParams).sort === "explain" ? "explain" : "code";
  const wards =
    sort === "explain" ? [...overview.wards].sort((a, b) => toExplainShare(b) - toExplainShare(a)) : overview.wards;

  return (
    <div className="shell rb-page">
      <h1 className="ux4g-display-xs-strong">Where the monsoon road money went</h1>
      <p className="ux4g-body-l-default ux4g-text-neutral-secondary ux4g-mt-xs rb-measure">
        Mumbai&apos;s wards spent {formatInrShort(overview.spentInr)} on {overview.orders.toLocaleString("en-IN")} road
        and drain repairs this monsoon, against a budget of {formatInrShort(overview.budgetInr)}.
      </p>

      <section className="ux4g-card ux4g-card-solid ux4g-card-vertical ux4g-mt-l" aria-labelledby="city-heading">
        <div className="ux4g-card-header">
          <h2 id="city-heading" className="ux4g-heading-xs-strong">
            All wards together
          </h2>
        </div>
        <div className="ux4g-card-body">
          <OutcomeBar
            outcome={overview.outcome}
            spentInr={overview.spentInr}
            budgetInr={overview.budgetInr}
            label="Citywide monsoon road spend by outcome"
          />
        </div>
      </section>

      <section className="ux4g-mt-2xl" aria-labelledby="all-heading">
        <div className="rb-list-head">
          <h2 id="all-heading" className="ux4g-title-l-strong">
            {overview.wards.length} wards
          </h2>
          <nav className="rb-sort" aria-label="Sort wards">
            {SORTS.map((option) => (
              <Link
                key={option.key}
                href={option.key === "code" ? "/wards" : `/wards?sort=${option.key}`}
                className={sort === option.key ? "ux4g-filter-chip-m active touch-target" : "ux4g-filter-chip-m touch-target"}
                aria-current={sort === option.key ? "true" : undefined}
                scroll={false}
              >
                {option.label}
              </Link>
            ))}
          </nav>
        </div>
        {sort === "explain" ? (
          <p className="ux4g-body-s-default ux4g-text-neutral-secondary ux4g-mt-2xs">
            Share of spend that failed within 30 days or carries an audit flag, highest first.
          </p>
        ) : null}
        <ul className="ux4g-list ux4g-list-default ux4g-list-l ux4g-mt-s rb-ward-list">
          {wards.map((row) => (
            <li key={row.code} className="ux4g-list-item">
              <Link href={`/wards/${wardSlug(row.code)}`} className="ux4g-list-item-row rb-ward-row">
                <span className="rb-ward-row-head">
                  <span className="ux4g-body-m-strong">
                    {row.code} <span className="ux4g-body-s-default ux4g-text-neutral-secondary">{row.name}</span>
                  </span>
                  <span className="ux4g-body-s-strong rb-num">{formatInrShort(row.spentInr)}</span>
                </span>
                <OutcomeBar
                  compact
                  outcome={row.outcome}
                  spentInr={row.spentInr}
                  budgetInr={row.budgetInr}
                  label={`${row.code} ward spend by outcome`}
                />
                <span className="rb-ward-row-meta">
                  <span className="ux4g-body-xs-default ux4g-text-neutral-secondary">
                    {pct(row.outcome.heldInr / Math.max(row.spentInr, 1))} held up, {pct(toExplainShare(row))} to explain
                  </span>
                  {row.flagCount > 0 ? (
                    <GovBadge tone="warning" small>
                      {row.flagCount} {row.flagCount === 1 ? "flag" : "flags"}
                    </GovBadge>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="ux4g-body-s-default ux4g-mt-xl">
        <Link href="/contractors" className="ux4g-text-link-s">
          Contractor scorecards
        </Link>
      </p>
    </div>
  );
}
