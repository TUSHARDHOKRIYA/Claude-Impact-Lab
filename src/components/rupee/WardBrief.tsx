import { wardBrief } from "@/lib/rupee/brief";
import type { ContractorScore, NextRupeeItem, WardLedger } from "@/lib/rupee/types";

/** Streams in after the numbers, so the page never waits on the model. */
export async function WardBrief(props: { ledger: WardLedger; scores: ContractorScore[]; next: NextRupeeItem[] }) {
  const brief = await wardBrief(props.ledger, props.scores, props.next);
  return (
    <div className="rb-measure">
      <p className="ux4g-body-m-default">{brief.text}</p>
      <p className="ux4g-body-xs-default ux4g-text-neutral-secondary ux4g-mt-xs">
        {brief.source === "claude"
          ? "Summary by Claude, from the figures below. Check the work orders before quoting it."
          : "Summary built from the figures below."}
      </p>
    </div>
  );
}

export function WardBriefLoading() {
  return (
    <p className="ux4g-body-m-default ux4g-text-neutral-secondary rb-measure" role="status">
      Summarising this ward&apos;s work orders…
    </p>
  );
}
