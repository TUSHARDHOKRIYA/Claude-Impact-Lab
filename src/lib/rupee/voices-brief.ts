import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import type { Dataset } from "./load";
import { templateVoices, voiceFacts, voicePacket, type VoiceLine } from "./voices";

export type WardVoices = {
  text: string;
  source: "claude" | "template";
  lines: VoiceLine[];
};

const MODEL = process.env.RUPEE_BRIEF_MODEL ?? "claude-opus-5-5";

const SYSTEM = `You write one short paragraph for a Mumbai ward page from citizen complaints and social posts.
Write 80 to 120 words of plain English.
Say which places people name, what is still broken, and whether anyone says a repair came back.
Cite up to four ids from the packet in parentheses. Quote at most one short phrase, in the original language.
Skip greetings and forwarded warnings that do not name a road problem.
Do not mention budgets, rupees, contractors, or fraud. Do not say the data is synthetic.
No headings and no lists.`;

const cache = new Map<string, Promise<WardVoices>>();

function hasCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

async function askClaude(facts: string): Promise<string | null> {
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [{ role: "user", content: facts }],
  });
  if (response.stop_reason === "refusal") return null;
  const text = response.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
  return text || null;
}

/** Claude reads the ward's complaint and social text. The selector has already chosen the rows. */
export function wardVoices(ds: Dataset, ward: string): Promise<WardVoices> {
  const held = cache.get(ward);
  if (held) return held;
  const packet = voicePacket(ds, ward);
  const fallback: WardVoices = { text: templateVoices(packet), source: "template", lines: packet.lines };
  if (!hasCredentials() || packet.lines.length === 0) return Promise.resolve(fallback);
  const pending = askClaude(voiceFacts(packet))
    .then((text): WardVoices => (text ? { text, source: "claude", lines: packet.lines } : fallback))
    .catch((error: unknown) => {
      cache.delete(ward);
      if (error instanceof Anthropic.APIError) console.error(`ward voices ${ward}: ${error.status} ${error.message}`);
      else console.error(`ward voices ${ward}:`, error);
      return fallback;
    });
  cache.set(ward, pending);
  return pending;
}
