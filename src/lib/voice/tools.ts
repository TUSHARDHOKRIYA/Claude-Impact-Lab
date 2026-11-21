import { PINNABLE_LANDMARKS } from "@/lib/landmarks";
import { AFFECTS, ISSUE_TYPES, NOTICED_WINDOWS } from "@/lib/types";

/**
 * Six tools. There is no seventh. In particular there is no submit tool and
 * none may ever be added here: the human tap on Record is the only submit path
 * (see docs/handoff-goal.md hard rule 2).
 */
export const VOICE_TOOL_NAMES = [
  "save_issue_type",
  "save_noticed_window",
  "save_recurs",
  "save_affects",
  "save_description",
  "propose_pin",
] as const;

export type VoiceToolName = (typeof VOICE_TOOL_NAMES)[number];

/** Names no tool may ever take. Asserted by the test suite. */
export const FORBIDDEN_TOOL_NAMES = [
  "submit",
  "submit_report",
  "save_report",
  "create_report",
  "send_report",
  "click",
];

/** Every landmark a pin may land on: the shops, roads and buildings people actually name. */
export const LANDMARK_IDS: string[] = PINNABLE_LANDMARKS.map((landmark) => landmark.id);

type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: false;
};

export type ChatTool = {
  type: "function";
  function: { name: VoiceToolName; description: string; parameters: JsonSchema };
};

function tool(
  name: VoiceToolName,
  description: string,
  properties: Record<string, unknown>,
): ChatTool {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters: {
        type: "object",
        properties,
        required: Object.keys(properties),
        additionalProperties: false,
      },
    },
  };
}

/**
 * Chat-completions tool shape (`{type, function:{...}}`), not the flat Realtime
 * shape used in docs/research/voice-tool-contract.md. Sarvam, OpenAI and Gemini
 * all take this over /v1/chat/completions, so there is no adapter layer.
 *
 * Schema keywords are kept to the widely supported subset. `uniqueItems` and
 * `maxLength` are stated in prose instead of as keywords, because strict
 * OpenAI-compatibility shims reject them and a 400 there would mask the real
 * question this bake-off exists to answer.
 */
export const VOICE_TOOLS: ChatTool[] = [
  tool(
    "save_issue_type",
    "Save the kind of street condition. Call only when the speaker clearly named one of the nine categories. If the words fit two categories, pick the one the speaker emphasised. Otherwise ask in words instead of calling.",
    {
      issue_type: {
        type: "string",
        enum: [...ISSUE_TYPES],
        description:
          "One of the nine issue categories. Use 'other' only when none of the other eight fit; never as a default.",
      },
    },
  ),
  tool(
    "save_noticed_window",
    "Save when the speaker noticed the condition, as one of five windows. 'aaj' or 'today' is today. 'do din se', 'kal', or 'pichhle hafte' is this_week. 'is mahine' is this_month. 'pichhle mahine' or a few months is one_to_six_months. 'saal bhar se' or 'bahut time se' is over_six_months. A duration such as 'pichhle hafte se pada hai' is how long it has sat there, not recurrence. If they gave no time reference, do NOT call this tool — ask.",
    {
      noticed_window: {
        type: "string",
        enum: [...NOTICED_WINDOWS],
        description:
          "today, this_week, this_month, one_to_six_months, or over_six_months. Never a calendar date.",
      },
    },
  ),
  tool(
    "save_recurs",
    "Save whether the condition keeps coming back after being cleared or fixed. 'true' only when the speaker says it returns. A pile that has simply sat there for a week is DURATION, not recurrence, and is 'false'. If recurrence was never mentioned, do NOT call this tool — ask.",
    {
      recurs: {
        type: "string",
        enum: ["true", "false"],
        description:
          "'true' if the condition recurs, 'false' if it is a single standing occurrence. Strings, not JSON booleans: the form carries radio values.",
      },
    },
  ),
  tool(
    "save_affects",
    "Save every group the condition affects. Multi-select: include all that apply from the speaker's words, even when they are spread across one long sentence. Never collapse to one value when two were described. If the speaker named none, do NOT call this tool — ask.",
    {
      affects: {
        type: "array",
        minItems: 1,
        items: { type: "string", enum: [...AFFECTS] },
        description:
          "One or more affected groups, as snake_case enum values, no duplicates. Never display labels such as 'night safety'; the value is 'safety_at_night'.",
      },
    },
  ),
  tool(
    "save_description",
    "Save the speaker's extra detail in the language the user message names, in their own voice: first person, as they would say it ('I saw it today'), never 'the resident' or 'the speaker'. Visible facts the speaker stated, nothing added, nothing dropped. Never describe or interpret a photo. Never include names, phone numbers or accusations. Pass an empty string when they added nothing.",
    {
      description: {
        type: "string",
        description:
          "Optional free text in the named language, at most 2000 characters. Empty string means no description.",
      },
    },
  ),
  tool(
    "propose_pin",
    "Propose a map pin from a landmark the speaker named, in any script. Call only on an unmistakable match to one of the known landmark ids. For any other place name, do NOT call — ask the speaker to drop the pin themselves. The proposal is always shown to the human, never applied silently.",
    {
      landmark_id: {
        type: "string",
        enum: LANDMARK_IDS,
        description:
          "One of the known Kala Ghoda landmark ids. Never raw latitude or longitude; there is no coordinate parameter on purpose.",
      },
    },
  ),
];
