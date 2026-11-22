// src/components/ui/Button.tsx
"use client";

import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual variant of the button.
   * - "primary" uses the enamel color.
   * - "secondary" uses the overcast background.
   * - "danger" uses the failed color.
   */
  variant?: "primary" | "secondary" | "danger";
  /** Optional icon element placed before the label */
  icon?: React.ReactNode;
}

/**
 * Simple button component that maps design‑system tokens to Tailwind‑compatible classes.
 * The project already includes ux4g‑web‑components which provide CSS variables.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", className = "", icon, children, ...rest }, ref) {
    const base = "rb-button ux4g-body-m-default px-4 py-2 rounded-md transition-shadow";
    const variantClass = {
      primary: "bg-enamel text-white hover:bg-enamel-soft",
      secondary: "bg-overcast text-ink hover:bg-sheet",
      danger: "bg-failed text-white hover:bg-failed-bg",
    }[variant];
    return (
      <button
        ref={ref}
        className={`${base} ${variantClass} ${className}`}
        {...rest}
      >
        {icon && <span className="inline-flex mr-2 align-middle">{icon}</span>}
        <span className="align-middle">{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
