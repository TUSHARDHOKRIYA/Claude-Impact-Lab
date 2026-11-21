import { formatInr } from "@/lib/rupee/format";
import { pct } from "@/lib/rupee/slug";
import type { NextRupeeItem } from "@/lib/rupee/types";

function Fix({ item }: { item: NextRupeeItem }) {
  return item.underDlp
    ? "Still under guarantee: send it back to the contractor who laid it. BMC pays nothing."
    : `${item.suggestedMethod}, about ${formatInr(item.estCostInr)}. Comes back within 30 days ${pct(item.methodReopenRate)} of the time on similar work.`;
}

/**
 * The recommendation. The first road gets the one filled card on the page;
 * the rest follow as a short numbered queue, because the order is real.
 */
export function NextRupeeList({ items }: { items: NextRupeeItem[] }) {
  const [first, ...rest] = items;
  if (!first) {
    return (
      <p className="ux4g-body-m-default ux4g-text-neutral-secondary">No open risks ranked for this ward.</p>
    );
  }
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
      </article>

      {rest.length ? (
        <>
          <h3 className="ux4g-heading-xs-strong ux4g-mt-m">Next in line</h3>
          <ol className="rb-next-queue" start={2}>
            {rest.map((item) => (
              <li key={item.roadId}>
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
                    <span className="ux4g-text-neutral-secondary"> · segment {item.roadId}</span>
                  </p>
                </div>
                <span className="rb-next-risk">
                  {item.score}
                  <span className="sr-only"> risk of 100</span>
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </div>
  );
}
