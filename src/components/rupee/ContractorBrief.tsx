import { contractorSummary } from "@/lib/rupee/scorecard/ai-summary";
import type { ContractorScorecard } from "@/lib/rupee/scorecard";

/** Streams in after the numbers, so the page never waits on the model. */
export async function ContractorBrief({ card }: { card: ContractorScorecard }) {
  const summary = await contractorSummary(card);
  if (summary.status === "unavailable") {
    return (
      <p className="ux4g-body-m-default ux4g-text-neutral-secondary rb-measure" role="status">
        The AI summary is unavailable. {summary.reason} The figures below are unaffected.
      </p>
    );
  }
  return (
    <div className="rb-measure">
      <p className="ux4g-body-m-default">{summary.text}</p>
      <p className="ux4g-body-xs-default ux4g-text-neutral-secondary ux4g-mt-xs">
        Written by Claude ({summary.model}) from the figures below. Check the work orders before quoting it.
      </p>
    </div>
  );
}

export function ContractorBriefLoading() {
  return (
    <p className="ux4g-body-m-default ux4g-text-neutral-secondary rb-measure" role="status">
      Summarising this contractor&apos;s work orders…
    </p>
  );
}
