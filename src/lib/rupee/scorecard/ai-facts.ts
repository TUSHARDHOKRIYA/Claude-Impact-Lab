import { formatInr } from "../format";
import { OUTLIER_FACTOR, PRIOR_JOBS, REPEAT_WINDOW_DAYS } from "./index";
import type { ContractorScorecard } from "./types";

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

/**
 * Every figure the model may use, as plain data lines. There are no verdict
 * words here ("better", "worse", "weak"): Claude reads the numbers and decides
 * how to say what they mean. Claude explains, it does not count.
 */
export function contractorFacts(card: ContractorScorecard, cityCount: number): string {
  const { durability: d, cost: c, speed: s, volume: v, repeats: r } = card;
  const sameDay = card.orders.filter((o) => o.repeatOf?.days === 0).length;
  const wards = card.byWard
    .filter((w) => w.jobs >= 8)
    .map((w) => ({ w, gap: w.reopenRate - w.expectedReopenRate }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3)
    .map(({ w }) => `${w.ward} (${w.jobs} jobs, came back ${pct(w.reopenRate)} vs ${pct(w.expectedReopenRate)} expected)`);

  const lines = [
    `Contractor: ${card.name}. Empanelled ${card.empanelledSince}. Rank ${card.rank} of ${cityCount} by overall score.`,
    `Overall score ${card.overall.toFixed(1)} out of 100 (50 means exactly as expected). Band: ${card.band}. Bands: 60 and over Strong, 40 to 60 As expected, under 40 Needs attention, under ${PRIOR_JOBS} jobs Limited data.`,
    `Score weights: durability 45%, cost 30%, speed 25%. Each part is 100 / (1 + actual / expected).`,
    `Durability part ${d.score.toFixed(1)}: ${d.failures} of ${v.jobs} repairs came back within 30 days (${pct(d.actualRate)}); expected ${pct(d.expectedRate)} for the same repair methods and stress levels.`,
    `Cost part ${c.score.toFixed(1)}: average bill ${c.avgCostRatio.toFixed(2)} times the rate card; ${c.outlierJobs} jobs billed more than ${OUTLIER_FACTOR} times it (${pct(c.outlierShare)} of their jobs; ${pct(c.cityOutlierShare)} across the city).`,
    `Speed part ${s.score.toFixed(1)}: ${s.misses} of ${v.jobs} jobs missed the time limit (${pct(s.actualRate)}); expected ${pct(s.expectedRate)}. The time limit runs from the first complaint, so it includes any wait before the job was assigned.`,
    `Context, never scored: ${v.jobs} jobs in ${v.wards} wards on ${v.roads} road segments, ${formatInr(v.billedInr)} billed against ${formatInr(Math.round(v.expectedBilledInr))} on the rate card. Stress mix of their jobs: ${pct(v.highStressShare)} high, ${pct(v.mediumStressShare)} medium, ${pct(v.lowStressShare)} low (stress means heavy rain after the job, a flood hotspot, or a busy road).`,
    `Repeat evidence, not scored: ${r.repeatJobs} jobs fixed the same kind of problem on a road already fixed within ${REPEAT_WINDOW_DAYS} days, of which ${sameDay} on the same day as the earlier job (possible duplicate orders); ${r.roadsFixedTwice} roads were fixed more than once.`,
    `Paid on roads still under their Defect Liability Period: ${v.paidUnderDlpJobs} jobs, ${formatInr(v.paidUnderDlpInr)}.`,
    wards.length ? `Wards where repairs came back most above expectation: ${wards.join("; ")}.` : "",
  ];
  return lines.filter(Boolean).join("\n");
}
