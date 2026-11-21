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
Readers are citizens and their corporator, reading on a phone. Write 90 to 110 words of plain English, one paragraph. Never go over 120.
Use only the figures given. Do not invent causes, names or numbers, and do not do your own arithmetic beyond rounding.
Start with the conditions the contractor worked in, comparing their high-stress share with the city-wide one using the difference given: a negative difference means fewer
high-stress jobs than the city average, so do not call that harder. Then say how
the repairs lasted, the billing and the timeliness, each against what was expected. For every rate, lower is better, so a
rate above expected is worse and a rate below expected is better. Call a part "close to expected" only if its ratio is
within about 10% of 1.00; otherwise say which way it differs and by roughly how much. Name the lowest and the highest part
exactly as given in the line starting "By part score", and do not choose them any other way. Do not say a contractor is on track or fine if any part is clearly worse than expected. Mention repeat repairs only as something to ask about, never as part of the score, and note
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
    // Room for a short think plus a ~120 word answer. Thinking stays on: with it off, Haiku mislabelled the lowest part.
    max_tokens: 4000,
    output_config: { effort: "medium" },
    system: SYSTEM,
    messages: [{ role: "user", content: facts }],
  });
  if (response.stop_reason === "refusal") {
    return { status: "unavailable", reason: "The model declined to write this summary." };
  }
  if (response.stop_reason === "max_tokens") {
    return { status: "unavailable", reason: "The summary was cut off before it finished." };
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
