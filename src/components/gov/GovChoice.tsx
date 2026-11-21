import type { ChangeEvent, ReactNode } from "react";

type GovChoiceProps = {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  /** Draw as a UX4G option card: the whole bordered card is the tap target. */
  card?: boolean;
  label: ReactNode;
  description?: ReactNode;
};

/**
 * UX4G 3.3.3 radio or checkbox. As a card it uses the option-card pattern
 * (`ux4g-aadhaar-option-card`) with the radio label and description slots.
 */
export function GovChoice({
  type,
  name,
  value,
  checked,
  defaultChecked,
  onChange,
  disabled,
  error,
  className,
  card = false,
  label,
  description,
}: GovChoiceProps) {
  const isRadio = type === "radio";
  const root = isRadio ? "ux4g-radio" : "ux4g-checkbox";
  const classes = [
    root,
    `${root}-m`,
    card ? "ux4g-aadhaar-option-card" : null,
    error ? `${root}-error` : null,
    "touch-target",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={classes}>
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
        className={isRadio ? "ux4g-radio-input" : "ux4g-checkbox-input"}
        aria-invalid={error || undefined}
      />
      <span className={isRadio ? "ux4g-radio-control" : "ux4g-checkbox-control"}>
        <span className={isRadio ? "ux4g-radiomark" : "ux4g-checkmark"} />
      </span>
      <span className={isRadio ? "ux4g-radio-content" : "ux4g-checkbox-content"}>
        {/* Inner spans carry the type: UX4G forces both slots to inherit the card's size and weight. */}
        <span className="ux4g-radio-label">
          <span className="rb-choice-label">{label}</span>
        </span>
        {description ? (
          <span className="ux4g-radio-description">
            <span className="rb-choice-desc">{description}</span>
          </span>
        ) : null}
      </span>
    </label>
  );
}
