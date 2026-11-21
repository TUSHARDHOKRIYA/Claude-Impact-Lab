import {
  AFFECTS_LABELS,
  ISSUE_TYPE_LABELS,
  NOTICED_WINDOW_LABELS,
  type Affects,
  type IssueType,
  type NoticedWindow,
} from "@/lib/types";

/**
 * Hindi and Marathi labels for the report chips, for the voice flow.
 *
 * The voice path is Hindi/Marathi end to end — the person speaks Hindi, STT
 * transcribes Hindi, TTS answers in Hindi — so the chips the model fills must
 * read (and be spoken back) in the same language. `src/lib/types.ts` keeps the
 * English maps; this module adds the other two alongside and never replaces
 * them. English is imported, not re-typed, so the three cannot drift apart.
 *
 * Native Devanagari only. Romanised Indic input measurably degrades Sarvam TTS
 * output, and these exact strings feed both the screen and the spoken readback.
 *
 * Register is Mumbai street, not municipal circular: "फुटपाथ", not "पदपथ".
 */

export const LABEL_LANGUAGES = ["en", "hi", "mr"] as const;

export type LabelLanguage = (typeof LABEL_LANGUAGES)[number];

const ISSUE_TYPE_LABELS_HI: Record<IssueType, string> = {
  pothole: "गड्ढा",
  waterlogging: "पानी भरना",
  open_manhole: "खुला या टूटा मैनहोल",
  choked_drain: "बंद नाली या नाला",
  road_cave_in: "सड़क धंसना",
  broken_paver_blocks: "टूटे पेवर ब्लॉक",
  other: "सड़क की कोई और समस्या",
};

const ISSUE_TYPE_LABELS_MR: Record<IssueType, string> = {
  pothole: "खड्डा",
  waterlogging: "पाणी साचणे",
  open_manhole: "उघडे किंवा तुटलेले मॅनहोल",
  choked_drain: "तुंबलेले गटार किंवा नाला",
  road_cave_in: "रस्ता खचणे",
  broken_paver_blocks: "तुटलेले पेव्हर ब्लॉक",
  other: "रस्त्याची इतर समस्या",
};

const AFFECTS_LABELS_HI: Record<Affects, string> = {
  walking: "पैदल चलने वाले",
  wheeling: "व्हीलचेयर और प्रैम",
  two_wheelers: "दोपहिया",
  cars_and_autos: "कार, ऑटो और टैक्सी",
  buses: "बेस्ट बसें",
  ambulances: "एम्बुलेंस",
  school_route: "स्कूल जाने वाले बच्चे",
};

const AFFECTS_LABELS_MR: Record<Affects, string> = {
  walking: "चालणारे लोक",
  wheeling: "व्हीलचेअर आणि प्रॅम",
  two_wheelers: "दुचाकी",
  cars_and_autos: "कार, रिक्षा आणि टॅक्सी",
  buses: "बेस्ट बस",
  ambulances: "रुग्णवाहिका",
  school_route: "शाळेत जाणारी मुले",
};

export const ISSUE_TYPE_LABELS_BY_LANGUAGE: Record<
  LabelLanguage,
  Record<IssueType, string>
> = {
  en: ISSUE_TYPE_LABELS,
  hi: ISSUE_TYPE_LABELS_HI,
  mr: ISSUE_TYPE_LABELS_MR,
};

export const AFFECTS_LABELS_BY_LANGUAGE: Record<
  LabelLanguage,
  Record<Affects, string>
> = {
  en: AFFECTS_LABELS,
  hi: AFFECTS_LABELS_HI,
  mr: AFFECTS_LABELS_MR,
};

const NOTICED_WINDOW_LABELS_HI: Record<NoticedWindow, string> = {
  today: "आज",
  this_week: "इस हफ़्ते",
  this_month: "इस महीने",
  one_to_six_months: "एक से छह महीने पहले",
  over_six_months: "छह महीने से ज़्यादा",
};

const NOTICED_WINDOW_LABELS_MR: Record<NoticedWindow, string> = {
  today: "आज",
  this_week: "या आठवड्यात",
  this_month: "या महिन्यात",
  one_to_six_months: "एक ते सहा महिन्यांपूर्वी",
  over_six_months: "सहा महिन्यांपेक्षा जास्त",
};

export const NOTICED_WINDOW_LABELS_BY_LANGUAGE: Record<
  LabelLanguage,
  Record<NoticedWindow, string>
> = {
  en: NOTICED_WINDOW_LABELS,
  hi: NOTICED_WINDOW_LABELS_HI,
  mr: NOTICED_WINDOW_LABELS_MR,
};

/**
 * Narrow whatever the STT response reported to a language we hold labels for.
 *
 * Sarvam returns a BCP-47-ish tag (`hi-IN`, `mr-IN`, `unknown`), so the region
 * subtag is dropped and the result lowercased. Anything else — `unknown`, a
 * language we have not translated, null — falls back to English rather than
 * throwing or rendering blank.
 */
export function toLabelLanguage(code: string | null | undefined): LabelLanguage {
  const base = (code ?? "").trim().toLowerCase().split(/[-_]/)[0];
  const known: readonly string[] = LABEL_LANGUAGES;
  return known.includes(base) ? (base as LabelLanguage) : "en";
}

export function issueTypeLabel(
  code: string | null | undefined,
  type: IssueType,
): string {
  return ISSUE_TYPE_LABELS_BY_LANGUAGE[toLabelLanguage(code)][type];
}

export function affectsLabel(
  code: string | null | undefined,
  affects: Affects,
): string {
  return AFFECTS_LABELS_BY_LANGUAGE[toLabelLanguage(code)][affects];
}

export function noticedWindowLabel(
  code: string | null | undefined,
  window: NoticedWindow,
): string {
  return NOTICED_WINDOW_LABELS_BY_LANGUAGE[toLabelLanguage(code)][window];
}
