"use client";

import { useRouter } from "next/navigation";
import { useId } from "react";

/**
 * "Show: Came back (26)". One dropdown instead of six chips. Choosing an
 * option loads that filter's URL, so the list itself stays server-rendered.
 */
export function ContractFilterSelect({
  options,
  value,
}: {
  options: Array<{ key: string; label: string; count: number; href: string }>;
  value: string;
}) {
  const router = useRouter();
  const id = useId();
  return (
    <div className="rb-filter">
      <label htmlFor={id} className="ux4g-body-s-strong">
        Show
      </label>
      <select
        id={id}
        className="rb-filter-select touch-target"
        value={value}
        onChange={(event) => {
          const next = options.find((o) => o.key === event.target.value);
          if (next) router.push(next.href, { scroll: false });
        }}
      >
        {options.map((option) => (
          <option key={option.key} value={option.key} disabled={option.count === 0 && option.key !== value}>
            {option.label} ({option.count})
          </option>
        ))}
      </select>
    </div>
  );
}
