import { toLabelLanguage, type LabelLanguage } from "@/lib/chip-labels";
import { NOTICED_WINDOWS } from "@/lib/types";
import type { VoiceFormPatch } from "./contracts";

/**
 * The questions, in the order the assistant asks them: the four answers the
 * form cannot record without, then the place, then an optional "anything
 * else". The photo is taken before the conversation starts. Place only counts
 * once the person confirms the pin themselves; voice can only propose one.
 */
export const ASK_SLOTS = ["issue_type", "noticed_window", "recurs", "place", "description"] as const;
export type AskSlot = (typeof ASK_SLOTS)[number];

/** Every reply the assistant can speak without echoing user speech. */
export const PROMPT_KEYS = [...ASK_SLOTS, "place_confirm", "place_tap", "done", "retry"] as const;
export type PromptKey = (typeof PROMPT_KEYS)[number];

/** What goes in front of a question: an acknowledgement, an apology, a greeting, or nothing. */
export const PROMPT_LEADS = ["ack", "sorry", "hello", "none"] as const;
export type PromptLead = (typeof PROMPT_LEADS)[number];

export type PromptSpec = { key: PromptKey; lead: PromptLead; lang: LabelLanguage };

/** The slice of form state the conversation reads. Never written through this. */
export type VoiceFormValues = {
  issueType: string;
  noticedWindow: string;
  recurs: string;
  description: string;
  /** The person tapped "Yes, this is the spot". */
  placeConfirmed: boolean;
  /** The person answered "anything else?", even if only with "no". */
  descriptionDone: boolean;
};

export function isAskSlot(value: unknown): value is AskSlot {
  return (ASK_SLOTS as readonly unknown[]).includes(value);
}

export function isPromptKey(value: unknown): value is PromptKey {
  return (PROMPT_KEYS as readonly unknown[]).includes(value);
}

export function isPromptLead(value: unknown): value is PromptLead {
  return (PROMPT_LEADS as readonly unknown[]).includes(value);
}

export function filledSlots(values: VoiceFormValues): AskSlot[] {
  const filled: AskSlot[] = [];
  if (values.issueType) filled.push("issue_type");
  if ((NOTICED_WINDOWS as readonly string[]).includes(values.noticedWindow)) filled.push("noticed_window");
  if (values.recurs === "true" || values.recurs === "false") filled.push("recurs");
  if (values.placeConfirmed) filled.push("place");
  if (values.descriptionDone || values.description.trim()) filled.push("description");
  return filled;
}

export function patchSlots(patch: VoiceFormPatch): AskSlot[] {
  const filled: AskSlot[] = [];
  if (patch.issueType) filled.push("issue_type");
  if (patch.noticedWindow) filled.push("noticed_window");
  if (patch.recurs) filled.push("recurs");
  if (patch.description?.trim()) filled.push("description");
  return filled;
}

export function nextMissing(filled: Iterable<string>): AskSlot | null {
  const have = new Set(filled);
  return ASK_SLOTS.find((slot) => !have.has(slot)) ?? null;
}

/**
 * Reply in the language the person spoke when it is one we hold copy for,
 * as Udyam-Saathi switches the session language on hearing a different one.
 * Anything else (Sarvam's `unknown`, Gujarati) keeps the language they chose.
 */
export function pickReplyLanguage(detected: string | null | undefined, selected: string): LabelLanguage {
  const base = (detected ?? "").trim().toLowerCase().split(/[-_]/)[0];
  return base === "en" || base === "hi" || base === "mr" ? base : toLabelLanguage(selected);
}

type Templates = Record<PromptKey, string> & { ack: string; sorry: string; hello: string };

