"use client";

import { useEffect, useRef, type RefObject } from "react";
import Link from "next/link";
import { GovBadge } from "@/components/gov/GovBadge";
import { GovButton } from "@/components/gov/GovButton";
import { noticedWhen } from "@/lib/noticed-label";
import { ISSUE_TYPE_LABELS, type PlaceSummary } from "@/lib/types";

export function PlacePreview({
  place,
  onClose,
  openerRef,
  yourReportId,
}: {
  place: PlaceSummary;
  onClose: () => void;
  openerRef?: RefObject<HTMLElement | null>;
  /** Set when the preview was opened from `?report=`. */
  yourReportId?: string;
}) {
  const latest = place.latestReport;
  const issue = ISSUE_TYPE_LABELS[place.location.issueType];
  const onCloseRef = useRef(onClose);
  const openerBox = useRef(openerRef);
  onCloseRef.current = onClose;
  openerBox.current = openerRef;

  const restoreToOpener = () => {
    openerBox.current?.current?.focus();
    onCloseRef.current();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") restoreToOpener();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="place-preview-title"
      className="ux4g-card ux4g-card-solid ux4g-card-vertical pointer-events-auto absolute inset-x-3 bottom-3 z-10 max-w-sm sm:inset-x-auto sm:right-4 sm:bottom-12"
    >
      <div className="ux4g-card-header flex items-start justify-between gap-3">
        <p className="ux4g-card-sub-title">Place</p>
        <GovButton variant="ghost" onClick={restoreToOpener}>
          Close this place preview
        </GovButton>
      </div>

      <div className="ux4g-card-body">
        <h3 id="place-preview-title" className="ux4g-card-title">
          {place.location.name}
        </h3>
        <p className="ux4g-text ux4g-text-neutral-secondary">
          {place.location.street} · {place.location.ward}
        </p>

        <p className="mt-3 flex items-baseline gap-2">
          <span className="ux4g-heading-l-strong">{place.reportCount}</span>
          <span className="ux4g-text ux4g-text-neutral-secondary">
            {place.reportCount === 1 ? "report" : "reports"}
            {place.recurring ? " · recurring" : ""}
          </span>
        </p>

        <p className="mt-3">
          <GovBadge tone="info">{issue}</GovBadge>
        </p>

        {latest ? <p className="ux4g-text mt-3">{noticedWhen(latest)}</p> : null}

        <p className="mt-4 flex flex-wrap gap-2">
          <Link
            href={
              yourReportId
                ? `/places/${place.location.slug}?report=${yourReportId}`
                : `/places/${place.location.slug}`
            }
            className="ux4g-btn ux4g-btn-m ux4g-btn-primary touch-target"
            style={{ minHeight: 48 }}
          >
            Open this place
          </Link>
          {yourReportId || latest ? (
            <Link
              href={`/reports/${yourReportId ?? latest?.id}`}
              className="ux4g-text-link ux4g-text-link-m touch-target inline-flex items-center"
              style={{ minHeight: 48 }}
            >
              {yourReportId ? "Your report" : "Latest report"}
            </Link>
          ) : null}
        </p>
      </div>
    </aside>
  );
}
