"use client";

import { useState } from "react";

import { NextRupeeList, type TrancheStatus } from "@/components/rupee/NextRupeeList";
import { formatInrShort } from "@/lib/rupee/format";
import type { NextRupeeItem } from "@/lib/rupee/types";

const STEP = 5_000;
const roundUp = (inr: number) => Math.ceil(inr / 10_000) * 10_000;

/**
 * Fund roads strictly in risk order until the next one does not fit: a
 * riskier road is never skipped for a cheaper one further down. Roads still
 * under guarantee cost BMC nothing and are sent back to the contractor.
 */
export function allocate(items: NextRupeeItem[], budgetInr: number) {
  const status = new Map<string, TrancheStatus>();
  let usedInr = 0;
  let stopped = false;
  for (const item of items) {
    if (item.underDlp) {
      status.set(item.roadId, "dlp");
      continue;
    }
    const cost = Math.max(0, item.estCostInr);
    if (!stopped && usedInr + cost <= budgetInr) {
      status.set(item.roadId, "funded");
      usedInr += cost;
    } else {
      stopped = true;
      status.set(item.roadId, "next");
    }
  }
  const count = (s: TrancheStatus) => [...status.values()].filter((v) => v === s).length;
  return { status, usedInr, funded: count("funded"), dlp: count("dlp"), next: count("next") };
}

/**
 * "What if the ward had ₹X for the next tranche?" A slider over the ranked
 * roads: each road shows whether the money reaches it, and which ones the
 * contractor must fix for free because the road is still under guarantee.
 */
export function BudgetSimulator({ wardCode, items }: { wardCode: string; items: NextRupeeItem[] }) {
  // Scale to what these fixes cost, so the slider always moves roads in and out.
  const totalInr = items.reduce((sum, item) => sum + (item.underDlp ? 0 : Math.max(0, item.estCostInr)), 0);
  const maxInr = Math.max(STEP, roundUp(totalInr));
  const presets = [...new Set([0.25, 0.5, 0.75].map((f) => roundUp(totalInr * f)).concat(maxInr))];
  const [budgetInr, setBudgetInr] = useState(presets[Math.min(1, presets.length - 1)]);

  if (items.length === 0) {
    return <p className="ux4g-body-m-default ux4g-text-neutral-secondary">No open risks ranked for this ward.</p>;
  }

  const plan = allocate(items, budgetInr);

  return (
    <div>
      <div className="rb-budget">
        <div className="rb-budget-top">
          <label htmlFor="ward-budget-cap" className="ux4g-body-m-strong">
            If {wardCode} ward had
          </label>
          <output htmlFor="ward-budget-cap" className="rb-budget-amount">
            {formatInrShort(budgetInr)}
          </output>
        </div>
        <p className="ux4g-body-s-default ux4g-text-neutral-secondary">
          The paid fixes below cost about {formatInrShort(totalInr)} in all. Money goes to the riskiest road first.
        </p>
        <input
          id="ward-budget-cap"
          type="range"
          min={0}
          max={maxInr}
          step={STEP}
          value={budgetInr}
          onChange={(e) => setBudgetInr(Number(e.target.value))}
          className="rb-budget-range"
        />
        <div className="rb-budget-presets" role="group" aria-label="Budget presets">
          {presets.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={budgetInr === value}
              onClick={() => setBudgetInr(value)}
              className="rb-chip touch-target"
            >
              {value === maxInr ? `All, ${formatInrShort(value)}` : formatInrShort(value)}
            </button>
          ))}
        </div>
        <dl className="rb-budget-facts" aria-live="polite">
          <div>
            <dt>Paid for</dt>
            <dd>
              {plan.funded} {plan.funded === 1 ? "road" : "roads"}
              <span>{formatInrShort(plan.usedInr)} used</span>
            </dd>
          </div>
          <div>
            <dt>Free under guarantee</dt>
            <dd>
              {plan.dlp} {plan.dlp === 1 ? "road" : "roads"}
              <span>₹0 to BMC</span>
            </dd>
          </div>
          <div>
            <dt>Has to wait</dt>
            <dd>
              {plan.next} {plan.next === 1 ? "road" : "roads"}
              <span>for the next round</span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="ux4g-mt-m">
        <NextRupeeList items={items} plan={{ status: plan.status, budget: formatInrShort(budgetInr) }} />
      </div>
    </div>
  );
}
