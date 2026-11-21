"use client";

import { useState } from "react";

import { GovBadge } from "@/components/gov/GovBadge";
import { formatInr, formatInrShort } from "@/lib/rupee/format";
import { pct } from "@/lib/rupee/slug";
import type { NextRupeeItem } from "@/lib/rupee/types";

const PRESETS = [
  { label: "₹5 L", value: 500_000 },
  { label: "₹10 L", value: 1_000_000 },
  { label: "₹25 L", value: 2_500_000 },
  { label: "₹50 L", value: 5_000_000 },
] as const;

/** Interactive ward budget-cap simulator separating ₹0 DLP recoveries from funded repairs. */
export function BudgetSimulator({
  wardCode,
  wardBudgetInr,
  items,
}: {
  wardCode: string;
  wardBudgetInr: number;
  items: NextRupeeItem[];
}) {
  const defaultCap = Math.min(2_500_000, Math.max(500_000, Math.round(wardBudgetInr * 0.25)));
  const [budgetInr, setBudgetInr] = useState(defaultCap);

  if (items.length === 0) {
    return <p className="ux4g-body-m-default ux4g-text-neutral-secondary">No open risks ranked for this ward.</p>;
  }

  const dlpFree: NextRupeeItem[] = [];
  const funded: NextRupeeItem[] = [];
  const deferred: NextRupeeItem[] = [];
  let allocatedInr = 0;

  for (const item of items) {
    if (item.underDlp) {
      dlpFree.push(item);
      continue;
    }
    const cost = Math.max(0, item.estCostInr);
    if (allocatedInr + cost <= budgetInr) {
      funded.push(item);
      allocatedInr += cost;
    } else {
      deferred.push(item);
    }
  }
  const remainingInr = Math.max(0, budgetInr - allocatedInr);

  return (
    <div className="space-y-4">
      <div className="ux4g-card ux4g-card-solid ux4g-card-vertical p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="ward-budget-cap" className="ux4g-body-m-strong">
            Simulate next-tranche budget for {wardCode} ward
          </label>
          <span className="ux4g-heading-xs-strong">{formatInrShort(budgetInr)}</span>
        </div>
        <input
          id="ward-budget-cap"
          type="range"
          min={200_000}
          max={Math.max(5_000_000, wardBudgetInr)}
          step={100_000}
          value={budgetInr}
          onChange={(e) => setBudgetInr(Number(e.target.value))}
          className="mt-3 w-full accent-indigo-700"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setBudgetInr(p.value)}
              className={
                budgetInr === p.value
                  ? "ux4g-filter-chip-m active touch-target"
                  : "ux4g-filter-chip-m touch-target"
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="ux4g-body-s-default ux4g-text-neutral-secondary mt-3">
          <strong>{funded.length}</strong> paid {funded.length === 1 ? "road" : "roads"} funded (
          {formatInr(allocatedInr)} used, {formatInr(remainingInr)} left) ·{" "}
          <strong>{dlpFree.length}</strong> under DLP guarantee (<strong>₹0 BMC cost</strong>) ·{" "}
          <strong>{deferred.length}</strong> deferred to next tranche.
        </p>
      </div>

      <ol className="rb-next">
        {items.map((item) => {
          const isFunded = funded.some((x) => x.roadId === item.roadId);
          return (
            <li key={item.roadId} className="ux4g-card ux4g-card-outline ux4g-card-vertical rb-next-card">
              <div className="ux4g-card-header flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="ux4g-card-title">
                    {item.rank}. {item.roadName}
                  </p>
                  <p className="ux4g-body-s-default ux4g-text-neutral-secondary">
                    Segment {item.roadId}, risk {item.score} of 100
                  </p>
                </div>
                {item.underDlp ? (
                  <GovBadge tone="primary" small>₹0 · Enforce DLP</GovBadge>
                ) : isFunded ? (
                  <GovBadge tone="success" small>Funded in tranche</GovBadge>
                ) : (
                  <GovBadge tone="neutral" small>Next tranche</GovBadge>
                )}
              </div>
              <div className="ux4g-card-body rb-next-body">
                <ul className="ux4g-body-s-default rb-next-reasons">
                  {item.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
              <div className="ux4g-card-footer rb-next-fix">
                {item.underDlp ? (
                  <p className="ux4g-body-s-strong">
                    Send back to the resurfacing contractor under Defect Liability — BMC pays ₹0.
                  </p>
                ) : (
                  <p className="ux4g-body-s-default">
                    <span className="ux4g-body-s-strong">{item.suggestedMethod}</span>, about{" "}
                    {formatInr(item.estCostInr)}. Similar work came back within 30 days{" "}
                    {pct(item.methodReopenRate)} of the time.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
