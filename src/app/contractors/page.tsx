import type { Metadata } from "next";
import Link from "next/link";

import { GovBadge } from "@/components/gov/GovBadge";
import { FLAG_LABELS } from "@/components/rupee/FlagList";
import { formatInrShort, getRupee } from "@/lib/rupee";
import { pct } from "@/lib/rupee/slug";
import type { AuditFlagKind } from "@/lib/rupee/types";

export const metadata: Metadata = {
  title: "Contractor scorecards",
  description:
    "How each road contractor's monsoon repairs held up, compared with what is fair for the wards and work they took on.",
};

function ratioLabel(ratio: number): string {
  const diff = Math.round((ratio - 1) * 100);
  if (diff === 0) return "On the rate card";
  return diff > 0 ? `${diff}% above the rate card` : `${-diff}% below the rate card`;
}

export default function ContractorsPage() {
  const { scores } = getRupee();
  const rows = [...scores].sort(
    (a, b) => b.reopenRate - b.expectedReopenRate - (a.reopenRate - a.expectedReopenRate),
  );

  return (
    <div className="shell rh-page">
      <nav className="ux4g-breadcrumb ux4g-breadcrumb-divider" aria-label="Breadcrumb">
        <ol className="ux4g-breadcrumb-list flex">
          <li className="ux4g-breadcrumb-item">
            <Link href="/wards" className="ux4g-breadcrumb-link touch-target">
              Wards
            </Link>
          </li>
          <li className="ux4g-breadcrumb-item active" aria-current="page">
            Contractors
          </li>
        </ol>
      </nav>
      <h1 className="ux4g-display-xs-strong ux4g-mt-xs">Who did the work, and did it hold?</h1>
      <p className="ux4g-body-l-default ux4g-text-neutral-secondary ux4g-mt-xs rh-measure">
        Each contractor&apos;s re-open rate sits next to a fair one: what we would expect for the same kinds of job in
        equally flood-prone wards. The furthest above fair come first.
      </p>

      <ul className="rh-score-grid ux4g-mt-l">
        {rows.map((score) => {
          const gap = score.reopenRate - score.expectedReopenRate;
          const flagKinds = (Object.keys(score.flags) as AuditFlagKind[]).filter((kind) => score.flags[kind] > 0);
          return (
            <li key={score.contractor.id} className="ux4g-card ux4g-card-solid ux4g-card-vertical">
              <div className="ux4g-card-header">
                <p className="ux4g-card-title">{score.contractor.name.replace(" (synthetic)", "")}</p>
                <p className="ux4g-body-s-default ux4g-text-neutral-secondary">
                  Empanelled {score.contractor.empanelledSince}. {score.orders} jobs in {score.wards.length} wards,{" "}
                  {formatInrShort(score.spentInr)} billed.
                </p>
              </div>
              <div className="ux4g-card-body">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="ux4g-heading-m-strong">{pct(score.reopenRate)}</span>
                  <span className="ux4g-body-s-default ux4g-text-neutral-secondary">
                    came back, against {pct(score.expectedReopenRate)} fair
                  </span>
                  {gap > 0.05 ? (
                    <GovBadge tone="error" small>Worse than fair</GovBadge>
                  ) : gap < -0.05 ? (
                    <GovBadge tone="success" small>Better than fair</GovBadge>
                  ) : (
                    <GovBadge tone="neutral" small>About fair</GovBadge>
                  )}
                </div>
                <dl className="rh-score-facts ux4g-mt-s">
                  <div>
                    <dt className="ux4g-body-s-default ux4g-text-neutral-secondary">Finished on time</dt>
                    <dd className="ux4g-body-m-strong">{pct(score.slaRate)}</dd>
                  </div>
                  <div>
                    <dt className="ux4g-body-s-default ux4g-text-neutral-secondary">Typical bill</dt>
                    <dd className="ux4g-body-m-strong">{ratioLabel(score.medianCostRatio)}</dd>
                  </div>
                  <div>
                    <dt className="ux4g-body-s-default ux4g-text-neutral-secondary">Flagged bills</dt>
                    <dd className="ux4g-body-m-strong">{formatInrShort(score.flaggedInr)}</dd>
                  </div>
                </dl>
                {flagKinds.length ? (
                  <ul className="ux4g-body-s-default rh-score-flags ux4g-mt-s">
                    {flagKinds.map((kind) => (
                      <li key={kind}>
                        {FLAG_LABELS[kind]}: {score.flags[kind]}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="ux4g-card-footer">
                <p className="ux4g-body-xs-default ux4g-text-neutral-secondary">{score.contextNote}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
