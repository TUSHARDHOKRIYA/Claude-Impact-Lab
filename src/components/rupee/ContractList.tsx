import Link from "next/link";

import { GovBadge } from "@/components/gov/GovBadge";
import { ContractFilterSelect } from "@/components/rupee/ContractFilterSelect";
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

/** Every contract, newest first, narrowed by one dropdown. */
export function ContractList({
  orders,
  basePath,
  filter,
  limit,
  total,
  counts,
}: {
  orders: ScoredOrder[];
  basePath: string;
  filter: ContractFilterKey;
  limit: number;
  total: number;
  /** How many jobs each filter matches, for the dropdown. */
  counts: Record<ContractFilterKey, number>;
}) {
  const shown = orders.slice(0, limit);
  const query = (extra: Record<string, string>) => {
    const params = new URLSearchParams(extra);
    return `${basePath}?${params.toString()}#contracts`;
  };
  return (
    <>
      <div className="rb-filter-row">
        <ContractFilterSelect
          value={filter}
          options={CONTRACT_FILTERS.map((option) => ({
            key: option.key,
            label: option.label,
            count: counts[option.key],
            href: option.key === "all" ? `${basePath}#contracts` : query({ show: option.key }),
          }))}
        />
        <p className="ux4g-body-s-default ux4g-text-neutral-secondary" aria-live="polite">
          Showing {shown.length} of {orders.length} {orders.length === total ? "jobs" : `matching jobs (${total} in all)`}.
        </p>
      </div>
      <div className="ux4g-table-responsive ux4g-mt-xs">
        <table className="ux4g-table ux4g-table-s rb-table rb-stack">
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
                <td className="rb-full">
                  {order.roadName}{" "}
                  <Link href={`/wards/${wardSlug(order.ward)}`} className="ux4g-text-link-s">
                    {order.ward}
                  </Link>
                </td>
                <td className="rb-full rb-sub">{order.method}</td>
                <td data-label="Billed" className="rb-num rb-half">{formatInr(order.costInr)}</td>
                <td data-label="Rate card" className="rb-num rb-half">{formatInr(Math.round(order.expectedCostInr))}</td>
                <td className="rb-notes rb-full">
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
            href={query({ ...(filter === "all" ? {} : { show: filter }), n: String(limit + 25) })}
            className="ux4g-btn-outline-primary ux4g-btn-m touch-target"
            scroll={false}
          >
            Show {Math.min(25, orders.length - shown.length)} more
          </Link>
        </p>
      ) : null}
    </>
  );
}
