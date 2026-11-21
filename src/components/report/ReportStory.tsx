import Link from "next/link";

import { GovBadge } from "@/components/gov/GovBadge";
import { noticedWhen } from "@/lib/noticed-label";
import { reportHeadline } from "@/lib/place-name";
import { reportAside } from "@/lib/report-copy";
import {
  ISSUE_TYPE_LABELS,
  type LocationRecord,
  type PlaceHistoryEvent,
  type PlaceSummary,
  type PublicReportRecord,
  type ReportListItem,
} from "@/lib/types";

const LINK = "ux4g-text-link-m touch-target inline-flex items-center";

type ReportStoryProps = {
  report: PublicReportRecord;
  location: LocationRecord;
  place: PlaceSummary;
  history: PlaceHistoryEvent[];
  similar: ReportListItem[];
  connectedCount: number;
};

function connectedLine(count: number): string {
  if (count <= 0) return "This is the first report connected to this location.";
  if (count === 1) return "1 other report is connected to this location.";
  return `${count} other reports are connected to this location.`;
}

export function ReportStory({
  report,
  location,
  place,
  history,
  similar,
  connectedCount,
}: ReportStoryProps) {
  const issue = ISSUE_TYPE_LABELS[report.issueType];
  const headline = reportHeadline(issue, location.street);
  const placeHref = `/places/${location.slug}?report=${report.id}`;
  const others = similar.filter((item) => item.id !== report.id);

  return (
    <div className="min-w-0">
      <nav aria-label="Breadcrumb" className="mb-6 min-w-0">
        <ol className="m-0 flex min-w-0 list-none flex-wrap items-center gap-2 p-0">
          <li>
            <Link href="/map" className={LINK}>
              Map
            </Link>
          </li>
          <li aria-hidden="true" className="ux4g-text ux4g-text-neutral-tertiary">
            /
          </li>
          <li className="min-w-0">
            <Link href={placeHref} className={`${LINK} min-w-0`}>
              <span className="break-words">{location.name}</span>
            </Link>
          </li>
          <li aria-hidden="true" className="ux4g-text ux4g-text-neutral-tertiary">
            /
          </li>
          <li className="ux4g-text min-w-0 break-words" aria-current="page">
            {issue}
          </li>
        </ol>
        <p className="ux4g-text ux4g-text-neutral-tertiary mt-2 min-w-0 break-all">{report.id}</p>
      </nav>

      <p className="ux4g-card-sub-title">Street report</p>
      <h1 className="ux4g-heading-xl-strong mt-2 break-words">{headline}</h1>
      <p className="ux4g-text mt-4">
        {reportAside(report, location)}
        {report.recurs ? " People have noticed this more than once." : null}
      </p>

      <figure className="ux4g-card ux4g-card-outline ux4g-card-vertical mt-8 min-w-0 overflow-hidden">
        {/* The photo is a separate request so this page's payload stays small. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/reports/${report.id}/photo`}
          alt={headline}
          className="aspect-[4/3] h-auto w-full max-w-full object-cover"
        />
        <figcaption className="ux4g-card-footer flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <span className="ux4g-text min-w-0 break-words">
            {location.street}, {location.ward}
            {report.photoIsIllustration
              ? ". Illustration. No photo was supplied with this report."
              : ""}
          </span>
          <GovBadge tone="success">Street report</GovBadge>
        </figcaption>
      </figure>

      <p className="ux4g-text mt-8">
        {place.reportCount === 1 ? "1 report" : `${place.reportCount} reports`}
        {place.recurring ? " · reported more than once" : ""} at this place.
      </p>
      <p className="ux4g-text mt-3">{connectedLine(connectedCount)}</p>

      {report.description ? <p className="ux4g-text mt-4 break-words">{report.description}</p> : null}

      <section className="mt-10 min-w-0" aria-labelledby="place-history-heading">
        <h2 id="place-history-heading" className="ux4g-heading-xs-strong">
          Place history
        </h2>
        {history.length === 0 ? (
          <p className="ux4g-text ux4g-text-neutral-secondary mt-3">This is the first mark on the place record.</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-3">
            {history.slice(0, 10).map((event) => (
              <li key={event.id} className="min-w-0 break-words">
                <time dateTime={event.at} className="ux4g-text ux4g-text-neutral-secondary">
                  {noticedWhen({ noticedAt: event.at, noticedWindow: event.noticedWindow, createdAt: event.createdAt })}
                </time>
                <span className="mt-1 flex flex-wrap items-center gap-2">
                  <GovBadge tone="neutral">Street report</GovBadge>
                  {event.href ? (
                    <Link href={event.href} className={LINK}>
                      {event.title}
                    </Link>
                  ) : (
                    <span className="ux4g-text">{event.title}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3">
          <Link href={placeHref} className={LINK}>
            Open the full record for {location.name}
          </Link>
        </p>
      </section>

      <section className="mt-10 min-w-0" aria-labelledby="similar-heading">
        <h2 id="similar-heading" className="ux4g-heading-xs-strong">
          Similar reports
        </h2>
        {others.length === 0 ? (
          <p className="ux4g-text ux4g-text-neutral-secondary mt-3">No similar reports sit beside this one yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {others.map((item) => (
              <li key={item.id} className="flex min-w-0 flex-wrap items-center gap-2">
                <Link href={`/reports/${item.id}`} className={LINK}>
                  {ISSUE_TYPE_LABELS[item.issueType]}
                </Link>
                <GovBadge tone="success">Street report</GovBadge>
                <span className="ux4g-text ux4g-text-neutral-secondary">{noticedWhen(item)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
