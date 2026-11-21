"use client";

import { IssueTypePicker } from "@/components/report/IssueTypePicker";
import { LocationStep, type MapPin } from "@/components/report/LocationStep";
import { HistoryFields, ImpactFields, type DetailsErrors } from "@/components/report/ReportDetailsFields";
import { REPORT_MSG } from "@/components/report/report-form-helpers";
import type { VoiceField } from "@/components/report/use-report-voice";
import type { AccidentSeen, IssueType, NoticedWindow } from "@/lib/types";

export const TAP_STEP = { issue: 2, history: 3, impact: 4, place: 5 } as const;

/**
 * The Tap way to answer: at most two questions per screen, the same fields the
 * voice chat fills. A badge marks anything voice filled until the person edits it.
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
  voiceFilled: ReadonlySet<VoiceField>;
  pin: MapPin | null;
  locationError: string | null;
  locationConfirmed: boolean;
  onIssueType: (value: IssueType) => void;
  onNoticedWindow: (value: NoticedWindow) => void;
  onRecurs: (value: "true" | "false") => void;
  onAccident: (value: AccidentSeen) => void;
  onDescription: (value: string) => void;
  onPin: (pin: MapPin) => void;
  onConfirmPin: () => void;
}) {
  if (props.step === TAP_STEP.issue) {
    return (
      <div className="rb-step">
        <h2 id="report-step-heading" tabIndex={-1} className="rb-step-heading ux4g-title-l-strong">
          What is wrong with the road?
        </h2>
        <IssueTypePicker
          value={props.issueType}
          error={props.issueInvalid ? REPORT_MSG.issue : null}
          fromVoice={props.voiceFilled.has("issueType")}
          onChange={props.onIssueType}
        />
      </div>
    );
  }
  if (props.step === TAP_STEP.history) {
    return (
      <div className="rb-step">
        <HistoryFields
          noticedWindow={props.noticedWindow}
          recurs={props.recurs}
          error={props.detailsError}
          fromVoice={props.voiceFilled}
          onNoticedWindow={props.onNoticedWindow}
          onRecurs={props.onRecurs}
        />
      </div>
    );
  }
  if (props.step === TAP_STEP.impact) {
    return (
      <div className="rb-step">
        <ImpactFields
          accident={props.accident}
          description={props.description}
          error={props.detailsError}
          fromVoice={props.voiceFilled}
          onAccident={props.onAccident}
          onDescription={props.onDescription}
        />
      </div>
    );
  }
  if (props.step === TAP_STEP.place) {
    return (
      <div className="rb-step">
        <LocationStep
          value={props.pin}
          error={props.locationError}
          onChange={props.onPin}
          confirmed={props.locationConfirmed}
          onConfirm={props.onConfirmPin}
        />
      </div>
    );
  }
  return null;
}
