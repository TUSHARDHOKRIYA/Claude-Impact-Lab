/**
 * Udyam-Saathi's ProvenanceBadge: a small pill saying where a value came from.
 * #404040 on #f5f5f5 is 9.4:1, so the 12px text clears AA.
 */
export function VoiceBadge({ label = "From voice", className }: { label?: string; className?: string }) {
  return (
    <span
      className={`ml-2 inline-flex w-fit items-center rounded-full border border-rule-firm bg-sheet px-2 py-0.5 align-middle text-xs font-semibold leading-4 text-mist ${className ?? ""}`}
    >
      {label}
    </span>
  );
}
