import type { ReactNode } from "react";
import Link from "next/link";

const VARIANT_CLASS = {
  primary: "ux4g-btn-primary",
  secondary: "ux4g-btn-outline-primary",
  ghost: "ux4g-btn-text-primary",
} as const;

type Variant = keyof typeof VARIANT_CLASS;

type GovButtonShared = {
  children: ReactNode;
  variant?: Variant;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-describedby"?: string;
  "aria-busy"?: boolean;
};

type GovButtonAsButton = GovButtonShared & {
  href?: undefined;
  type?: "button" | "submit";
  onClick?: () => void;
};

type GovButtonAsLink = GovButtonShared & {
  href: string;
  type?: never;
  onClick?: never;
  target?: string;
  rel?: string;
};

export type GovButtonProps = GovButtonAsButton | GovButtonAsLink;

function buttonClasses(variant: Variant, className?: string): string {
  return ["ux4g-btn", "ux4g-btn-l", VARIANT_CLASS[variant], "touch-target", className]
    .filter(Boolean)
    .join(" ");
}

export function GovButton(props: GovButtonProps) {
  const { children, variant = "primary", disabled, className, id } = props;
  const classes = buttonClasses(variant, className);
  const describedBy = props["aria-describedby"];
  const busy = props["aria-busy"];

  if ("href" in props && props.href) {
    return (
      <Link
        href={props.href}
        id={id}
        target={props.target}
        rel={props.rel}
        className={classes}
        aria-disabled={disabled || undefined}
        aria-describedby={describedBy}
        tabIndex={disabled ? -1 : undefined}
        onClick={
          disabled
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
              }
            : undefined
        }
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      id={id}
      type={props.type ?? "button"}
      disabled={disabled}
      onClick={props.onClick}
      className={classes}
      aria-describedby={describedBy}
      aria-busy={busy || undefined}
    >
      {children}
    </button>
  );
}
