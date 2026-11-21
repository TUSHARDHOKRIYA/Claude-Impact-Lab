import { formatInr, formatInrShort } from "@/lib/rupee/format";
import type { WardLedger } from "@/lib/rupee/types";

type Outcome = WardLedger["outcome"];

export const OUTCOME_PARTS = [
  { key: "heldInr", label: "Held up", tone: "held", mark: "✓" },
  {
    key: "flaggedInr",
    label: "Needs an explanation",
    tone: "flagged",
    mark: "!",
  },
  {
    key: "failedInr",
    label: "Failed within 30 days",
    tone: "failed",
    mark: "✕",
  },
] as const;

function share(value: number, of: number): string {
  return `${Math.round((value / Math.max(of, 1)) * 100)}%`;
}

/**
 * Where the spend went: one stacked bar, drawn against the budget. The bar
 * spans the larger of budget and spend, and the budget is a stop line. The
 * table under it is the text version, so no amount relies on colour.
 */
export function OutcomeBar({
  outcome,
  spentInr,
  budgetInr,
  compact = false,
  label,
}: {
  outcome: Outcome;
  spentInr: number;
  budgetInr: number;
  compact?: boolean;
  label: string;
}) {
  const scale = Math.max(spentInr, budgetInr, 1);
  const budgetAt = (budgetInr / scale) * 100;
  const over = spentInr - budgetInr;
  const summary = OUTCOME_PARTS.map(
    (part) => `${part.label} ${share(outcome[part.key], spentInr)}`,
  ).join(", ");

  return (
    <figure
      className={compact ? "rb-outcome rb-outcome-compact" : "rb-outcome"}
    >
      <div
        className="rb-outcome-track"
        role="img"
        aria-label={`${label}. ${summary}.`}
      >
        <div
          className="rb-outcome-fill"
          style={{ width: `${(spentInr / scale) * 100}%` }}
        >
          {OUTCOME_PARTS.map((part) =>
            outcome[part.key] > 0 ? (
              <span
                key={part.key}
                className={`rb-seg rb-seg-${part.tone}`}
                style={{ flexGrow: outcome[part.key] }}
                title={`${part.label}: ${formatInr(outcome[part.key])}`}
              />
            ) : null,
          )}
        </div>
        <span
          className="rb-budget-line"
          style={{ left: `${budgetAt}%` }}
          aria-hidden="true"
        />
      </div>
      {compact ? null : (
        <>
          <figcaption className="ux4g-body-s-default ux4g-text-neutral-secondary ux4g-mt-xs">
            The line marks the {formatInrShort(budgetInr)} budget.{" "}
            {over > 0
              ? `Spending ran ${formatInrShort(over)} past it.`
              : `${formatInrShort(-over)} of it is unspent.`}
          </figcaption>
          <table className="ux4g-table ux4g-table-s ux4g-mt-s rb-outcome-table">
            <caption className="sr-only">{label}</caption>
            <thead>
              <tr>
                <th scope="col">Outcome</th>
                <th scope="col" className="rb-num">
                  Amount
                </th>
                <th scope="col" className="rb-num">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {OUTCOME_PARTS.map((part) => (
                <tr key={part.key}>
                  <th scope="row">
                    <span className="rb-outcome-label">
                      <span
                        className={`rb-key rb-seg-${part.tone}`}
                        aria-hidden="true"
                      >
                        {part.mark}
                      </span>
                      {part.label}
                    </span>
                  </th>
                  <td className="rb-num">{formatInr(outcome[part.key])}</td>
                  <td className="rb-num">
                    {share(outcome[part.key], spentInr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </figure>
  );
}
