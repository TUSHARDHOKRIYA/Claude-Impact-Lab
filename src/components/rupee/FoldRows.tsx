"use client";

import { useState, type ReactNode } from "react";

/** Rows kept open before a long table folds. Matches `.rb-fold` in table-stack.css. */
export const FOLD_KEEP = 6;

/**
 * A long table shows its first six rows and a button for the rest. The rows
 * are all in the page (search and print still see them); folding only hides.
 */
export function FoldRows({ total, noun, children }: { total: number; noun: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const folds = total > FOLD_KEEP + 1;
  return (
    <div className="rb-fold" data-folded={folds && !open ? "true" : undefined}>
      {children}
      {folds ? (
        <button
          type="button"
          className="ux4g-btn ux4g-btn-m ux4g-btn-text-primary touch-target rb-fold-btn"
          aria-expanded={open}
          onClick={() => setOpen((was) => !was)}
        >
          {open ? `Show fewer ${noun}` : `Show all ${total} ${noun}`}
        </button>
      ) : null}
    </div>
  );
}
