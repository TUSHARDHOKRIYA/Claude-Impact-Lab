import type { ReactNode } from "react";
import Link from "next/link";

import { GovBadge } from "@/components/gov/GovBadge";
import { noticedWhen } from "@/lib/noticed-label";
import { ISSUE_TYPE_LABELS, type PlaceSummary, type ReportListItem } from "@/lib/types";

const LINK = "ux4g-text-link-m touch-target inline-flex items-center";

export function PlaceMeta({ place, reports }: { place: PlaceSummary; reports: ReportListItem[] }) {
  const listed = [...reports].sort((a, b) => b.noticedAt.localeCompare(a.noticedAt));
  const latest = place.latestReport;
  const countLabel = place.reportCount === 1 ? "report" : "reports";

  return (
    <aside aria-labelledby="place-record-heading" className="min-w-0 lg:sticky lg:top-36">
      <section className="ux4g-card ux4g-card-solid ux4g-card-vertical">
        <div className="ux4g-card-header">
          <h2 id="place-record-heading" className="ux4g-heading-xs-strong">
            What the record shows
          </h2>
        </div>
        <div className="ux4g-card-body">
          <p className="flex items-baseline gap-2">
            <span className="ux4g-heading-l-strong">{place.reportCount}</span>
            <span className="ux4g-text ux4g-text-neutral-secondary">{countLabel} on this stretch</span>
          </p>
          <dl className="mt-4 divide-y divide-rule border-t border-rule">
            <Fact label="Recurring">{place.recurring ? "Yes" : "No"}</Fact>
            <Fact label="Latest report">
              {latest ? (
                <Link href={`/reports/${latest.id}`} className={LINK}>
                  {ISSUE_TYPE_LABELS[latest.issueType]} · {noticedWhen(latest)}
                </Link>
              ) : (
                "None on record"
              )}
            </Fact>
          </dl>
        </div>
      </section>

      <section className="mt-8 min-w-0" aria-labelledby="public-reports-heading">
        <h2 id="public-reports-heading" className="ux4g-heading-xs-strong">
          Public reports
        </h2>
        {listed.length === 0 ? (
          <p className="ux4g-text ux4g-text-neutral-secondary mt-3">No public report is attached to this place yet.</p>
        ) : (
          <ol className="ux4g-list ux4g-list-default mt-3">
            {listed.map((report) => (
              <li key={report.id} className="ux4g-list-item min-w-0 flex-wrap gap-2 py-1">
                <Link href={`/reports/${report.id}`} className={LINK}>
                  {ISSUE_TYPE_LABELS[report.issueType]}
                </Link>
                <span className="ux4g-text ux4g-text-neutral-secondary">{noticedWhen(report)}</span>
                {report.recurs ? <GovBadge tone="error">Recurring</GovBadge> : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-3">
      <dt className="ux4g-heading-xs-strong">{label}</dt>
      <dd className="ux4g-text mt-1 min-w-0 break-words">{children}</dd>
    </div>
  );
}
