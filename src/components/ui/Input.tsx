// src/components/ui/Input.tsx
"use client"

import React from "react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional leading icon */
  icon?: React.ReactNode
}

/**
 * Input component styled with design‑system tokens.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ icon, className = "", ...rest }, ref) {
    const base = "rb-input bg-overcast text-ink border border-rule rounded-md focus:outline-none focus:ring-2 focus:ring-enamel"
    return (
      <div className="flex items-center">
        {icon && <span className="inline-flex mr-2">{icon}</span>}
        <input ref={ref} className={`${base} ${className}`} {...rest} />
      </div>
    )
  }
)

Input.displayName = "Input"
