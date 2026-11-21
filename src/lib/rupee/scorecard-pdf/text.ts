/**
 * Text helpers for the scorecard PDF. The built-in PDF fonts only encode
 * WinAnsi, so every string is cleaned before it reaches a font: rupee signs
 * become "Rs ", typographic quotes and dashes become ASCII, and anything else
 * outside WinAnsi is dropped rather than crashing the render.
 */

import { groupIndian } from "@/lib/rupee/format";

const SWAPS: Array<[RegExp, string]> = [
  [/₹ ?/g, "Rs "],
  [/[‘’‚′]/g, "'"],
  [/[“”„″]/g, '"'],
  [/[‐-―−]/g, "-"],
  [/…/g, "..."],
  [/•/g, "-"],
  [/×/g, "x"],
  [/÷/g, "/"],
  [/≈/g, "~"],
  [/[\r\n\t]+/g, " "],
];

/** Printable ASCII and Latin-1 are WinAnsi. Soft hyphen is left out on purpose. */
const encodable = (code: number) => (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff && code !== 0xad);

export function sanitiseText(input: string): string {
  let out = input;
  for (const [pattern, swap] of SWAPS) out = out.replace(pattern, swap);
  return Array.from(out, (ch) => (encodable(ch.codePointAt(0) ?? 0) ? ch : "")).join("");
}

/** Greedy word wrap. A single word wider than the line is kept whole. */
export function wrapText(text: string, maxWidth: number, widthOf: (s: string) => number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(" ").filter(Boolean)) {
    const next = current ? `${current} ${word}` : word;
    if (!current || widthOf(next) <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

/** Trims text with "..." until it fits the width. */
export function fitText(text: string, maxWidth: number, widthOf: (s: string) => number): string {
  if (widthOf(text) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 0 && widthOf(`${cut}...`) > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}...`;
}

/** Whole rupees, Indian grouping: "Rs 1,20,000". */
export function moneyFull(n: number): string {
  return `Rs ${groupIndian(n)}`;
}

/** Compact amount for totals: "Rs 12.4 lakh", "Rs 3.1 crore", otherwise full. */
export function moneyShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `Rs ${(n / 1e7).toFixed(1)} crore`;
  if (abs >= 1e5) return `Rs ${(n / 1e5).toFixed(1)} lakh`;
  return moneyFull(n);
}

/** 0.4567 becomes "46%". */
export const pct = (rate: number) => `${Math.round(rate * 100)}%`;

const DATE_OPTS: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

/** Work dates are recorded as wall-clock "YYYY-MM-DD ..." strings, so read the day part as UTC. */
export function workDate(iso: string): string {
  const day = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(day.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("en-GB", { ...DATE_OPTS, timeZone: "UTC" }).format(day);
}

/** The generated stamp, always in Indian time: "21 Nov 2026". */
export function generatedDate(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", { ...DATE_OPTS, timeZone: "Asia/Kolkata" }).format(now);
}

/** "Sahyadri Infra Works" becomes "sahyadri-infra-works". Used in the download filename. */
export function slugOf(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "contractor";
}
