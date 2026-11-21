import type { ReactNode } from "react";

const VARIANT_CLASS = {
  info: "ux4g-alert-info",
  success: "ux4g-alert-success",
  warning: "ux4g-alert-warning",
  error: "ux4g-alert-error",
} as const;

const VARIANT_ROLE = {
  info: "status",
  success: "status",
  warning: "alert",
  error: "alert",
} as const;

export function GovAlert({
  variant = "info",
  title,
  children,
  className,
  id,
  tabIndex,
}: {
  variant?: keyof typeof VARIANT_CLASS;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  tabIndex?: number;
}) {
  const classes = ["ux4g-alert", VARIANT_CLASS[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <div id={id} className={classes} role={VARIANT_ROLE[variant]} tabIndex={tabIndex}>
      <div className="ux4g-alert-content">
        {title ? <p className="ux4g-alert-title">{title}</p> : null}
        <div className="ux4g-alert-message">{children}</div>
      </div>
    </div>
  );
}
