import { formatInrShort } from "../format";
import { OUTLIER_FACTOR, REPEAT_WINDOW_DAYS } from "./orders";
import type { ContractorScorecard, ScoreBand } from "./types";

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** One plain line per band. It states the verdict as a comparison, never as blame. */
export const BAND_LINE: Record<ScoreBand, string> = {
  Strong: "Doing better than expected for the work and conditions they took on.",
  "As expected": "Doing about as well as expected for the work and conditions they took on.",
  "Needs attention": "Doing worse than expected for the work and conditions they took on.",
  "Limited data": "Too few jobs to judge fairly yet.",
};

export const BAND_TONE: Record<ScoreBand, "success" | "neutral" | "error" | "warning"> = {
  Strong: "success",
  "As expected": "neutral",
  "Needs attention": "error",
  "Limited data": "warning",
};

function against(actual: number, expected: number): string {
  if (expected <= 0) return "";
  const diff = actual / expected;
  if (diff < 0.9) return "better than";
  if (diff > 1.1) return "worse than";
  return "close to";
}

/** The weakest of the three parts, in words, so a reader knows where to look first. */
export function weakestPart(card: ContractorScorecard): { key: "durability" | "cost" | "speed"; label: string } {
  const parts = [
    { key: "durability", label: "how long repairs lasted", score: card.durability.score },
    { key: "cost", label: "billing against the rate card", score: card.cost.score },
    { key: "speed", label: "finishing within the time limit", score: card.speed.score },
  ] as const;
  const worst = [...parts].sort((a, b) => a.score - b.score)[0];
  return { key: worst.key, label: worst.label };
}

/**
 * Plain-language summary for a citizen or corporator. Built only from figures
 * already computed. Context comes before the verdict, as on the ward page.
 */
export function scorecardSummary(card: ContractorScorecard): string[] {
  const { durability: d, cost: c, speed: s, volume: v, repeats: r } = card;
  const lines = [
    `${card.name} did ${v.jobs} jobs across ${v.wards} wards, billing ${formatInrShort(v.billedInr)}. ` +
      `${pct(v.highStressShare)} of those jobs were in high-stress conditions: heavy rain, flood spots or busy roads.`,
    `${pct(d.actualRate)} of their repairs came back within 30 days, ${against(d.actualRate, d.expectedRate)} the ` +
      `${pct(d.expectedRate)} expected for the same methods in the same conditions.`,
    `They billed on average ${c.avgCostRatio.toFixed(2)} times the rate card. ${c.outlierJobs} ` +
      `${c.outlierJobs === 1 ? "job was" : "jobs were"} billed more than ${OUTLIER_FACTOR} times it ` +
      `(${pct(c.outlierShare)} of their jobs, against ${pct(c.cityOutlierShare)} across the city).`,
    `${pct(s.actualRate)} of jobs missed the time limit, ${against(s.actualRate, s.expectedRate)} the ` +
      `${pct(s.expectedRate)} expected.`,
  ];
  if (r.repeatJobs > 0) {
    lines.push(
      `${r.repeatJobs} jobs fixed the same kind of problem on a road that had been fixed in the previous ` +
        `${REPEAT_WINDOW_DAYS} days.`,
    );
  }
  return lines;
}
