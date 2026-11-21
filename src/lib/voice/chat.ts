import { runWithin } from "./deadline";
import type { ChatTool } from "./tools";
import type { ModelTarget } from "./targets";

export type ApiToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ApiToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type ChatTurn = {
  latencyMs: number;
  status: number;
  content: string | null;
  toolCalls: ApiToolCall[];
  finishReason: string | null;
  /** Raw response body, kept verbatim in the run log. */
  raw: unknown;
};

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Sarvam chat needs BOTH the bearer token and `api-subscription-key`. OpenAI,
 * Gemini, and Cerebras need the bearer only. That is the entire provider
 * difference.
 */
export function chatHeaders(target: ModelTarget): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${target.apiKey}`,
  };
  if (target.subscriptionHeader) headers["api-subscription-key"] = target.apiKey;
  return headers;
}

export function chatUrl(baseURL: string): string {
  return `${baseURL.replace(/\/+$/, "")}/chat/completions`;
}

function asToolCalls(message: Record<string, unknown> | undefined): ApiToolCall[] {
  if (!message) return [];
  const list = message.tool_calls;
  if (Array.isArray(list)) {
    return list.flatMap((entry, index) => {
      const item = entry as Record<string, unknown>;
      const fn = item.function as Record<string, unknown> | undefined;
      if (!fn || typeof fn.name !== "string") return [];
      const args = typeof fn.arguments === "string" ? fn.arguments : JSON.stringify(fn.arguments ?? {});
      const id = typeof item.id === "string" ? item.id : `call_${index}`;
      return [{ id, type: "function" as const, function: { name: fn.name, arguments: args } }];
    });
  }
  // Some OpenAI-compatible shims still answer with the deprecated single
  // function_call. Treat it as one tool call rather than scoring a false zero.
  const legacy = message.function_call as Record<string, unknown> | undefined;
  if (legacy && typeof legacy.name === "string") {
    const args =
      typeof legacy.arguments === "string" ? legacy.arguments : JSON.stringify(legacy.arguments ?? {});
    return [{ id: "call_legacy", type: "function", function: { name: legacy.name, arguments: args } }];
  }
  return [];
}

export class ChatHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    readonly latencyMs: number,
  ) {
    super(`HTTP ${status}: ${body.slice(0, 500)}`);
    this.name = "ChatHttpError";
  }
}

export async function chatCompletion(
  target: ModelTarget,
  messages: ChatMessage[],
  tools: ChatTool[],
  options: { fetchImpl?: FetchLike; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<ChatTurn> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  const started = Date.now();
  const { response, text, latencyMs } = await runWithin(async (signal) => {
    const response = await fetchImpl(chatUrl(target.baseURL), {
      method: "POST",
      headers: chatHeaders(target),
      signal,
      body: JSON.stringify({
        model: target.model,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0,
      }),
    });
    const latencyMs = Date.now() - started;
    const text = await response.text();
    return { response, text, latencyMs };
  }, options.timeoutMs ?? 60_000, options.signal);
  if (!response.ok) throw new ChatHttpError(response.status, text, latencyMs);
  const raw = JSON.parse(text) as Record<string, unknown>;
  const choices = raw.choices as Array<Record<string, unknown>> | undefined;
  const choice = choices?.[0];
  const message = choice?.message as Record<string, unknown> | undefined;
  return {
    latencyMs,
    status: response.status,
    content: typeof message?.content === "string" ? message.content : null,
    toolCalls: asToolCalls(message),
    finishReason: typeof choice?.finish_reason === "string" ? choice.finish_reason : null,
    raw,
  };
}
