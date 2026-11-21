import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { getScorecards } from "../lib/rupee/scorecard";
import { renderScorecardPdf } from "../lib/rupee/scorecard-pdf/render";
import { sanitiseText } from "../lib/rupee/scorecard-pdf/text";

describe("contractor scorecard PDF", () => {
  it("renders the first scorecard as a short PDF", async () => {
    const { cards } = getScorecards();
    expect(cards.length).toBeGreaterThan(0);

    const bytes = await renderScorecardPdf(cards[0], {
      total: cards.length,
      generatedOn: new Date("2026-11-21T12:00:00Z"),
    });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");

    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(doc.getPageCount()).toBeLessThanOrEqual(3);
  });

  it("maps rupees, smart quotes and dashes to safe ASCII", () => {
    const clean = sanitiseText("₹1,20,000 — “x”");
    expect(clean).toBe('Rs 1,20,000 - "x"');
    expect(/^[\x20-\x7e]*$/.test(clean)).toBe(true);
  });
});
