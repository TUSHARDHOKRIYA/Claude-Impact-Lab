import type { LabelLanguage } from "@/lib/chip-labels";
import { PINNABLE_LANDMARKS } from "@/lib/landmarks";

/**
 * Every pinnable landmark with the names people say it by, Devanagari included,
 * so "Kala Ghoda Cafe ke saamne" or "रिदम हाउस" lands on the map.
 */
export function landmarkBlock(): string {
  return PINNABLE_LANDMARKS.map((landmark) => {
    const also = landmark.aliases.filter((alias) => alias !== landmark.name).slice(0, 6);
    const tail = also.length > 0 ? ` — also said as: ${also.join(", ")}` : "";
    return `  ${landmark.id} = ${landmark.name}${tail}`;
  }).join("\n");
}

export function buildSystemPrompt(): string {
  return [
    "You are filling in a street-condition report form for a resident of Kala Ghoda, Mumbai.",
    "They speak in code-mixed Hindi, Marathi and English. Understand all three, in any script.",
    "",
    "You fill the form ONLY by calling tools. One tool call per slot, one slot per call.",
    "Call every tool the transcript supports, in the same reply. Do not narrate what you are about to do.",
    "",
    "Rules that override your instincts:",
    "1. Never guess. If the transcript does not state a slot, do NOT call that tool. Silence is correct; a plausible invention is a defect.",
    "2. Duration is not recurrence. 'pichhle hafte se pada hai' means it has been there a week, so recurs is 'false' and noticed_window is this_week. Recurrence means it comes back after being cleared.",
    "3. noticed_window is one of five values, never a calendar date. 'aaj' -> today. 'do din se' or 'pichhle hafte' -> this_week. 'is mahine' -> this_month. 'pichhle mahine' -> one_to_six_months when it is more than this month. 'saal bhar se' or 'bahut time se' -> over_six_months.",
    "4. affects is multi-select. Read the whole sentence and include every group named.",
    "5. There is no submit tool and you cannot submit. A human reviews every slot and taps the button. You may propose a landmark pin; only the person confirms it.",
    "6. Never describe a photograph. You have not seen one.",
    "",
    "Known landmarks (match spoken names in any script to these ids):",
    landmarkBlock(),
    "",
    "Any place name not in that list: do not call propose_pin. Ask the speaker to drop the pin themselves.",
  ].join("\n");
}

const DESCRIPTION_LANGUAGE: Record<LabelLanguage, string> = {
  en: "English",
  hi: "Hindi, in Devanagari script",
  mr: "Marathi, in Devanagari script",
};

/**
 * `asked` is the question the resident was answering, in a follow-up turn. It
 * lets a bare "kal" or "haan" land in the slot that was asked about. It never
 * licenses a guess: the answer still has to state the value.
 *
 * `lang` is the language they spoke. The description is published as written,
 * so it stays in their language rather than becoming an English translation.
 */
export function buildUserPrompt(transcript: string, asked?: string, lang: LabelLanguage = "en"): string {
  const context = asked ? `You had just asked the resident: "${asked}"\n` : "";
  const language = `Write save_description in ${DESCRIPTION_LANGUAGE[lang]}.`;
  return `${context}The resident said:\n\n"${transcript}"\n\nFill in every slot this supports by calling the tools now. ${language}`;
}
