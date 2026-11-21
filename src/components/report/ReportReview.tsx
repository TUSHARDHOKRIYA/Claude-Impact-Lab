import { GovAlert } from "@/components/gov/GovAlert";
import { GovChoiceGroup } from "@/components/gov/GovChoiceGroup";
import { affectsLabel, issueTypeLabel, noticedWindowLabel, toLabelLanguage } from "@/lib/chip-labels";
import { describePlace } from "@/lib/place-name";
import { REVIEW_COPY } from "@/lib/review-copy";
import { wardAt } from "@/lib/city";
import {
  ACCIDENT_SEEN,
  ACCIDENT_SEEN_LABELS,
  type AccidentSeen,
  type Affects,
  type IssueType,
  type NoticedWindow,
} from "@/lib/types";

const ACCIDENT_OPTIONS = ACCIDENT_SEEN.map((value) => ({ value, label: ACCIDENT_SEEN_LABELS[value] }));

export function ReportReview({
  issueType,
  preview,
  lat,
  lng,
  noticedWindow,
  recurs,
  accident,
  accidentError,
  onAccident,
  affects,
  description,
  voiceLanguageCode,
  locationConfirmed,
}: {
  issueType: IssueType;
  preview: string;
  lat: number;
  lng: number;
  noticedWindow: NoticedWindow;
  recurs: "true" | "false";
  accident: AccidentSeen | "";
  accidentError?: string;
  onAccident: (value: AccidentSeen) => void;
  affects: Affects[];
  description: string;
  voiceLanguageCode: string;
  locationConfirmed: boolean;
}) {
  const lang = toLabelLanguage(voiceLanguageCode);
  const copy = REVIEW_COPY[lang];
  const place = describePlace(lat, lng);
  const ward = wardAt(lat, lng);

  return (
    <section className="rh-step" lang={lang}>
      <h2 id="report-step-heading" tabIndex={-1} className="rh-step-heading ux4g-title-l-strong">
        {copy.heading}
      </h2>
      <p className="ux4g-body-m-default ux4g-text-neutral-secondary ux4g-mt-xs rh-measure">
        {copy.anonymous}{lang === "hi" ? "।" : "."} {copy.publicNote}
      </p>
      {ward ? (
        <GovAlert variant="info" className="ux4g-mt-m">
          This goes on the {ward} ward record, next to what the ward spent on this road.
        </GovAlert>
      ) : null}
      {!locationConfirmed ? (
        <GovAlert variant="warning" className="ux4g-mt-s">
          {copy.pinNotConfirmed} {place}
        </GovAlert>
      ) : null}
      {accident ? null : (
        <GovChoiceGroup
          className="ux4g-mt-xl"
          legend="Have you seen an accident or a fall here?"
          name="accident"
          type="radio"
          options={ACCIDENT_OPTIONS}
          selected={[]}
          error={accidentError}
          columns={2}
          onPick={onAccident}
        />
      )}
      <article className="ux4g-card ux4g-card-solid ux4g-card-vertical ux4g-mt-xl">
        <dl className="ux4g-card-body rh-review-list">
        <div>
          <dt className="ux4g-body-s-default ux4g-text-neutral-secondary">{copy.fields.issueType}</dt>
          <dd className="ux4g-body-m-strong">{issueTypeLabel(lang, issueType)}</dd>
        </div>
        {preview ? (
          <div>
            <dt className="ux4g-body-s-default ux4g-text-neutral-secondary">{copy.photo}</dt>
            <dd>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt={copy.photoAlt}
                className="ux4g-mt-xs ux4g-radius-m max-h-64 w-full object-cover"
              />
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="ux4g-body-s-default ux4g-text-neutral-secondary">{copy.place}</dt>
          <dd className="ux4g-body-m-strong">{place}</dd>
        </div>
        <div>
          <dt className="ux4g-body-s-default ux4g-text-neutral-secondary">{copy.fields.noticedAt}</dt>
          <dd className="ux4g-body-m-strong">{noticedWindowLabel(lang, noticedWindow)}</dd>
        </div>
        <div>
          <dt className="ux4g-body-s-default ux4g-text-neutral-secondary">{copy.fields.recurs}</dt>
          <dd className="ux4g-body-m-strong">{recurs === "true" ? copy.recursYes : copy.recursNo}</dd>
        </div>
        {accident ? (
          <div>
            <dt className="ux4g-body-s-default ux4g-text-neutral-secondary">Accident or fall seen</dt>
            <dd className="ux4g-body-m-strong">{ACCIDENT_SEEN_LABELS[accident]}</dd>
          </div>
        ) : null}
        <div>
          <dt className="ux4g-body-s-default ux4g-text-neutral-secondary">{copy.fields.affects}</dt>
          <dd className="ux4g-body-m-strong">
            {affects.map((item) => affectsLabel(lang, item)).join(", ")}
          </dd>
        </div>
        {description.trim() ? (
          <div>
            <dt className="ux4g-body-s-default ux4g-text-neutral-secondary">{copy.fields.description}</dt>
            <dd className="ux4g-body-m-default whitespace-pre-line">{description}</dd>
          </div>
        ) : null}
        </dl>
      </article>
    </section>
  );
}
