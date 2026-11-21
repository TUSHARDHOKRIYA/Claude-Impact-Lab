import Link from "next/link";

import { GovBadge } from "@/components/gov/GovBadge";
import { formatInr } from "@/lib/rupee/format";
import type { ScoredOrder } from "@/lib/rupee/scorecard";
import { wardSlug } from "@/lib/rupee/slug";

export const CONTRACT_FILTERS = [
  { key: "all", label: "All jobs", test: () => true },
  { key: "reopened", label: "Came back", test: (o: ScoredOrder) => o.reopened },
  { key: "repeat", label: "Fixed again", test: (o: ScoredOrder) => o.repeatOf !== null },
  { key: "over", label: "Billed far over", test: (o: ScoredOrder) => o.overBilled },
  { key: "late", label: "Late", test: (o: ScoredOrder) => !o.slaMet },
  { key: "dlp", label: "Paid under guarantee", test: (o: ScoredOrder) => o.underDlp },
] as const;

export type ContractFilterKey = (typeof CONTRACT_FILTERS)[number]["key"];

export function contractFilterOf(value: string | undefined): ContractFilterKey {
  return CONTRACT_FILTERS.find((f) => f.key === value)?.key ?? "all";
}

function marks(order: ScoredOrder): Array<{ text: string; tone: "error" | "warning" | "info" | "neutral" }> {
  const out: Array<{ text: string; tone: "error" | "warning" | "info" | "neutral" }> = [];
  if (order.reopened) out.push({ text: "Came back", tone: "error" });
  if (order.overBilled) out.push({ text: "Billed far over", tone: "error" });
  if (order.repeatOf) out.push({ text: `Fixed again after ${order.repeatOf.days} days`, tone: "warning" });
  if (!order.slaMet) out.push({ text: "Late", tone: "warning" });
  if (order.underDlp) out.push({ text: "Under guarantee", tone: "info" });
  return out;
}

/** Every contract, newest first. The filter chips are plain links, so the list works without JavaScript. */
export function ContractList({
  orders,
  basePath,
  filter,
  limit,
  total,
}: {
  orders: ScoredOrder[];
  basePath: string;
  filter: ContractFilterKey;
  limit: number;
  total: number;
}) {
  const shown = orders.slice(0, limit);
  const query = (extra: Record<string, string>) => {
    const params = new URLSearchParams(extra);
    return `${basePath}?${params.toString()}#contracts`;
  };
  return (
    <>
      <nav className="rb-sort rb-sort-wrap" aria-label="Filter contracts">
        {CONTRACT_FILTERS.map((option) => (
          <Link
            key={option.key}
            href={option.key === "all" ? `${basePath}#contracts` : query({ show: option.key })}
            className={filter === option.key ? "ux4g-filter-chip-m active touch-target" : "ux4g-filter-chip-m touch-target"}
            aria-current={filter === option.key ? "true" : undefined}
            scroll={false}
          >
            {option.label}
          </Link>
        ))}
      </nav>
      <p className="ux4g-body-s-default ux4g-text-neutral-secondary ux4g-mt-xs" aria-live="polite">
        Showing {shown.length} of {orders.length} {orders.length === total ? "jobs" : `matching jobs (${total} in all)`}.
      </p>
      <div className="ux4g-table-responsive ux4g-mt-xs">
        <table className="ux4g-table ux4g-table-s rb-table">
          <caption className="sr-only">Contracts, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Work order</th>
              <th scope="col">Road</th>
              <th scope="col">Method</th>
              <th scope="col" className="rb-num">Billed</th>
              <th scope="col" className="rb-num">Rate card</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((order) => (
              <tr key={order.id}>
                <th scope="row">
                  {order.id}
                  <span className="ux4g-body-xs-default ux4g-text-neutral-secondary"> {order.completedAt.slice(0, 10)}</span>
                </th>
                <td>
                  {order.roadName}{" "}
                  <Link href={`/wards/${wardSlug(order.ward)}`} className="ux4g-text-link-s">
                    {order.ward}
                  </Link>
                </td>
                <td>{order.method}</td>
                <td className="rb-num">{formatInr(order.costInr)}</td>
                <td className="rb-num">{formatInr(Math.round(order.expectedCostInr))}</td>
                <td className="rb-notes">
                  {marks(order).map((mark) => (
                    <GovBadge key={mark.text} tone={mark.tone} small>
                      {mark.text}
                    </GovBadge>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {orders.length > shown.length ? (
        <p className="ux4g-mt-s">
          <Link
            href={query({ ...(filter === "all" ? {} : { show: filter }), n: String(limit + 50) })}
            className="ux4g-btn-outline-primary ux4g-btn-m touch-target"
            scroll={false}
          >
            Show {Math.min(50, orders.length - shown.length)} more
          </Link>
        </p>
      ) : null}
    </>
  );
}
