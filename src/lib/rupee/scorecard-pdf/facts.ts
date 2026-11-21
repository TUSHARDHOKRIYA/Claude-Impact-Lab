/** Key figures: the context and evidence the score sits beside. None of it is scored. */

import { REPEAT_WINDOW_DAYS } from "@/lib/rupee/scorecard";
import type { ContractorScorecard } from "@/lib/rupee/scorecard";

import { Cursor, MARGIN, MUTED } from "./layout";
import { moneyShort, pct } from "./text";

const NOTE_X = MARGIN + 190;

export function drawKeyFigures(cur: Cursor, card: ContractorScorecard): void {
  cur.heading("Key figures");
  const { volume: v, repeats: r, durability: d, speed: s } = card;
  const rows: Array<[label: string, value: string, note: string]> = [
    ["Jobs done", String(v.jobs), `across ${v.wards} wards and ${v.roads} roads`],
    ["Total billed", moneyShort(v.billedInr), `at the rate card it would have been ${moneyShort(v.expectedBilledInr)}`],
    [
      "Came back within 30 days",
      String(d.failures),
      `${pct(d.actualRate)} of jobs, ${moneyShort(r.reopenedInr)} spent on them`,
    ],
    [
      `Fixed again within ${REPEAT_WINDOW_DAYS} days`,
      String(r.repeatJobs),
      `${moneyShort(r.repeatInr)}; ${r.roadsFixedTwice} roads fixed twice or more`,
    ],
    ["Missed the time limit", String(s.misses), `${pct(s.actualRate)} of jobs`],
    ["Paid on roads still under guarantee", String(v.paidUnderDlpJobs), moneyShort(v.paidUnderDlpInr)],
  ];
  for (const [label, value, note] of rows) {
    cur.ensure(30);
    cur.put(label, { size: 9.5, color: MUTED, maxWidth: 176 });
    cur.put(note, { size: 8.5, color: MUTED, x: NOTE_X, maxWidth: 200 });
    cur.put(value, { size: 10.5, bold: true, align: "right" });
    cur.move(15);
    cur.rule(3);
  }
}