const TEMPLATES: Record<LabelLanguage, Templates> = {
  en: {
    ack: "Got it.",
    sorry: "Sorry, I did not catch that.",
    hello: "Namaste!",
    issue_type: "What is the problem? For example a broken footpath, garbage, or a blocked drain.",
    noticed_window:
      "When did you notice it? Today, this week, this month, 1 to 6 months ago, or more than six months ago.",
    recurs: "Does it keep coming back after it is cleared?",
    place: "Where is it? Say a nearby landmark or shop, or pick one below. Then check the pin on the map.",
    place_confirm: "Is the pin in the right spot? Drag it if not, then tap Yes.",
    place_tap: "To confirm the place, check the map and tap “Yes, this is the spot”.",
    description: "Anything else people should know? Say it, or tap No, that's all.",
    done: "Thank you, that is everything. Now check your report, then record it.",
    retry: "Okay. Tap the microphone and say it again.",
  },
  hi: {
    ack: "ठीक है।",
    sorry: "माफ़ कीजिए, मैं समझ नहीं पाया।",
    hello: "नमस्ते!",
    issue_type: "समस्या क्या है? जैसे टूटा फुटपाथ, कचरा, या बंद नाली।",
    noticed_window:
      "आपने यह कब देखा? आज, इस हफ़्ते, इस महीने, एक से छह महीने पहले, या छह महीने से ज़्यादा?",
    recurs: "क्या यह साफ़ होने के बाद फिर से हो जाता है?",
    place: "यह कहाँ है? पास की किसी जगह या दुकान का नाम बोलिए, या नीचे से चुनिए। फिर नक्शे पर पिन देख लीजिए।",
    place_confirm: "क्या पिन सही जगह पर है? नहीं तो उसे खिसकाइए, फिर हाँ दबाइए।",
    place_tap: "जगह पक्की करने के लिए नक्शा देखिए और “हाँ, यही जगह है” दबाइए।",
    description: "और कुछ बताना है? बोलिए, या 'बस इतना ही' दबाइए।",
    done: "धन्यवाद, सब हो गया। अब अपनी रिपोर्ट जाँचिए, फिर रिकॉर्ड कीजिए।",
    retry: "ठीक है। माइक दबाइए और फिर से बोलिए।",
  },
  mr: {
    ack: "ठीक आहे.",
    sorry: "माफ करा, मला समजलं नाही.",
    hello: "नमस्कार!",
    issue_type: "समस्या काय आहे? जसं तुटलेला फुटपाथ, कचरा, किंवा तुंबलेलं गटार.",
    noticed_window:
      "तुम्ही हे कधी पाहिलं? आज, या आठवड्यात, या महिन्यात, एक ते सहा महिन्यांपूर्वी, किंवा सहा महिन्यांपेक्षा जास्त?",
    recurs: "साफ केल्यानंतर हे पुन्हा पुन्हा होतं का?",
    place: "हे कुठे आहे? जवळच्या एखाद्या ठिकाणाचं किंवा दुकानाचं नाव सांगा, किंवा खालून निवडा. मग नकाशावर पिन तपासा.",
    place_confirm: "पिन बरोबर ठिकाणी आहे का? नसेल तर ती हलवा, मग होय दाबा.",
    place_tap: "जागा निश्चित करण्यासाठी नकाशा पाहा आणि “होय, हीच जागा” दाबा.",
    description: "अजून काही सांगायचं आहे का? बोला, किंवा 'एवढंच' दाबा.",
    done: "धन्यवाद, सगळं झालं. आता तुमची रिपोर्ट तपासा, मग रेकॉर्ड करा.",
    retry: "ठीक आहे. माईक दाबा आणि पुन्हा बोला.",
  },
};

/** English questions handed to the extractor so a bare "kal" lands in the right slot. */
export function askedQuestion(slot: AskSlot): string {
  return TEMPLATES.en[slot];
}

/**
 * The text of a reply, always rebuilt from templates on the server, never taken
 * from the browser. That keeps text-to-speech from being an open proxy.
 */
export function promptText({ key, lead, lang }: PromptSpec): string {
  const copy = TEMPLATES[lang];
  const question = copy[key];
  if (lead === "none" || key === "done" || key === "retry" || key === "place_tap") return question;
  return `${copy[lead]} ${question}`;
}

/** The greeting or acknowledgement on its own, so the screen can set "Namaste!" as a headline. */
export function leadText(lead: PromptLead, lang: LabelLanguage): string {
  return lead === "none" ? "" : TEMPLATES[lang][lead];
}

/** Udyam-Saathi's weak-transcript check: repeat it back and ask yes or no. */
export function heardText(transcript: string, lang: LabelLanguage): string {
  const clipped = transcript.length > 160 ? `${transcript.slice(0, 157)}…` : transcript;
  if (lang === "hi") return `मैंने सुना “${clipped}”। क्या यह सही है?`;
  if (lang === "mr") return `मी ऐकलं “${clipped}”. हे बरोबर आहे का?`;
  return `I heard “${clipped}”. Is that right?`;
}
