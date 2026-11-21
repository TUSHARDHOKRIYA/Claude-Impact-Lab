"use client";

import { useLayoutEffect } from "react";

import { GovButton } from "@/components/gov/GovButton";
import { CheckIcon } from "@/components/report/flow-icons";
import { ReportSummary, type ReportAnswers } from "@/components/report/ReportSummary";
import { toLabelLanguage } from "@/lib/chip-labels";
import { SUBMITTED_COPY } from "@/lib/review-copy";

/** Sent: a calm tick, then the report exactly as it now stands on the record. */
export function SubmittedPanel({
  reportId,
  answers,
  lang,
  onAgain,
}: {
  reportId: string;
  answers: ReportAnswers;
  lang: string;
  onAgain: () => void;
}) {
  const language = toLabelLanguage(lang);
  const copy = SUBMITTED_COPY[language];
  const mapHref =
    language === "en" ? `/map?report=${reportId}&new=1` : `/map?report=${reportId}&new=1&lang=${language}`;
  useLayoutEffect(() => {
    document.getElementById("submitted-heading")?.focus();
  }, []);

  return (
    <section className="rb-done" lang={language}>
      <div className="rb-done-hero">
        <span className="rb-done-tick" aria-hidden="true">
          <CheckIcon size={30} />
        </span>
        <h2 id="submitted-heading" tabIndex={-1} className="rb-step-heading ux4g-title-l-strong">
          {copy.heading}
        </h2>
        <p className="ux4g-body-m-default ux4g-text-neutral-secondary">{copy.body}</p>
      </div>

      <h3 className="ux4g-heading-xs-strong ux4g-mt-xl">Your report</h3>
      <ReportSummary answers={answers} lang={language} />
      <p className="ux4g-body-s-default ux4g-mt-s">
        <a href={`/reports/${reportId}`} className="ux4g-text-link-s">
          {copy.report}
        </a>
      </p>

      <div className="rb-actionbar rb-actionbar-stack">
        <GovButton href={mapHref} className="w-full">
          {copy.map}
        </GovButton>
        <GovButton type="button" variant="ghost" className="w-full" onClick={onAgain}>
          {copy.again}
        </GovButton>
      </div>
    </section>
  );
}
