/** Header, overall score, the three parts and the scoring rules, in page order. */

import { OUTLIER_FACTOR, PRIOR_JOBS, WEIGHTS } from "@/lib/rupee/scorecard";
import type { ContractorScorecard } from "@/lib/rupee/scorecard";

import { ACCENT, CONTENT_W, Cursor, INK, MUTED, type RenderContext } from "./layout";
import { generatedDate, pct } from "./text";

export function drawHeader(cur: Cursor, card: ContractorScorecard, ctx: RenderContext): void {
  cur.line("Rastabaaz contractor scorecard", { size: 10, bold: true, color: ACCENT });
  cur.move(4);
  cur.line(card.name, { size: 22, bold: true, maxWidth: CONTENT_W });
  cur.move(2);
  cur.line(
    `Rank ${card.rank} of ${ctx.total}  ·  Empanelled since ${card.empanelledSince}  ·  Generated ${generatedDate(ctx.generatedOn)}`,
    { size: 9.5, color: MUTED, maxWidth: CONTENT_W },
  );
  cur.line(`Contractor ID ${card.id}`, { size: 9, color: MUTED });
  cur.move(4);
}

export function drawOverall(cur: Cursor, card: ContractorScorecard): void {
  cur.heading("Overall score");
  cur.line(String(Math.round(card.overall)), { size: 40, bold: true, color: ACCENT });
  cur.line(`out of 100  ·  ${card.band}`, { size: 11, bold: true });
  cur.move(6);
  cur.scoreBar(card.overall, 8);
  const count =
    card.volume.jobs >= PRIOR_JOBS ? `${card.volume.jobs} jobs counted.` : `Under ${PRIOR_JOBS} jobs, so no band is given.`;
  cur.paragraph(
    `50 means exactly as expected. 60 and above is Strong, 40 to 60 is As expected, under 40 Needs attention. ${count}`,
    { size: 8.5, color: MUTED },
  );
  cur.paragraph(`Of the three parts, the lowest is ${lowestPart(card)}.`, { size: 9, color: INK });
}

/** The lowest of the three part scores, named in plain words, straight from the computed scores. */
function lowestPart(card: ContractorScorecard): string {
  const parts = [
    { label: "how long repairs lasted", score: card.durability.score },
    { label: "billing against the rate card", score: card.cost.score },
    { label: "finishing within the time limit", score: card.speed.score },
  ];
  return parts.reduce((low, part) => (part.score < low.score ? part : low)).label;
}

type PartLine = { title: string; weight: number; score: number; fact: string };

function partLines(card: ContractorScorecard): PartLine[] {
  const { durability: d, cost: c, speed: s, volume: v } = card;
  return [
    {
      title: "Durability",
      weight: Math.round(WEIGHTS.durability * 100),
      score: d.score,
      fact: `Came back within 30 days: ${pct(d.actualRate)} (${d.failures} of ${v.jobs}) vs ${pct(d.expectedRate)} expected.`,
    },
    {
      title: "Cost",
      weight: Math.round(WEIGHTS.cost * 100),
      score: c.score,
      fact: `Average bill ${c.avgCostRatio.toFixed(2)}x the rate card vs 1.00x expected; ${pct(c.outlierShare)} over ${OUTLIER_FACTOR}x.`,
    },
    {
      title: "Speed",
      weight: Math.round(WEIGHTS.speed * 100),
      score: s.score,
      fact: `Missed the time limit: ${pct(s.actualRate)} (${s.misses} of ${v.jobs}) vs ${pct(s.expectedRate)} expected.`,
    },
  ];
}

export function drawParts(cur: Cursor, card: ContractorScorecard): void {
  cur.heading("The three parts");
  for (const part of partLines(card)) {
    cur.ensure(64);
    cur.put(`${part.title} (${part.weight}% of the score)`, { size: 10.5, bold: true });
    cur.put(String(Math.round(part.score)), { size: 10.5, bold: true, align: "right" });
    cur.move(15);
    cur.scoreBar(part.score, 6);
    cur.paragraph(part.fact, { size: 9, color: MUTED });
    cur.move(6);
  }
}

const RULES: string[] = [
  `Overall = ${Math.round(WEIGHTS.durability * 100)}% durability + ${Math.round(WEIGHTS.cost * 100)}% cost + ${Math.round(WEIGHTS.speed * 100)}% speed.`,
  "Each part compares what happened with what was expected for similar jobs: the same repair method in the same " +
    "conditions, or the rate card for cost. Score = 100 / (1 + actual / expected), so exactly as expected is 50, " +
    "twice as bad is 33, and a perfect record is 100.",
  `Contractors with few jobs are pulled toward 50, as if they also had ${PRIOR_JOBS} jobs exactly as expected. ` +
    `Under ${PRIOR_JOBS} jobs there is no band.`,
  "Job volume and rupees billed are shown for context and never scored, so nobody is rewarded or punished just " +
    "for how much work they were given.",
];

export function drawMethod(cur: Cursor): void {
  cur.heading("How the score is worked out");
  RULES.forEach((text, index) => {
    cur.paragraph(`${index + 1}. ${text}`, { size: 9.5 });
    cur.move(4);
  });
}
