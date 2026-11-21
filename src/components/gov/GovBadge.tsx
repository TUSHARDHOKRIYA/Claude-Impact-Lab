import type { ReactNode } from "react";

/** UX4G 3.3.3 tags. Tonal for status, so colour never carries the meaning alone: the text does. */
const TONE_CLASS = {
  primary: "ux4g-tag-tonal-primary",
  info: "ux4g-tag-tonal-info",
  success: "ux4g-tag-tonal-success",
  warning: "ux4g-tag-tonal-warning",
  error: "ux4g-tag-tonal-error",
  neutral: "ux4g-tag-tonal-neutral",
} as const;

export function GovBadge({
  children,
  tone = "neutral",
  className,
  small = false,
}: {
  children: ReactNode;
  small?: boolean;
  tone?: keyof typeof TONE_CLASS;
  className?: string;
}) {
  const classes = [TONE_CLASS[tone], small ? "ux4g-tag-s" : null, className].filter(Boolean).join(" ");
  return <span className={classes}>{children}</span>;
}
