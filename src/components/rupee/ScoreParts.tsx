import { ScoreMeter } from "@/components/rupee/ScoreMeter";
import { OUTLIER_FACTOR, WEIGHTS } from "@/lib/rupee/scorecard";
import type { ContractorScorecard } from "@/lib/rupee/scorecard";
import { pct } from "@/lib/rupee/slug";

type Part = {
  key: string;
  title: string;
  weight: number;
  score: number;
  question: string;
  facts: Array<[string, string]>;
};

function partsOf(card: ContractorScorecard): Part[] {
  const { durability: d, cost: c, speed: s } = card;
  return [
    {
      key: "durability",
      title: "Did the fix last?",
      weight: WEIGHTS.durability,
      score: d.score,
      question: "Repairs that came back within 30 days, against what is expected for the same methods and conditions.",
      facts: [
        ["Came back", `${pct(d.actualRate)} (${d.failures} of ${card.volume.jobs})`],
        ["Expected", pct(d.expectedRate)],
      ],
    },
    {
      key: "cost",
      title: "Was the bill fair?",
      weight: WEIGHTS.cost,
      score: c.score,
      question: `Average bill against the rate card, plus how often a bill was more than ${OUTLIER_FACTOR} times it.`,
      facts: [
        ["Average bill", `${c.avgCostRatio.toFixed(2)}× the rate card`],
        ["Far over", `${pct(c.outlierShare)} of jobs, city ${pct(c.cityOutlierShare)}`],
      ],
    },
    {
      key: "speed",
      title: "Was it on time?",
      weight: WEIGHTS.speed,
      score: s.score,
      question: "Jobs that missed the time limit, against what is expected for the same methods and conditions.",
      facts: [
        ["Missed", `${pct(s.actualRate)} (${s.misses} of ${card.volume.jobs})`],
        ["Expected", pct(s.expectedRate)],
      ],
    },
  ];
}

/** The three parts of the score, each with the same 0 to 100 meter and its plain question. */
export function ScoreParts({ card }: { card: ContractorScorecard }) {
  return (
    <ul className="rb-parts">
      {partsOf(card).map((part) => (
        <li key={part.key} className="ux4g-card ux4g-card-outline ux4g-card-vertical">
          <div className="ux4g-card-header">
            <p className="ux4g-card-title">{part.title}</p>
            <p className="ux4g-body-xs-default ux4g-text-neutral-secondary">Counts for {Math.round(part.weight * 100)}% of the score</p>
          </div>
          <div className="ux4g-card-body">
            <p className="ux4g-display-xs-strong rb-num-left">{part.score.toFixed(0)}</p>
            <ScoreMeter score={part.score} label={part.title} zones={false} />
            <p className="ux4g-body-s-default ux4g-text-neutral-secondary ux4g-mt-xs">{part.question}</p>
            <dl className="rb-part-facts ux4g-mt-xs">
              {part.facts.map(([term, value]) => (
                <div key={term}>
                  <dt className="ux4g-body-xs-default ux4g-text-neutral-secondary">{term}</dt>
                  <dd className="ux4g-body-s-strong">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </li>
      ))}
    </ul>
  );
}
