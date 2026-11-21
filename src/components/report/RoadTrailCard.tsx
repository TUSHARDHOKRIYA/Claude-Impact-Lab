import Link from "next/link";

import { GovBadge } from "@/components/gov/GovBadge";
import { formatInrShort } from "@/lib/rupee/format";
import type { RoadTrailSummary } from "@/lib/rupee/road-trail";

/** Shows the BMC road spend, DLP guarantee, and last contractor for a citizen's pinned road. */
export function RoadTrailCard({
  trail,
  reportId,
}: {
  trail: RoadTrailSummary;
  reportId?: string;
}) {
  const assistantHref = reportId
    ? `/assistant?reportId=${encodeURIComponent(reportId)}`
    : `/assistant?roadId=${encodeURIComponent(trail.roadId)}`;

  return (
    <section
      aria-label="Road money trail"
      className="ux4g-card ux4g-card-outline ux4g-card-vertical my-6"
    >
      <div className="ux4g-card-header flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="ux4g-body-xs-default ux4g-text-neutral-secondary">
            BMC road record, {trail.ward} ward, segment {trail.roadId}
          </p>
          <h2 className="ux4g-heading-xs-strong mt-1">{trail.roadName}</h2>
        </div>
        {trail.underDlp ? (
          <GovBadge tone="primary" small>
            Under DLP guarantee
          </GovBadge>
        ) : null}
      </div>

      <div className="ux4g-card-body space-y-3">
        {trail.underDlp ? (
          <p className="ux4g-body-s-strong">
            This road is still under its Defect Liability Period (resurfaced{" "}
            {trail.lastResurfaced}). Surface repairs should be done free by the
            resurfacing contractor. BMC should not pay again.
          </p>
        ) : null}
        <p className="ux4g-body-s-default">
          <strong>{formatInrShort(trail.spentInr)}</strong> billed across{" "}
          <strong>{trail.orders}</strong> monsoon{" "}
          {trail.orders === 1 ? "job" : "jobs"}
          {trail.reopenedCount > 0
            ? ` (${trail.reopenedCount} failed within 30 days)`
            : ""}
          {trail.flagCount > 0 ? ` · ${trail.flagCount} audit flags` : ""}.
          {trail.lastContractorName ? (
            <>
              {" "}
              Last repaired by{" "}
              {trail.lastContractorId ? (
                <Link
                  href={`/contractors/${trail.lastContractorId}`}
                  className="ux4g-text-link-s"
                >
                  {trail.lastContractorName}
                </Link>
              ) : (
                trail.lastContractorName
              )}
              .
            </>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href={trail.wardHref} className="ux4g-text-link-s touch-target">
            Where {trail.ward} ward&apos;s road money went
          </Link>
          <Link href={assistantHref} className="ux4g-text-link-s touch-target">
            Ask about this road
          </Link>
        </div>
      </div>
    </section>
  );
}
