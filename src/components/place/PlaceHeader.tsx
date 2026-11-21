import { placeArea, placeTitle } from "@/components/map/place-title";
import { GovBadge } from "@/components/gov/GovBadge";
import { noticedWhen } from "@/lib/noticed-label";
import {
  ISSUE_TYPE_LABELS,
  type LocationRecord,
  type PlaceSummary,
} from "@/lib/types";

/**
 * The road is the headline, the problem is a tag, and the three facts people
 * look for (how many reports, does it come back, when last) sit in one row.
 */
export function PlaceHeader({
  location,
  place,
}: {
  location: LocationRecord;
  place: PlaceSummary;
}) {
  const title = placeTitle({ location });
  const area = placeArea(location);
  const issue = ISSUE_TYPE_LABELS[location.issueType];
  const latest = place.latestReport;
  const where = [area && area !== title ? area : null, `${location.ward} ward`]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="rb-place-head">
      <p className="rb-place-tags">
        <GovBadge tone="info">{issue}</GovBadge>
        {place.recurring ? (
          <GovBadge tone="error">Keeps coming back</GovBadge>
        ) : null}
      </p>
      <h1 className="ux4g-heading-l-strong ux4g-mt-xs break-words">{title}</h1>
      <p className="ux4g-body-m-default ux4g-text-neutral-secondary">{where}</p>

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
              ? noticedWhen(latest).replace(/^Noticed (on |in )?/, "")
              : "—"}
          </dd>
        </div>
      </dl>
    </header>
  );
}
