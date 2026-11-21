import { AFFECTS, ISSUE_TYPES, NOTICED_WINDOWS, type Affects, type IssueType, type NoticedWindow } from "@/lib/types";
import type { VoiceSlot } from "./slots";
import { LANDMARK_IDS, VOICE_TOOL_NAMES, type VoiceToolName } from "./tools";

/** A tool call exactly as an OpenAI-compatible response carries it. */
export type RawToolCall = { name: string; argumentsJson: string };

export type NormalizedCall =
  | { slot: "issue_type"; value: IssueType }
  | { slot: "noticed_window"; value: NoticedWindow }
  | { slot: "recurs"; value: "true" | "false" }
  | { slot: "affects"; value: Affects[] }
  | { slot: "description"; value: string }
  | { slot: "pin"; value: string };

export type CallVerdict =
  | { ok: true; call: NormalizedCall }
  | { ok: false; name: string; reason: string };

const TOOL_TO_SLOT: Record<VoiceToolName, VoiceSlot> = {
  save_issue_type: "issue_type",
  save_noticed_window: "noticed_window",
  save_recurs: "recurs",
  save_affects: "affects",
  save_description: "description",
  propose_pin: "pin",
};

const ARG_KEY: Record<VoiceToolName, string> = {
  save_issue_type: "issue_type",
  save_noticed_window: "noticed_window",
  save_recurs: "recurs",
  save_affects: "affects",
  save_description: "description",
  propose_pin: "landmark_id",
};

function isToolName(name: string): name is VoiceToolName {
  return (VOICE_TOOL_NAMES as readonly string[]).includes(name);
}

function bad(name: string, reason: string): CallVerdict {
  return { ok: false, name, reason };
}

function parseArgs(raw: RawToolCall): Record<string, unknown> | string {
  const text = raw.argumentsJson.trim();
  if (text === "") return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return "arguments are not valid JSON";
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return "arguments are not a JSON object";
  }
  return parsed as Record<string, unknown>;
}

function checkAffects(value: unknown): Affects[] | string {
  if (!Array.isArray(value)) return "affects is not an array";
  if (value.length === 0) return "affects is empty; the form rejects an empty selection";
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") return "affects contains a non-string";
    if (!(AFFECTS as readonly string[]).includes(entry)) {
      return `affects contains ${JSON.stringify(entry)}, which is outside the enum`;
    }
    if (seen.has(entry)) return `affects repeats ${JSON.stringify(entry)}`;
    seen.add(entry);
  }
  return value as Affects[];
}

/**
 * Validate one emitted tool call against exactly what the app accepts. Every
 * rejection here is a rejection the real form or `createReportAction` would
 * also make, so an invalid call is a genuine defect, not harness pedantry.
 */
export function validateToolCall(raw: RawToolCall): CallVerdict {
  if (!isToolName(raw.name)) {
    return bad(raw.name, `no such tool; the six tools are ${VOICE_TOOL_NAMES.join(", ")}`);
  }
  const args = parseArgs(raw);
  if (typeof args === "string") return bad(raw.name, args);

  const key = ARG_KEY[raw.name];
  if (!(key in args)) return bad(raw.name, `missing required argument ${key}`);
  const value = args[key];
  const slot = TOOL_TO_SLOT[raw.name];

  if (slot === "affects") {
    const checked = checkAffects(value);
    if (typeof checked === "string") return bad(raw.name, checked);
    return { ok: true, call: { slot, value: checked } };
  }

  if (typeof value !== "string") {
    return bad(raw.name, `${key} is ${typeof value}, expected a string`);
  }

  switch (slot) {
    case "issue_type":
      if (!(ISSUE_TYPES as readonly string[]).includes(value)) {
        return bad(raw.name, `${JSON.stringify(value)} is not one of the nine issue types`);
      }
      return { ok: true, call: { slot, value: value as IssueType } };
    case "noticed_window":
      if (!(NOTICED_WINDOWS as readonly string[]).includes(value)) {
        return bad(raw.name, `${JSON.stringify(value)} is not one of the five noticed windows`);
      }
      return { ok: true, call: { slot, value: value as NoticedWindow } };
    case "recurs":
      if (value !== "true" && value !== "false") {
        return bad(raw.name, `recurs must be the string "true" or "false", got ${JSON.stringify(value)}`);
      }
      return { ok: true, call: { slot, value } };
    case "description":
      if (value.length > 2000) return bad(raw.name, "description exceeds 2000 characters");
      return { ok: true, call: { slot, value } };
    default:
      if (!LANDMARK_IDS.includes(value)) {
        return bad(raw.name, `${JSON.stringify(value)} is not a known landmark id`);
      }
      return { ok: true, call: { slot: "pin", value } };
  }
}
