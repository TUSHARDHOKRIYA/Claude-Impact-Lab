/**
 * Page geometry, colours and a top-down cursor. Coordinates here count down
 * from the top of the page, like a web page; PDF coordinates count up from
 * the bottom, so every draw call converts once, in one place.
 */

import { rgb } from "pdf-lib";
import type { Color, PDFDocument, PDFFont, PDFPage } from "pdf-lib";

import { fitText, sanitiseText, wrapText } from "./text";

/** A4 in PDF points. */
export const PAGE_W = 595.28;
export const PAGE_H = 841.89;
export const MARGIN = 48;
export const CONTENT_W = PAGE_W - 2 * MARGIN;
/** Body text stops here (from the top), leaving the footer band below it. */
export const BODY_BOTTOM = PAGE_H - 56;

export const INK = rgb(0.12, 0.12, 0.14);
export const MUTED = rgb(0.42, 0.42, 0.46);
export const RULE = rgb(0.84, 0.84, 0.86);
export const TRACK = rgb(0.92, 0.92, 0.93);
export const ACCENT = rgb(0.36, 0.2, 0.66);

export type { Color };
export type Fonts = { regular: PDFFont; bold: PDFFont };
export type RenderContext = {
  /** How many contractors are ranked, for "Rank N of M". */
  total: number;
  generatedOn: Date;
};

export type Style = {
  size?: number;
  bold?: boolean;
  color?: Color;
  /** "right" anchors the text at `x` as its right edge (default: the right margin). */
  align?: "left" | "right";
  /** Left edge for left-aligned text (default: the left margin). */
  x?: number;
  /** Trims with "..." so the text never runs into the next column. */
  maxWidth?: number;
};

const lineHeight = (size: number) => size * 1.3;

export class Cursor {
  page: PDFPage;
  top = MARGIN;

  constructor(
    private readonly doc: PDFDocument,
    readonly fonts: Fonts,
  ) {
    this.page = doc.addPage([PAGE_W, PAGE_H]);
  }

  /** Starts a new page when `height` points would run into the footer. Returns true if it did. */
  ensure(height: number): boolean {
    if (this.top + height <= BODY_BOTTOM) return false;
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.top = MARGIN;
    return true;
  }

  move(dy: number): void {
    this.top += dy;
  }

  /** Draws text on the current line without moving down. Used for table cells and paired labels. */
  put(raw: string, style: Style = {}): void {
    const size = style.size ?? 10;
    const font = style.bold ? this.fonts.bold : this.fonts.regular;
    const measure = (s: string) => font.widthOfTextAtSize(s, size);
    const text = fitText(sanitiseText(raw), style.maxWidth ?? Infinity, measure);
    const anchor = style.x ?? (style.align === "right" ? MARGIN + CONTENT_W : MARGIN);
    const x = style.align === "right" ? anchor - measure(text) : anchor;
    this.page.drawText(text, { x, y: PAGE_H - this.top - size, size, font, color: style.color ?? INK });
  }

  /** One line of text, then down by its line height. Starts a page if needed. */
  line(raw: string, style: Style = {}): void {
    this.ensure(lineHeight(style.size ?? 10));
    this.put(raw, style);
    this.top += lineHeight(style.size ?? 10);
  }

  /** Wrapped paragraph. Each line checks for room, so long text flows onto the next page. */
  paragraph(raw: string, style: Style & { width?: number } = {}): void {
    const size = style.size ?? 10;
    const font = style.bold ? this.fonts.bold : this.fonts.regular;
    const width = style.width ?? CONTENT_W;
    const lines = wrapText(sanitiseText(raw), width, (s) => font.widthOfTextAtSize(s, size));
    for (const text of lines) this.line(text, style);
  }

  /** A thin divider across the content width. */
  rule(gap = 6): void {
    const y = PAGE_H - this.top;
    this.page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_W, y }, thickness: 0.6, color: RULE });
    this.top += gap;
  }

  /** A section title with a divider above it. */
  heading(title: string): void {
    this.ensure(56);
    this.top += 8;
    this.rule(8);
    this.line(title, { size: 12.5, bold: true, color: ACCENT });
    this.top += 4;
  }

  /** Horizontal 0 to 100 bar with a tick at 50, where "exactly as expected" sits. */
  scoreBar(score: number, height = 7): void {
    this.ensure(height + 10);
    const y = PAGE_H - this.top - height;
    const share = Math.min(Math.max(score, 0), 100) / 100;
    this.page.drawRectangle({ x: MARGIN, y, width: CONTENT_W, height, color: TRACK });
    if (share > 0) {
      this.page.drawRectangle({ x: MARGIN, y, width: CONTENT_W * share, height, color: ACCENT });
    }
    this.page.drawRectangle({
      x: MARGIN + CONTENT_W / 2 - 0.4,
      y: y - 2,
      width: 0.8,
      height: height + 4,
      color: INK,
    });
    this.top += height + 10;
  }
}
