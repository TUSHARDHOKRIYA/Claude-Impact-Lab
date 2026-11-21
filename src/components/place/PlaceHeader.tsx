import Link from "next/link";

import { placeArea, placeTitle } from "@/components/map/place-title";
import { GovBadge } from "@/components/gov/GovBadge";
import { noticedWhen } from "@/lib/noticed-label";
import {
  ISSUE_TYPE_LABELS,
  type LocationRecord,
  type PlaceSummary,
} from "@/lib/types";

/** "27 September 2025" becomes "27 Sep 2025" so it fits the stat box. */
function shortWhen(label: string): string {
  return label.replace(/^Noticed (on |in )?/, "").replace(/\b([A-Z][a-z]{2})[a-z]+ (\d{4})/, "$1 $2");
}

/**
 * The road is the headline, the problem is a tag, and the three facts people
 * look for (how many reports, does it come back, when last) sit in one row.
 */
export function PlaceHeader({
  location,
  place,
  wardHref,
}: {
  location: LocationRecord;
  place: PlaceSummary;
  /** The ward's money trail, when there is one. */
  wardHref?: string;
}) {
  const title = placeTitle({ location });
  const area = placeArea(location);
  const issue = ISSUE_TYPE_LABELS[location.issueType];
  const latest = place.latestReport;
  const ward = `${location.ward} ward`;

  return (
    <header className="rb-place-head">
      <p className="rb-place-tags">
        <GovBadge tone="info">{issue}</GovBadge>
        {place.recurring ? (
          <GovBadge tone="error">Keeps coming back</GovBadge>
        ) : null}
      </p>
      <h1 className="ux4g-heading-l-strong ux4g-mt-xs break-words">{title}</h1>
      <p className="ux4g-body-m-default ux4g-text-neutral-secondary">
        {area && area !== title ? `${area}, ` : null}
        {ward}
      </p>

      <dl className="rb-place-stats">
        <div>
          <dt>Reports</dt>
          <dd>{place.reportCount}</dd>
        </div>
        <div>
          <dt>Recurring</dt>
          <dd>{place.recurring ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Last noticed</dt>
          <dd className="rb-place-stat-s">
            {latest
              ? shortWhen(noticedWhen(latest))
              : "—"}
          </dd>
        </div>
      </dl>

      {wardHref ? (
        <p className="ux4g-mt-s">
          <Link href={wardHref} className="ux4g-text-link-m touch-target inline-flex items-center">
            Where {ward}&apos;s road money went
          </Link>
        </p>
      ) : null}
    </header>
  );
}
