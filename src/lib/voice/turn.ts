import { toLabelLanguage, type LabelLanguage } from "@/lib/chip-labels";
import type { SpeechTranscript, VoiceFormPatch, VoiceReply } from "./contracts";
import {
  heardText,
  isAskSlot,
  nextMissing,
  patchSlots,
  promptText,
  type AskSlot,
  type PromptKey,
  type PromptSpec,
} from "./conversation";

/**
 * Below this Sarvam language probability the transcript is treated as weak and
 * repeated back for a Yes or No before anything lands in the form. Sarvam
 * reports ~0.9+ for clean speech in one language; code-mixed speech sits lower
 * but well above this.
 */
export const LOW_CONFIDENCE = 0.5;

/** What the browser tells the server about the conversation so far. */
export type TurnContext = {
  lang: LabelLanguage;
  filled: AskSlot[];
  asked: AskSlot | null;
  speak: boolean;
  /** A pin is already down from an earlier turn or a landmark chip, not yet confirmed. */
  pinned: boolean;
};

function parseFilled(raw: FormDataEntryValue | null): AskSlot[] {
  if (typeof raw !== "string" || raw === "") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? [...new Set(parsed.filter(isAskSlot))] : [];
  } catch {
    return [];
  }
}

/** Anything malformed degrades to "first turn, English, silent", never an error. */
export function readTurnContext(form: FormData): TurnContext {
  const asked = form.get("asked");
  return {
    lang: toLabelLanguage(String(form.get("lang") ?? "")),
    filled: parseFilled(form.get("filled")),
    asked: isAskSlot(asked) ? asked : null,
    speak: form.get("speak") === "1",
    pinned: form.get("pinned") === "1",
  };
}

/**
 * The assistant's reply for one voice turn. The text is always a template or
 * the person's own transcript, never model output, so the model cannot say
 * something the form does not back.
 *
 * `spec` is set when the reply is a template (cacheable speech); null when it
 * echoes the transcript.
 */
export function composeReply(input: {
  speech: SpeechTranscript;
  fields: VoiceFormPatch;
  hasPin: boolean;
  filled: AskSlot[];
  /** The question this turn answered. Any answer to "anything else?" closes it, even "no". */
  asked?: AskSlot | null;
  /** A pin was already down before this turn. */
  pinned?: boolean;
  lang: LabelLanguage;
}): { reply: VoiceReply; spec: PromptSpec | null } {
  const got = patchSlots(input.fields);
  if (input.asked === "description") got.push("description");
  const heardSomething = got.length > 0 || input.hasPin;
  const probability = input.speech.languageProbability;
  if (heardSomething && probability !== null && probability < LOW_CONFIDENCE) {
    return {
      reply: { text: heardText(input.speech.transcript, input.lang), ask: null, confirm: true },
      spec: null,
    };
  }
  const ask = nextMissing([...input.filled, ...got]);
  // Voice can put a pin down but only the person's tap on the map confirms it. So once a pin
  // is down, the place question is "is this right?", never "where is it?" a second time; and a
  // spoken "yes" to that gets pointed at the button rather than an apology and a fresh "where".
  const pinned = input.hasPin || Boolean(input.pinned);
  const repeat = ask === "place" && input.asked === "place" && pinned && !input.hasPin;
  const key: PromptKey = ask === "place" && pinned ? (repeat ? "place_tap" : "place_confirm") : (ask ?? "done");
  const spec: PromptSpec = { key, lead: repeat ? "none" : heardSomething ? "ack" : "sorry", lang: input.lang };
  return { reply: { text: promptText(spec), ask, confirm: false }, spec };
}
