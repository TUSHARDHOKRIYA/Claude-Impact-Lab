"use client";

import { useLayoutEffect } from "react";

import { GovButton } from "@/components/gov/GovButton";
import { toLabelLanguage } from "@/lib/chip-labels";
import { SUBMITTED_COPY } from "@/lib/review-copy";

export function SubmittedPanel({
  reportId,
  lang,
  onAgain,
}: {
  reportId: string;
  lang: string;
  onAgain: () => void;
}) {
  const language = toLabelLanguage(lang);
  const copy = SUBMITTED_COPY[language];
  const mapHref =
    language === "en"
      ? `/map?report=${reportId}&new=1`
      : `/map?report=${reportId}&new=1&lang=${language}`;
  useLayoutEffect(() => {
    document.getElementById("submitted-heading")?.focus();
  }, []);

  return (
    <section className="mt-8" lang={language}>
      <h2 id="submitted-heading" tabIndex={-1} className="ux4g-heading-l-strong">
        {copy.heading}
      </h2>
      <p className="ux4g-text mt-4">{copy.body}</p>
      <div className="mt-8 flex flex-col gap-2">
        <GovButton href={mapHref}>{copy.map}</GovButton>
        <GovButton href={`/reports/${reportId}`} variant="secondary">
          {copy.report}
        </GovButton>
        <GovButton type="button" variant="secondary" onClick={onAgain}>
          {copy.again}
        </GovButton>
      </div>
    </section>
  );
}
