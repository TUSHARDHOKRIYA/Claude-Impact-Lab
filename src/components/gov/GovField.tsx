import {
  type ChangeEvent,
  type FocusEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

type FieldControl = "input" | "textarea" | "select";

type GovFieldProps = {
  label: string;
  name?: string;
  id?: string;
  as?: FieldControl;
  type?: "text" | "password" | "number" | "date" | "email" | "search";
  error?: string;
  hint?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  onBlur?: (
    event: FocusEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  children?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  max?: string | number;
  min?: string | number;
  step?: string | number;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";
  rows?: number;
  className?: string;
};

function slugToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function fieldIdFor(id?: string, name?: string, label?: string): string {
  if (id) return id;
  const named = name ? slugToken(name) : "";
  if (named) return named;
  const labelled = label ? slugToken(label) : "";
  return labelled ? `gov-field-${labelled}` : "gov-field";
}

export function GovField({
  label,
  name,
  id,
  as = "input",
  type = "text",
  error,
  hint,
  value,
  defaultValue,
  onChange,
  onBlur,
  children,
  required,
  disabled,
  readOnly,
  maxLength,
  max,
  min,
  step,
  placeholder,
  autoComplete,
  inputMode,
  rows,
  className,
}: GovFieldProps) {
  const fieldId = fieldIdFor(id, name, label);
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ") || undefined;
  const invalid = Boolean(error);
  const shared = {
    id: fieldId,
    name,
    value,
    defaultValue,
    onChange,
    onBlur,
    required,
    disabled,
    "aria-invalid": invalid || undefined,
    "aria-describedby": describedBy,
    className:
      as === "textarea" ? "ux4g-textarea touch-target" : "ux4g-input touch-target",
  };
  const tree = [
    "ux4g-form-group",
    "ux4g-input-container",
    "ux4g-input-m",
    invalid ? "ux4g-input-error" : "ux4g-input-default",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={tree}>
      <label htmlFor={fieldId}>{label}</label>
      {as === "textarea" ? (
        <textarea
          {...shared}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          readOnly={readOnly}
        />
      ) : as === "select" ? (
        <select {...(shared as SelectHTMLAttributes<HTMLSelectElement>)}>
          {children}
        </select>
      ) : (
        <input
          {...shared}
          type={type}
          maxLength={maxLength}
          max={max}
          min={min}
          step={step}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          readOnly={readOnly}
        />
      )}
      {hint ? (
        <span id={hintId} className="ux4g-input-helper">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="ux4g-input-helper" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
