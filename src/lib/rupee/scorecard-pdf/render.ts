/** Builds the scorecard PDF. Page furniture is drawn last, once pages are final. */

import { PDFDocument, StandardFonts } from "pdf-lib";
import type { ContractorScorecard } from "@/lib/rupee/scorecard";

import { drawFlaggedBills } from "./flags";
import { drawKeyFigures } from "./facts";
import { CONTENT_W, Cursor, MARGIN, MUTED, RULE, type RenderContext } from "./layout";
import { drawHeader, drawMethod, drawOverall, drawParts } from "./sections";

const DISCLAIMER = "Synthetic demo data. Scores are formula-based.";

/** Renders one contractor's scorecard to PDF bytes. */
export async function renderScorecardPdf(card: ContractorScorecard, ctx: RenderContext): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const cur = new Cursor(doc, fonts);
  drawHeader(cur, card, ctx);
  drawOverall(cur, card);
  drawParts(cur, card);
  drawMethod(cur);
  drawKeyFigures(cur, card);
  drawFlaggedBills(cur, card);

  const pages = doc.getPages();
  pages.forEach((page, index) => {
    const y = 30;
    page.drawLine({ start: { x: MARGIN, y: y + 14 }, end: { x: MARGIN + CONTENT_W, y: y + 14 }, thickness: 0.6, color: RULE });
    page.drawText(DISCLAIMER, { x: MARGIN, y, size: 8, font: fonts.regular, color: MUTED });
    const label = `Page ${index + 1} of ${pages.length}`;
    const width = fonts.regular.widthOfTextAtSize(label, 8);
    page.drawText(label, { x: MARGIN + CONTENT_W - width, y, size: 8, font: fonts.regular, color: MUTED });
  });

  return doc.save();
}
