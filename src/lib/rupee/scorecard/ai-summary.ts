import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { contractorFacts } from "./ai-facts";
import { getScorecards } from "./index";
import type { ContractorScorecard } from "./types";

export type ContractorSummary =
  | { status: "ok"; text: string; model: string }
  | { status: "unavailable"; reason: string };

/** The cheapest current model. Override with RUPEE_CONTRACTOR_MODEL. */
const MODEL = process.env.RUPEE_CONTRACTOR_MODEL ?? "claude-haiku-5-5";

const SYSTEM = `You write the plain-language summary at the top of a Mumbai road contractor's scorecard.
Readers are citizens and their corporator, reading on a phone. Write 90 to 130 words of plain English, one paragraph.
Use only the figures given. Do not invent causes, names or numbers, and do not do your own arithmetic beyond rounding.
Start with the conditions the contractor worked in (the stress mix), then say how the repairs lasted, the billing and the
timeliness, each against what was expected. Say plainly which of the three is weakest and which is strongest, and say if
they are all close to expected. Mention repeat repairs only as something to ask about, never as part of the score, and note
that same-day repeats may be duplicate orders. A rank is only a rough order: scores a few points apart are not meaningfully
different, so say so if the contractor sits near a neighbour. Never say fraud, scam, corrupt or cheating; say "needs an
explanation". Use Indian number formatting with the rupee sign exactly as given. No headings, no lists, no greeting.`;

const cache = new Map<string, Promise<ContractorSummary>>();

function hasCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

async function askClaude(facts: string): Promise<ContractorSummary> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    // A short explanation of numbers already computed: low effort is enough.
    output_config: { effort: "low" },
    system: SYSTEM,
    messages: [{ role: "user", content: facts }],
  });
  if (response.stop_reason === "refusal") {
    return { status: "unavailable", reason: "The model declined to write this summary." };
  }
  const text = response.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
  return text
    ? { status: "ok", text, model: response.model }
    : { status: "unavailable", reason: "The model returned no text." };
}

/**
 * The summary for one contractor, written by Claude from the computed figures.
 * There is no template fallback: without a key, or if the call fails, the page
 * says the summary is unavailable rather than showing pre-written text.
 */
export function contractorSummary(card: ContractorScorecard): Promise<ContractorSummary> {
  if (!hasCredentials()) {
    return Promise.resolve({ status: "unavailable", reason: "No ANTHROPIC_API_KEY is set on the server." });
  }
  const held = cache.get(card.id);
  if (held) return held;
  const facts = contractorFacts(card, getScorecards().cards.length);
  const pending = askClaude(facts).catch((error: unknown): ContractorSummary => {
    cache.delete(card.id);
    if (error instanceof Anthropic.APIError) {
      console.error(`contractor summary ${card.id}: ${error.status} ${error.message}`);
      return { status: "unavailable", reason: `The Claude API returned an error (${error.status}).` };
    }
    console.error(`contractor summary ${card.id}:`, error);
    return { status: "unavailable", reason: "The summary could not be generated." };
  });
  cache.set(card.id, pending);
  return pending;
}
