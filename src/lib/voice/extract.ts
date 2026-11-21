import "server-only";

import type { LabelLanguage } from "@/lib/chip-labels";
import {
  chatCompletion,
  type ChatMessage,
  type FetchLike,
} from "./chat";
import { CHAT_CALL_CAP_MS, deadlineError, type VoiceBudget } from "./deadline";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import { DEFAULT_MAX_TURNS } from "./run";
import type { VoiceSlot } from "./slots";
import type { ModelTarget } from "./targets";
import { VOICE_TOOLS } from "./tools";
import {
  validateToolCall,
  type NormalizedCall,
  type RawToolCall,
} from "./validate";

export type ExtractVoiceOptions = {
  fetchImpl?: FetchLike;
  maxTurns?: number;
  /** The question this transcript answers, in a follow-up turn. */
  asked?: string;
  /** The language they spoke, which the description is written in. */
  lang?: LabelLanguage;
  /** When set, each model call stops at the turn deadline. */
  budget?: VoiceBudget;
};

type ProcessedCall = {
  reply: string;
};

function processCall(
  raw: RawToolCall,
  accepted: Map<VoiceSlot, NormalizedCall>,
  warnings: string[],
): ProcessedCall {
  const verdict = validateToolCall(raw);
  if (!verdict.ok) {
    warnings.push(`${verdict.name}: ${verdict.reason}`);
    return {
      reply: JSON.stringify({ status: "rejected", reason: verdict.reason }),
    };
  }
  if (accepted.has(verdict.call.slot)) {
    const reason = "duplicate ignored";
    warnings.push(`${verdict.call.slot}: ${reason}`);
    return {
      reply: JSON.stringify({ status: "rejected", reason }),
    };
  }
  accepted.set(verdict.call.slot, verdict.call);
  return {
    reply: JSON.stringify({ status: "saved", slot: verdict.call.slot }),
  };
}

export async function extractVoiceCalls(
  transcript: string,
  target: ModelTarget,
  options: ExtractVoiceOptions = {},
): Promise<{ calls: NormalizedCall[]; warnings: string[] }> {
  const maxTurns = options.maxTurns ?? DEFAULT_MAX_TURNS;
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: buildUserPrompt(transcript, options.asked, options.lang) },
  ];
  const accepted = new Map<VoiceSlot, NormalizedCall>();
  const warnings: string[] = [];

  for (let turn = 0; turn < maxTurns; turn += 1) {
    const timeoutMs = options.budget?.limit(CHAT_CALL_CAP_MS);
    if (options.budget && (options.budget.signal.aborted || (timeoutMs ?? 0) <= 0)) {
      throw deadlineError();
    }
    const result = await chatCompletion(target, messages, VOICE_TOOLS, {
      fetchImpl: options.fetchImpl,
      ...(timeoutMs !== undefined && options.budget
        ? { timeoutMs, signal: options.budget.signal }
        : {}),
    });
    if (result.toolCalls.length === 0) break;

    messages.push({
      role: "assistant",
      content: result.content,
      tool_calls: result.toolCalls,
    });
    for (const apiCall of result.toolCalls) {
      const processed = processCall(
        {
          name: apiCall.function.name,
          argumentsJson: apiCall.function.arguments,
        },
        accepted,
        warnings,
      );
      messages.push({
        role: "tool",
        tool_call_id: apiCall.id,
        content: processed.reply,
      });
    }
  }

  return { calls: [...accepted.values()], warnings };
}
