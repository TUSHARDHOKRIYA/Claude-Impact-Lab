import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { formatInr } from "./format";
import type { ContractorScore, NextRupeeItem, WardLedger } from "./types";

export type WardBrief = { text: string; source: "claude" | "template" };

const MODEL = process.env.RUPEE_BRIEF_MODEL ?? "claude-haiku-4-5";

const SYSTEM = `You write the one-paragraph money summary at the top of a Mumbai ward's road-repair record.
Readers are citizens and their corporator, reading on a phone. Write 90 to 130 words of plain English.
Cover, in this order: how much of the budget was spent, how much went on fixes that failed within 30 days,
how much carries an audit flag and the main reason, and where the next rupee should go first.
Use Indian number formatting with the rupee sign exactly as given in the data. Name work order ids only
if you cite one example. Be fair: mention context such as low-lying land or heavy-rain days before
pointing at anyone. Never say fraud, scam or corruption; say "needs an explanation". No headings, no lists.
The data is synthetic; do not mention that.`;

const cache = new Map<string, Promise<WardBrief>>();

function topFlagReasons(ledger: WardLedger): string[] {
  const counts = new Map<string, number>();
  for (const flag of ledger.flags) counts.set(flag.kind, (counts.get(flag.kind) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([kind, n]) => `${kind}: ${n}`);
}

/** Everything the brief may use, already computed. Claude explains; it does not count. */
export function briefFacts(ledger: WardLedger, scores: ContractorScore[], next: NextRupeeItem[]): string {
  const { ward, outcome } = ledger;
  const lines = [
    `Ward ${ward.code} (${ward.name}), low-lying index ${ward.lowLyingIndex}, ${ward.crews} crews.`,
    `Monsoon 2025 budget ${formatInr(ledger.budgetInr)}; spent ${formatInr(ledger.spentInr)} on ${ledger.orders} work orders.`,
    `Held up: ${formatInr(outcome.heldInr)}. Failed within 30 days: ${formatInr(outcome.failedInr)}. Carries an audit flag: ${formatInr(outcome.flaggedInr)}.`,
    `SLA met on ${Math.round(ledger.slaRate * 100)}% of jobs; re-opened ${Math.round(ledger.reopenRate * 100)}%.`,
    `Flags by kind: ${topFlagReasons(ledger).join(", ") || "none"}.`,
    ledger.flags[0] ? `Example flag ${ledger.flags[0].workOrderId}: ${ledger.flags[0].reason}` : "",
    `Complaints: ${ledger.complaints.total} received, ${ledger.complaints.linked} linked to a work order, ${ledger.complaints.stillOpen} still open with no work order.`,
    `Context: ${ledger.context.heavyRainDays} heavy-rain days citywide, ${ledger.context.floodHotspots} flood hotspots, ${ledger.context.roadsUnderDlp} road segments under DLP.`,
    `Contractors here: ${ledger.byContractor
      .slice(0, 3)
      .map((slice) => {
        const score = scores.find((s) => s.contractor.id === slice.key);
        return `${slice.label} ${formatInr(slice.spentInr)}, re-open ${Math.round(slice.reopenRate * 100)}% (fair expectation ${Math.round((score?.expectedReopenRate ?? 0) * 100)}%)`;
      })
      .join("; ")}.`,
    `Next rupee, top 3: ${next
      .slice(0, 3)
      .map((item) => `${item.roadName} (${item.reasons[0] ?? "risk"}; ${item.suggestedMethod}, about ${formatInr(item.estCostInr)}${item.underDlp ? ", DLP contractor should pay" : ""})`)
      .join("; ")}.`,
  ];
  return lines.filter(Boolean).join("\n");
}

function templateBrief(ledger: WardLedger, next: NextRupeeItem[]): string {
  const { outcome } = ledger;
  const pct = (n: number) => `${Math.round((n / Math.max(ledger.spentInr, 1)) * 100)}%`;
  const spentLine =
    ledger.spentInr > ledger.budgetInr
      ? `went ${formatInr(ledger.spentInr - ledger.budgetInr)} over its ${formatInr(ledger.budgetInr)} budget`
      : `spent ${formatInr(ledger.spentInr)} of its ${formatInr(ledger.budgetInr)} budget`;
  const first = next[0];
  return [
    `${ledger.ward.code} ward ${spentLine} across ${ledger.orders} repairs.`,
    `${pct(outcome.heldInr)} of that went on work that held up, ${pct(outcome.failedInr)} on fixes that failed within 30 days, and ${pct(outcome.flaggedInr)} carries an audit flag that needs an explanation.`,
    first
      ? `The next rupee should go to ${first.roadName} first: ${first.reasons[0]?.toLowerCase() ?? "it carries the highest risk"}. A ${first.suggestedMethod.toLowerCase()} costs about ${formatInr(first.estCostInr)}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function hasCredentials(): boolean {
  if (process.env.VITEST) return false;
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

async function askClaude(facts: string): Promise<string | null> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: SYSTEM,
    messages: [{ role: "user", content: facts }],
  });
  const text = response.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
  return text || null;
}

/** A plain-language brief for one ward. Claude when credentials exist, otherwise a template. */
export function wardBrief(
  ledger: WardLedger,
  scores: ContractorScore[],
  next: NextRupeeItem[],
): Promise<WardBrief> {
  const key = ledger.ward.code;
  const held = cache.get(key);
  if (held) return held;
  const fallback: WardBrief = { text: templateBrief(ledger, next), source: "template" };
  if (!hasCredentials()) return Promise.resolve(fallback);
  const pending = askClaude(briefFacts(ledger, scores, next))
    .then((text): WardBrief => (text ? { text, source: "claude" } : fallback))
    .catch((error: unknown) => {
      cache.delete(key);
      if (error instanceof Anthropic.APIError) console.error(`ward brief ${key}: ${error.status} ${error.message}`);
      else console.error(`ward brief ${key}:`, error);
      return fallback;
    });
  cache.set(key, pending);
  return pending;
}
