"use client";

import { GovField } from "@/components/gov/GovField";
import { LocationStep, type MapPin } from "@/components/report/LocationStep";
import { QuestionStep } from "@/components/report/QuestionStep";
import { REPORT_MSG, type DetailsErrors } from "@/components/report/report-form-helpers";
import {
  ACCIDENT_SEEN,
  ACCIDENT_SEEN_LABELS,
  ISSUE_TYPES,
  ISSUE_TYPE_HINTS,
  ISSUE_TYPE_LABELS,
  NOTICED_WINDOWS,
  NOTICED_WINDOW_LABELS,
  type AccidentSeen,
  type IssueType,
  type NoticedWindow,
} from "@/lib/types";

/** The report's screens in order. Photo is first: the evidence is already in their hand. */
export const STEP = { photo: 1, issue: 2, noticed: 3, recurs: 4, accident: 5, note: 6, place: 7, review: 8 } as const;
export const STEP_LABELS = ["Photo", "Problem", "Noticed", "Repeat", "Safety", "Details", "Place", "Check"];

const ISSUE_OPTIONS = ISSUE_TYPES.map((value) => ({ value, label: ISSUE_TYPE_LABELS[value], hint: ISSUE_TYPE_HINTS[value] }));
const NOTICED_OPTIONS = NOTICED_WINDOWS.map((value) => ({ value, label: NOTICED_WINDOW_LABELS[value] }));
const RECURS_OPTIONS = [
  { value: "true", label: "Yes, it was fixed and came back" },
  { value: "false", label: "No, or I don't know" },
] as const;
const ACCIDENT_OPTIONS = ACCIDENT_SEEN.map((value) => ({ value, label: ACCIDENT_SEEN_LABELS[value] }));

/**
 * One question per screen, in order: photo, then the answers, then place.
 */
export function TapAnswerSteps(props: {
  step: number;
  issueType: IssueType | "";
  issueInvalid: boolean;
  noticedWindow: NoticedWindow | "";
  recurs: "" | "true" | "false";
  accident: AccidentSeen | "";
  description: string;
  detailsError: DetailsErrors;
  pin: MapPin | null;
  locationError: string | null;
  onIssueType: (value: IssueType) => void;
  onNoticedWindow: (value: NoticedWindow) => void;
  onRecurs: (value: "true" | "false") => void;
  onAccident: (value: AccidentSeen) => void;
  onDescription: (value: string) => void;
  onPin: (pin: MapPin | null) => void;
}) {
  switch (props.step) {
    case STEP.issue:
      return (
        <QuestionStep
          heading="What's wrong with the road?"
          name="issueType"
          options={ISSUE_OPTIONS}
          value={props.issueType}
          error={props.issueInvalid ? REPORT_MSG.issue : undefined}
          onPick={props.onIssueType}
        />
      );
    case STEP.noticed:
      return (
        <QuestionStep
          heading="When did you first notice it?"
          name="noticedWindow"
          options={NOTICED_OPTIONS}
          value={props.noticedWindow}
          error={props.detailsError.noticedWindow}
          onPick={props.onNoticedWindow}
        />
      );
    case STEP.recurs:
      return (
        <QuestionStep
          heading="Has it been fixed before and come back?"
          sub="Repairs that fail within weeks are what the ward record tracks."
          name="recurs"
          options={RECURS_OPTIONS}
          value={props.recurs}
          error={props.detailsError.recurs}
          onPick={props.onRecurs}
        />
      );
    case STEP.accident:
      return (
        <QuestionStep
          heading="Have you seen an accident or a fall here?"
          name="accident"
          options={ACCIDENT_OPTIONS}
          value={props.accident}
          error={props.detailsError.accident}
          onPick={props.onAccident}
        />
      );
    case STEP.note:
      return (
        <div className="rb-step">
          <h2 id="report-step-heading" tabIndex={-1} className="rb-step-heading rb-q">
            Anything else people should know?
          </h2>
          <p className="ux4g-body-m-default ux4g-text-neutral-secondary ux4g-mt-xs rb-measure">
            Optional. How deep, how wide, what it blocks. Leave out names and phone numbers: this becomes public.
          </p>
          <div className="ux4g-mt-l">
            <GovField
              id="description"
              label="Details (optional)"
              as="textarea"
              rows={5}
              maxLength={2000}
              placeholder="Knee-deep after every heavy rain; buses swerve into the next lane"
              value={props.description}
              onChange={(event) => props.onDescription(event.target.value)}
            />
          </div>
        </div>
      );
    case STEP.place:
      return (
        <div className="rb-step">
          <LocationStep value={props.pin} error={props.locationError} onChange={props.onPin} />
        </div>
      );
    default:
      return null;
  }
}
