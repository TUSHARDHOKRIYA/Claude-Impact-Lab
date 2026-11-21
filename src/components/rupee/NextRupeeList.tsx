import { Fragment } from "react";

import { formatInr } from "@/lib/rupee/format";
import { pct } from "@/lib/rupee/slug";
import type { NextRupeeItem } from "@/lib/rupee/types";

/** Where a road lands under a budget cap, when one is being tried. */
export type TrancheStatus = "funded" | "next" | "dlp";

/** Only the exceptions get a tag: free roads anywhere, and a first road the money misses. */
const STATUS_LABEL: Partial<Record<TrancheStatus, string>> = {
  next: "Not reached at this budget",
  dlp: "Free: still under guarantee",
};

function StatusTag({ status, onDark = false }: { status?: TrancheStatus; onDark?: boolean }) {
  const label = status ? STATUS_LABEL[status] : undefined;
  if (!label) return null;
  return (
    <span className="rb-tranche" data-status={status} data-dark={onDark ? "true" : undefined}>
      {label}
    </span>
  );
}

/** The lane marking: where the money runs out. */
function Cutoff({ budget }: { budget: string }) {
  return (
    <li className="rb-cutoff" role="separator" aria-label={`${budget} runs out here. Roads below wait.`}>
      <span className="rb-cutoff-line" aria-hidden="true" />
      <span className="rb-cutoff-text" aria-hidden="true">
        {budget} runs out here
      </span>
    </li>
  );
}

function Fix({ item }: { item: NextRupeeItem }) {
  return item.underDlp
    ? "Still under guarantee: send it back to the contractor who laid it. BMC pays nothing."
    : `${item.suggestedMethod}, about ${formatInr(item.estCostInr)}. Comes back within 30 days ${pct(item.methodReopenRate)} of the time on similar work.`;
}

/**
 * The recommendation. The first road gets the one filled card on the page;
 * the rest follow as a short numbered queue, because the order is real.
 */
export function NextRupeeList({
  items,
  plan,
}: {
  items: NextRupeeItem[];
  /** From the budget simulator: where each road lands, and the amount tried. */
  plan?: { status: Map<string, TrancheStatus>; budget: string };
}) {
  const status = plan?.status;
  const [first, ...rest] = items;
  if (!first) {
    return (
      <p className="ux4g-body-m-default ux4g-text-neutral-secondary">No open risks ranked for this ward.</p>
    );
  }
  // The line goes above the first queued road the money misses. When even the
  // first road is missed, its card says so and no line is drawn.
  const cutAt =
    status && status.get(first.roadId) !== "next" ? rest.findIndex((r) => status.get(r.roadId) === "next") : -1;

  return (
    <div className="rb-next">
      <article className="rb-fixfirst rb-fixfirst-l" aria-labelledby="fix-first-road">
        <div className="rb-fixfirst-top">
          <p className="rb-fixfirst-kicker">Fix first</p>
          <p className="rb-fixfirst-risk">
            Risk <strong>{first.score}</strong>
            <span className="sr-only"> of 100</span>
          </p>
        </div>
        <h3 id="fix-first-road" className="rb-fixfirst-road">
          {first.roadName}
        </h3>
        <ul className="rb-fixfirst-reasons">
          {first.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <p className="rb-fixfirst-how">
          <Fix item={first} />
        </p>
        <StatusTag status={status?.get(first.roadId)} onDark />
      </article>

      {rest.length ? (
        <>
          <h3 className="ux4g-heading-xs-strong ux4g-mt-m">Next in line</h3>
          <ol className="rb-next-queue" start={2}>
            {rest.map((item, i) => (
              <Fragment key={item.roadId}>
              {plan && i === cutAt ? <Cutoff budget={plan.budget} /> : null}
              <li>
                <span className="rb-next-no" aria-hidden="true">
                  {item.rank}
                </span>
                <div className="min-w-0">
                  <p className="ux4g-body-m-strong">{item.roadName}</p>
                  <p className="ux4g-body-s-default ux4g-text-neutral-secondary">{item.reasons[0]}</p>
                  <p className="ux4g-body-s-default ux4g-mt-2xs">
                    {item.underDlp
                      ? "Under guarantee: contractor fixes it free"
                      : `${item.suggestedMethod}, about ${formatInr(item.estCostInr)}`}
                  </p>
                  {status?.get(item.roadId) === "dlp" ? <StatusTag status="dlp" /> : null}
                </div>
                <span className="rb-next-risk">
                  {item.score}
                  <span className="sr-only"> risk of 100</span>
                </span>
              </li>
              </Fragment>
            ))}
          </ol>
        </>
      ) : null}
    </div>
  );
}
