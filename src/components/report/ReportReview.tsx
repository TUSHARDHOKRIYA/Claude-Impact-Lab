import { GovAlert } from "@/components/gov/GovAlert";
import { GovChoiceGroup } from "@/components/gov/GovChoiceGroup";
import { ReportSummary, type ReportAnswers, type SummarySection } from "@/components/report/ReportSummary";
import { toLabelLanguage } from "@/lib/chip-labels";
import { describePlace } from "@/lib/place-name";
import { REVIEW_COPY } from "@/lib/review-copy";
import { ACCIDENT_SEEN, ACCIDENT_SEEN_LABELS, type AccidentSeen } from "@/lib/types";

const ACCIDENT_OPTIONS = ACCIDENT_SEEN.map((value) => ({ value, label: ACCIDENT_SEEN_LABELS[value] }));

/** Check step: the whole report in sections, each with an Edit link back to its screen. */
export function ReportReview({
  answers,
  accidentError,
  onAccident,
  onEdit,
  lang: rawLang,
  locationConfirmed,
}: {
  answers: ReportAnswers;
  accidentError?: string;
  onAccident: (value: AccidentSeen) => void;
  onEdit: (section: SummarySection) => void;
  lang: string;
  locationConfirmed: boolean;
}) {
  const lang = toLabelLanguage(rawLang);
  const copy = REVIEW_COPY[lang];

  return (
    <section className="rb-step" lang={lang}>
      <h2 id="report-step-heading" tabIndex={-1} className="rb-step-heading rb-q">
        {copy.heading}
      </h2>
      <p className="ux4g-body-m-default ux4g-text-neutral-secondary ux4g-mt-xs rb-measure">
        You can&apos;t change it after you send it. {copy.anonymous}
        {lang === "hi" ? "।" : "."}
      </p>
      {!locationConfirmed ? (
        <GovAlert variant="warning" className="ux4g-mt-m">
          {copy.pinNotConfirmed} {describePlace(answers.lat, answers.lng)}
        </GovAlert>
      ) : null}
      {/* Asked here when the earlier Safety step was skipped. */}
      {answers.accident ? null : (
        <GovChoiceGroup
          className="ux4g-mt-xl"
          legend="Have you seen an accident or a fall here?"
          name="accident"
          type="radio"
          options={ACCIDENT_OPTIONS}
          selected={[]}
          error={accidentError}
          onPick={onAccident}
        />
      )}
      <ReportSummary answers={answers} lang={lang} onEdit={onEdit} />
      <p className="ux4g-body-s-default ux4g-text-neutral-secondary ux4g-mt-l rb-sum-note">{copy.publicNote}</p>
    </section>
  );
}
