import type { DetailsErrors } from "@/components/report/ReportDetailsFields";
import { isInsideCity } from "@/lib/city";
import { ACCIDENT_SEEN, NOTICED_WINDOWS } from "@/lib/types";

export const FORM_ALERT_ID = "report-form-alert";

export const REPORT_MSG = {
  issue: "Choose what kind of road problem this is.",
  photo: "Take or choose a photo of the problem.",
  location: "Put the pin inside a BMC ward in Mumbai.",
  noticedWindow: "Say when you first noticed it.",
  recurs: "Say whether it was repaired before and came back.",
  accident: "Say whether you have seen an accident or a fall here.",
  pin: "Confirm the pin before you continue.",
} as const;

export function focusSelector(selector: string) {
  const node = document.querySelector(selector);
  if (node instanceof HTMLElement) node.focus();
}

export function focusId(id: string) {
  document.getElementById(id)?.focus();
}

function isWindow(value: string): boolean {
  return (NOTICED_WINDOWS as readonly string[]).includes(value);
}

export function validateHistory(noticedWindow: string, recurs: "" | "true" | "false"): DetailsErrors {
  const next: DetailsErrors = {};
  if (!isWindow(noticedWindow)) next.noticedWindow = REPORT_MSG.noticedWindow;
  if (recurs !== "true" && recurs !== "false") next.recurs = REPORT_MSG.recurs;
  return next;
}

export function validateImpact(accident: string): DetailsErrors {
  const next: DetailsErrors = {};
  if (!(ACCIDENT_SEEN as readonly string[]).includes(accident)) next.accident = REPORT_MSG.accident;
  return next;
}

export function detailsHasError(errors: DetailsErrors): boolean {
  return Boolean(errors.noticedWindow || errors.recurs || errors.accident);
}

export function focusDetailsError(errors: DetailsErrors) {
  if (errors.noticedWindow) focusSelector('input[name="noticedWindow"][type="radio"]');
  else if (errors.recurs) focusSelector('input[name="recurs"][type="radio"]');
  else if (errors.accident) focusSelector('input[name="accident"][type="radio"]');
}

/**
 * The first thing still missing before Check, or null. The voice chat checks
 * everything at once. It cannot ask about accidents, so the Check step asks.
 */
export function answersProblem(answers: {
  issueType: string;
  noticedWindow: string;
  recurs: "" | "true" | "false";
  pin: { lat: number; lng: number } | null;
  locationConfirmed: boolean;
}): string | null {
  if (!answers.issueType) return REPORT_MSG.issue;
  const history = validateHistory(answers.noticedWindow, answers.recurs);
  if (detailsHasError(history)) return history.noticedWindow ?? history.recurs ?? null;
  if (!answers.pin || !isInsideCity(answers.pin.lat, answers.pin.lng)) return REPORT_MSG.location;
  return answers.locationConfirmed ? null : REPORT_MSG.pin;
}
