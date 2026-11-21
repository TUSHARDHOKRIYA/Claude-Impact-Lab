"use client";

import { GovChoiceGroup } from "@/components/gov/GovChoiceGroup";
import { GovField } from "@/components/gov/GovField";
import { VoiceBadge } from "@/components/report/VoiceBadge";
import {
  ACCIDENT_SEEN,
  ACCIDENT_SEEN_LABELS,
  NOTICED_WINDOWS,
  NOTICED_WINDOW_LABELS,
  type AccidentSeen,
  type NoticedWindow,
} from "@/lib/types";

export type DetailsErrors = {
  noticedWindow?: string;
  recurs?: string;
  accident?: string;
};

const RECURS_OPTIONS = [
  { value: "true", label: "Yes, it was fixed and came back" },
  { value: "false", label: "No, or I don't know" },
] as const;

const NOTICED_OPTIONS = NOTICED_WINDOWS.map((value) => ({ value, label: NOTICED_WINDOW_LABELS[value] }));
const ACCIDENT_OPTIONS = ACCIDENT_SEEN.map((value) => ({ value, label: ACCIDENT_SEEN_LABELS[value] }));

/** Step 3: how long it has been there and whether a repair failed before. */
export function HistoryFields({
  noticedWindow,
  recurs,
  error,
  fromVoice,
  onNoticedWindow,
  onRecurs,
}: {
  noticedWindow: NoticedWindow | "";
  recurs: "" | "true" | "false";
  error: DetailsErrors;
  fromVoice?: ReadonlySet<string>;
  onNoticedWindow: (value: NoticedWindow) => void;
  onRecurs: (value: "true" | "false") => void;
}) {
  return (
    <div>
      <h2 id="report-step-heading" tabIndex={-1} className="rb-step-heading ux4g-title-l-strong">
        When did you first notice it?
      </h2>
      <GovChoiceGroup
        className="ux4g-mt-m"
        legend="When did you first notice it?"
        hideLegend
        name="noticedWindow"
        type="radio"
        options={NOTICED_OPTIONS}
        selected={noticedWindow ? [noticedWindow] : []}
        error={error.noticedWindow}
        badge={fromVoice?.has("noticedWindow") ? <VoiceBadge /> : null}
        onPick={onNoticedWindow}
      />
      <GovChoiceGroup
        className="ux4g-mt-2xl"
        legend="Has it been repaired before and come back?"
        name="recurs"
        type="radio"
        options={RECURS_OPTIONS}
        selected={recurs ? [recurs] : []}
        error={error.recurs}
        badge={fromVoice?.has("recurs") ? <VoiceBadge /> : null}
        onPick={onRecurs}
      />
    </div>
  );
}

/** Step 4: harm seen and an optional note. */
export function ImpactFields({
  accident,
  description,
  error,
  fromVoice,
  onAccident,
  onDescription,
}: {
  accident: AccidentSeen | "";
  description: string;
  error: DetailsErrors;
  fromVoice?: ReadonlySet<string>;
  onAccident: (value: AccidentSeen) => void;
  onDescription: (value: string) => void;
}) {
  return (
    <div>
      <h2 id="report-step-heading" tabIndex={-1} className="rb-step-heading ux4g-title-l-strong">
        Have you seen an accident or a fall here?
      </h2>
      <GovChoiceGroup
        className="ux4g-mt-m"
        legend="Have you seen an accident or a fall here?"
        hideLegend
        name="accident"
        type="radio"
        options={ACCIDENT_OPTIONS}
        selected={accident ? [accident] : []}
        error={error.accident}
        columns={2}
        onPick={onAccident}
      />
      <div className="ux4g-mt-2xl">
        {fromVoice?.has("description") ? <VoiceBadge className="mb-1 ml-0" /> : null}
        <GovField
          id="description"
          label="Anything else? (optional)"
          as="textarea"
          name="description"
          rows={3}
          maxLength={2000}
          value={description}
          placeholder="For example: next to the bus stop, deep enough to stop a scooter"
          onChange={(event) => onDescription(event.target.value)}
        />
      </div>
    </div>
  );
}
