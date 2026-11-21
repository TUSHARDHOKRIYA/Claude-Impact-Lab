import type { ReactNode } from "react";

import { GovChoice } from "@/components/gov/GovChoice";

export type ChoiceOption<T extends string> = { value: T; label: string; hint?: string };

/**
 * A UX4G form group of option cards. Each card is the label, so the whole
 * card is the tap target on a phone.
 */
export function GovChoiceGroup<T extends string>({
  legend,
  hint,
  name,
  type,
  options,
  selected,
  error,
  badge,
  columns = 1,
  hideLegend = false,
  onPick,
  className,
}: {
  legend: string;
  hint?: string;
  name: string;
  type: "radio" | "checkbox";
  options: readonly ChoiceOption<T>[];
  selected: readonly T[];
  error?: string;
  badge?: ReactNode;
  columns?: 1 | 2;
  /** The step heading already asks this question; keep the legend for screen readers only. */
  hideLegend?: boolean;
  onPick: (value: T) => void;
  className?: string;
}) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset
      className={["ux4g-form-group rh-choice-group", className].filter(Boolean).join(" ")}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
    >
      <legend className={hideLegend ? "sr-only" : "rh-legend ux4g-heading-xs-strong"}>
        {legend}
        {badge}
      </legend>
      {hint ? (
        <p id={hintId} className="ux4g-body-s-default ux4g-text-neutral-secondary">
          {hint}
        </p>
      ) : null}
      <div className={columns === 2 ? "rh-options rh-options-2" : "rh-options"}>
        {options.map((option) => (
          <GovChoice
            key={option.value}
            type={type}
            name={name}
            value={option.value}
            checked={selected.includes(option.value)}
            error={Boolean(error)}
            card
            label={option.label}
            description={option.hint}
            onChange={() => onPick(option.value)}
          />
        ))}
      </div>
      {error ? (
        <span id={errorId} className="ux4g-body-s-strong ux4g-text-error-default" role="alert">
          {error}
        </span>
      ) : null}
    </fieldset>
  );
}
