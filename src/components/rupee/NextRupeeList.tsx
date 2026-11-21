import { GovBadge } from "@/components/gov/GovBadge";
import { formatInr } from "@/lib/rupee/format";
import { pct } from "@/lib/rupee/slug";
import type { NextRupeeItem } from "@/lib/rupee/types";

/** Ranked fix-first list. The rank is a real order of work, so it is numbered. */
export function NextRupeeList({ items }: { items: NextRupeeItem[] }) {
  if (items.length === 0) {
    return <p className="ux4g-body-m-default ux4g-text-neutral-secondary">No open risks ranked for this ward.</p>;
  }
  return (
    <ol className="rb-next">
      {items.map((item) => (
        <li key={item.roadId} className="ux4g-card ux4g-card-outline ux4g-card-vertical rb-next-card">
          <div className="ux4g-card-header">
            <p className="ux4g-card-title">
              {item.rank}. {item.roadName}
            </p>
            <p className="ux4g-body-s-default ux4g-text-neutral-secondary">
              Segment {item.roadId}, risk {item.score} of 100
            </p>
          </div>
          <div className="ux4g-card-body rb-next-body">
            {item.underDlp ? <GovBadge tone="primary" small>Under guarantee</GovBadge> : null}
            <ul className="ux4g-body-s-default rb-next-reasons">
              {item.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
          <div className="ux4g-card-footer rb-next-fix">
            {item.underDlp ? (
              <p className="ux4g-body-s-strong">
                Send it back to the contractor who resurfaced it. The guarantee means BMC pays nothing.
              </p>
            ) : (
              <p className="ux4g-body-s-default">
                <span className="ux4g-body-s-strong">{item.suggestedMethod}</span>, about {formatInr(item.estCostInr)}.
                On similar work this method came back within 30 days {pct(item.methodReopenRate)} of the time.
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
