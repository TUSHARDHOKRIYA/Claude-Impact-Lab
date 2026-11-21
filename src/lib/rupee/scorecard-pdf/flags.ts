/** Up to ten bills above 1.5x the rate card, newest first. Evidence, not a finding. */

import { OUTLIER_FACTOR } from "@/lib/rupee/scorecard";
import type { ContractorScorecard } from "@/lib/rupee/scorecard";

import { CONTENT_W, Cursor, MARGIN, MUTED } from "./layout";
import { moneyFull, workDate } from "./text";

/** Column edges. Date and ward are left anchored; money is right anchored. */
const X = {
  date: MARGIN,
  ward: MARGIN + 66,
  work: MARGIN + 146,
  billed: MARGIN + 390,
  expected: MARGIN + CONTENT_W,
} as const;

const END = {
  date: 60,
  ward: 74,
  work: 170,
  billed: 64,
  expected: 96,
} as const;

export function drawFlaggedBills(cur: Cursor, card: ContractorScorecard): void {
  cur.heading("Flagged bills");
  const over = card.orders.filter((o) => o.overBilled).slice(0, 10);
  if (over.length === 0) {
    cur.paragraph(`No bills above ${OUTLIER_FACTOR}x the rate card.`, { size: 9.5, color: MUTED });
    cur.move(8);
    return;
  }

  cur.ensure(26);
  cur.put("Date", { size: 8, bold: true, color: MUTED, x: X.date, maxWidth: END.date });
  cur.put("Ward", { size: 8, bold: true, color: MUTED, x: X.ward, maxWidth: END.ward });
  cur.put("Work", { size: 8, bold: true, color: MUTED, x: X.work, maxWidth: END.work });
  cur.put("Billed", { size: 8, bold: true, color: MUTED, align: "right", x: X.billed, maxWidth: END.billed });
  cur.put("Rate card", { size: 8, bold: true, color: MUTED, align: "right", x: X.expected, maxWidth: END.expected });
  cur.move(12);
  cur.rule(6);

  for (const order of over) {
    cur.ensure(22);
    cur.put(workDate(order.completedAt), { size: 8.5, x: X.date, maxWidth: END.date });
    cur.put(order.ward, { size: 8.5, x: X.ward, maxWidth: END.ward });
    cur.put(`${order.workType} - ${order.roadName}`, { size: 8.5, x: X.work, maxWidth: END.work });
    cur.put(moneyFull(order.costInr), { size: 8.5, align: "right", x: X.billed, maxWidth: END.billed });
    cur.put(moneyFull(order.expectedCostInr), { size: 8.5, align: "right", x: X.expected, maxWidth: END.expected });
    cur.move(16);
    cur.rule(4);
  }

  if (card.orders.filter((o) => o.overBilled).length > over.length) {
    cur.paragraph(`Showing the 10 most recent of ${card.cost.outlierJobs} bills above ${OUTLIER_FACTOR}x.`, {
      size: 8,
      color: MUTED,
    });
  }
  cur.move(6);
}
