import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { ToolContext } from "./tools/executor";
import { executeAssistantTool } from "./tools/executor";
import { ASSISTANT_TOOLS } from "./tools/definitions";
import type { AssistantLanguage, AssistantStructuredResponse, EvidenceBundle } from "./types";
import { generateFactualFallbackAnswer, validateAndSanitizeResponse } from "./response-schema";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022";

const SYSTEM_PROMPT = `You are the Rasta Hisaab Citizen Accountability Assistant for Mumbai road repairs.
Your sole job is to explain to ordinary citizens what happened to their road complaints using actual BMC records.

STRICT FACTUALITY AND ETHICAL RULES:
1. NEVER invent a contractor name, work order ID, or repair amount.
2. NEVER assume that a completed work order means the road is fixed today.
3. NEVER treat a probable candidate match as an official BMC link. State clearly when a link is unverified.
4. If no work order is linked, state plainly that no work order was found in available records.
5. NEVER accuse an organisation or contractor of crime or fraud; speak factually.
6. Short paragraphs, plain language, easily readable on mobile.

STRUCTURE YOUR CITIZEN ANSWER IN THIS EXACT ORDER:
1. Direct answer (plain language).
2. What the official records show.
3. What happened so far.
4. What remains unresolved.
5. What the citizen can do next.
6. Supporting record references.

Answer in the requested language (English, Hindi, or Marathi). If Hinglish is used, respond in clean Hindi or English as appropriate.`;

export function hasAnthropicCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export type ClaudeOrchestrationOptions = {
  evidence: EvidenceBundle | null;
  toolCtx: ToolContext;
  language: AssistantLanguage;
  maxTurns?: number;
};

/**
 * Orchestrates Claude with function calling tools to answer citizen accountability questions.
 * Gracefully falls back to deterministic factual templates when offline or without API keys.
 */
export async function queryClaudeAssistant(
  citizenQuery: string,
  options: ClaudeOrchestrationOptions,
): Promise<AssistantStructuredResponse> {
  const { evidence, toolCtx, language, maxTurns = 3 } = options;

  if (!hasAnthropicCredentials()) {
    // Deterministic factual fallback when running offline or in unit tests
    return validateAndSanitizeResponse(
      {
        answer: evidence ? generateFactualFallbackAnswer(evidence, language) : "No records found matching your query.",
        responseLanguage: language,
      },
      evidence,
      language,
    );
  }

  try {
    const client = new Anthropic();
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: `Citizen question: "${citizenQuery}"\nLanguage: ${language}\nAttached Complaint ID: ${evidence?.complaintId ?? "none"}`,
      },
    ];

    let currentTurn = 0;
    while (currentTurn < maxTurns) {
      currentTurn++;
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        tools: ASSISTANT_TOOLS,
        messages,
      });

      if (response.stop_reason === "tool_use") {
        // Collect assistant message with tool calls
        messages.push({ role: "assistant", content: response.content });

        const toolResultContents: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type === "tool_use") {
            const result = executeAssistantTool(
              block.name,
              block.input as Record<string, unknown>,
              toolCtx,
            );
            toolResultContents.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(result.data ?? { error: result.error }),
            });
          }
        }

        messages.push({ role: "user", content: toolResultContents });
      } else {
        // Final text synthesis
        const textContent = response.content
          .flatMap((b) => (b.type === "text" ? [b.text] : []))
          .join("\n")
          .trim();

        return validateAndSanitizeResponse(
          {
            answer: textContent,
            responseLanguage: language,
          },
          evidence,
          language,
        );
      }
    }

    // If max turns reached, return validated fallback
    return validateAndSanitizeResponse(
      {
        answer: evidence ? generateFactualFallbackAnswer(evidence, language) : "Query processing timed out.",
        responseLanguage: language,
      },
      evidence,
      language,
    );
  } catch (err) {
    // Network or API failure fallback
    console.error("Claude assistant invocation error, falling back to evidence template:", err);
    return validateAndSanitizeResponse(
      {
        answer: evidence ? generateFactualFallbackAnswer(evidence, language) : "Unable to reach assistant service.",
        responseLanguage: language,
      },
      evidence,
      language,
    );
  }
}
