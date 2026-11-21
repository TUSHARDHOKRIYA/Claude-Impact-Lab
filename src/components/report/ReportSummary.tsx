import type { ReactNode } from "react";

import { issueTypeLabel, noticedWindowLabel, type LabelLanguage } from "@/lib/chip-labels";
import { describePlace } from "@/lib/place-name";
import { REVIEW_COPY } from "@/lib/review-copy";
import type { AccidentSeen, IssueType, NoticedWindow } from "@/lib/types";

export type ReportAnswers = {
  issueType: IssueType;
  preview: string;
  lat: number;
  lng: number;
  noticedWindow: NoticedWindow;
  recurs: "true" | "false";
  accident: AccidentSeen | "";
  description: string;
};

export type SummarySection = "problem" | "place" | "answers";

function Section({
  id,
  title,
  editLabel,
  onEdit,
  children,
}: {
  id: string;
  title: string;
  editLabel: string;
  onEdit?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rb-sum-section" aria-labelledby={id}>
      <div className="rb-sum-head">
        <h3 id={id} className="ux4g-heading-xs-strong">
          {title}
        </h3>
        {onEdit ? (
          <button type="button" className="rb-sum-edit touch-target" onClick={onEdit}>
            {editLabel}
            <span className="sr-only"> {title}</span>
          </button>
        ) : null}
      </div>
      <dl className="rb-sum-card">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rb-sum-row">
      <dt className="ux4g-body-s-default ux4g-text-neutral-secondary">{label}</dt>
      <dd className="ux4g-body-m-strong">{children}</dd>
    </div>
  );
}

/**
 * The report as it will appear: grouped answers in cards, each group with an
 * Edit link back to its step. Without `onEdit` it is the read-only receipt.
 */
export function ReportSummary({
  answers,
  lang,
  onEdit,
}: {
  answers: ReportAnswers;
  lang: LabelLanguage;
  onEdit?: (section: SummarySection) => void;
}) {
  const copy = REVIEW_COPY[lang];
  const edit = (section: SummarySection) => (onEdit ? () => onEdit(section) : undefined);
  const key = onEdit ? "review" : "receipt";

  return (
    <div className="rb-sum">
      <Section id={`${key}-problem`} title={copy.sections.problem} editLabel={copy.edit} onEdit={edit("problem")}>
        {answers.preview ? (
          <div className="rb-sum-row rb-sum-photo">
            <dt className="sr-only">{copy.photo}</dt>
            <dd>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={answers.preview} alt={copy.photoAlt} />
            </dd>
          </div>
        ) : null}
        <Row label={copy.fields.issueType}>{issueTypeLabel(lang, answers.issueType)}</Row>
      </Section>

      <Section id={`${key}-place`} title={copy.sections.place} editLabel={copy.edit} onEdit={edit("place")}>
        <Row label={copy.place}>{describePlace(answers.lat, answers.lng)}</Row>
      </Section>

      <Section id={`${key}-answers`} title={copy.sections.answers} editLabel={copy.edit} onEdit={edit("answers")}>
        <Row label={copy.fields.noticedAt}>{noticedWindowLabel(lang, answers.noticedWindow)}</Row>
        <Row label={copy.fields.recurs}>{answers.recurs === "true" ? copy.recursYes : copy.recursNo}</Row>
        {answers.accident ? <Row label={copy.accident}>{copy.accidentAnswers[answers.accident]}</Row> : null}
        {answers.description.trim() ? (
          <div className="rb-sum-row">
            <dt className="ux4g-body-s-default ux4g-text-neutral-secondary">{copy.fields.description}</dt>
            <dd className="ux4g-body-m-default whitespace-pre-line">{answers.description}</dd>
          </div>
        ) : null}
      </Section>
    </div>
  );
}
