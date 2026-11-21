"use client";

import { GovChoiceGroup } from "@/components/gov/GovChoiceGroup";
import { VoiceBadge } from "@/components/report/VoiceBadge";
import { ISSUE_TYPES, ISSUE_TYPE_HINTS, ISSUE_TYPE_LABELS, type IssueType } from "@/lib/types";

const OPTIONS = ISSUE_TYPES.map((value) => ({
  value,
  label: ISSUE_TYPE_LABELS[value],
  hint: ISSUE_TYPE_HINTS[value],
}));

type IssueTypePickerProps = {
  value: IssueType | "";
  onChange: (value: IssueType) => void;
  error?: string | null;
  /** Voice filled this and the person has not changed it since. */
  fromVoice?: boolean;
};

export function IssueTypePicker({ value, onChange, error, fromVoice }: IssueTypePickerProps) {
  return (
    <GovChoiceGroup
      className="ux4g-mt-m"
      legend="What is wrong with the road?"
      hideLegend
      name="issueType"
      type="radio"
      options={OPTIONS}
      selected={value ? [value] : []}
      error={error ?? undefined}
      badge={fromVoice ? <VoiceBadge /> : null}
      onPick={onChange}
    />
  );
}
