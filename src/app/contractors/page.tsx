import type { Metadata } from "next";
import Link from "next/link";

import { BandBadge, ScoreMeter } from "@/components/rupee/ScoreMeter";
import { formatInrShort, getRupee } from "@/lib/rupee";
import { getScorecards } from "@/lib/rupee/scorecard";
import { pct } from "@/lib/rupee/slug";

export const metadata: Metadata = {
  title: "Contractor scorecards",
  description:
    "Each road contractor scored on whether repairs lasted, whether bills matched the rate card, and whether work finished on time, against what is fair for the work and conditions they took on.",
};

export default function ContractorsPage() {
  const { cards, city } = getScorecards();
  const { flags } = getRupee();

  return (
    <div className="shell rb-page">
      <h1 className="ux4g-display-xs-strong">Who did the work, and did it hold?</h1>
      <p className="ux4g-body-l-default ux4g-text-neutral-secondary ux4g-mt-xs rb-measure">
        Every contractor is scored against what is fair for the same repair methods in the same conditions: heavy rain,
        flood spots and busy roads. 50 means exactly as expected. Doing the most work is never a reason for a lower
        score.
      </p>
      <p className="ux4g-body-s-default ux4g-text-neutral-secondary ux4g-mt-xs rb-measure">
        Across the city, {pct(city.reopenRate)} of repairs came back within 30 days and {pct(city.slaMissRate)} missed
        the time limit, from {city.jobs.toLocaleString("en-IN")} jobs.
      </p>

      <ol className="rb-score-grid ux4g-mt-l">
        {cards.map((card) => {
          const flagged = flags.filter((f) => f.contractorId === card.id).length;
          return (
            <li key={card.id} className="ux4g-card ux4g-card-solid ux4g-card-vertical">
              <div className="ux4g-card-header rb-score-head">
                <div>
                  <p className="ux4g-body-xs-default ux4g-text-neutral-secondary">Rank {card.rank}</p>
                  <p className="ux4g-card-title">
                    <Link href={`/contractors/${card.id}`} className="rb-card-link">
                      {card.name}
                    </Link>
                  </p>
                  <p className="ux4g-body-s-default ux4g-text-neutral-secondary">
                    {card.volume.jobs} jobs in {card.volume.wards} wards, {formatInrShort(card.volume.billedInr)} billed.
                  </p>
                </div>
                <div className="rb-score-badge">
                  <span className="ux4g-display-xs-strong">{card.overall.toFixed(0)}</span>
                  <BandBadge band={card.band} small />
                </div>
              </div>
              <div className="ux4g-card-body">
                <ScoreMeter score={card.overall} label={`${card.name} overall score`} />
                <dl className="rb-score-facts ux4g-mt-xs">
                  <div>
                    <dt className="ux4g-body-xs-default ux4g-text-neutral-secondary">Repairs that came back</dt>
                    <dd className="ux4g-body-m-strong">
                      {pct(card.durability.actualRate)}{" "}
                      <span className="ux4g-body-xs-default ux4g-text-neutral-secondary">of {pct(card.durability.expectedRate)} expected</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="ux4g-body-xs-default ux4g-text-neutral-secondary">Average bill</dt>
                    <dd className="ux4g-body-m-strong">{card.cost.avgCostRatio.toFixed(2)}× the rate card</dd>
                  </div>
                  <div>
                    <dt className="ux4g-body-xs-default ux4g-text-neutral-secondary">Missed the time limit</dt>
                    <dd className="ux4g-body-m-strong">
                      {pct(card.speed.actualRate)}{" "}
                      <span className="ux4g-body-xs-default ux4g-text-neutral-secondary">of {pct(card.speed.expectedRate)} expected</span>
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="ux4g-card-footer rb-score-foot">
                <p className="ux4g-body-xs-default ux4g-text-neutral-secondary">
                  {pct(card.volume.highStressShare)} of their jobs were in high-stress conditions. {card.repeats.repeatJobs} fixed
                  the same kind of problem again on the same road.
                  {flagged > 0 ? ` ${flagged} bills flagged.` : ""}
                </p>
                <Link href={`/contractors/${card.id}`} className="ux4g-btn-outline-primary ux4g-btn-m touch-target">
                  Full record
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
