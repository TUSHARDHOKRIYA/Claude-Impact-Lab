"use client";

import { GovChoiceGroup, type ChoiceOption } from "@/components/gov/GovChoiceGroup";

/**
 * One question per screen: a large heading that is the question, an optional
 * line under it, and full-width option rows with the radio on the right.
 */
export function QuestionStep<T extends string>({
  heading,
  sub,
  name,
  options,
  value,
  error,
  onPick,
}: {
  heading: string;
  sub?: string;
  name: string;
  options: readonly ChoiceOption<T>[];
  value: T | "";
  error?: string;
  onPick: (value: T) => void;
}) {
  return (
    <div className="rb-step">
      <h2 id="report-step-heading" tabIndex={-1} className="rb-step-heading rb-q">
        {heading}
      </h2>
      {sub ? <p className="ux4g-body-m-default ux4g-text-neutral-secondary ux4g-mt-xs rb-measure">{sub}</p> : null}
      <GovChoiceGroup
        className="ux4g-mt-l"
        legend={heading}
        hideLegend
        name={name}
        type="radio"
        options={options}
        selected={value ? [value] : []}
        error={error}
        onPick={onPick}
      />
    </div>
  );
}
