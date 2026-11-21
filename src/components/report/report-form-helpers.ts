export type DetailsErrors = {
  noticedWindow?: string;
  recurs?: string;
  accident?: string;
};

export const FORM_ALERT_ID = "report-form-alert";

export const REPORT_MSG = {
  issue: "Choose what kind of road problem this is.",
  photo: "Take or choose a photo of the problem.",
  location: "Search for the area or use your location, then move the map so the pin sits on the spot.",
  noticedWindow: "Say when you first noticed it.",
  recurs: "Say whether it was repaired before and came back.",
  accident: "Say whether you have seen an accident or a fall here.",
} as const;

export function focusSelector(selector: string) {
  const node = document.querySelector(selector);
  if (node instanceof HTMLElement) node.focus();
}

export function focusId(id: string) {
  document.getElementById(id)?.focus();
}

export function focusDetailsError(errors: DetailsErrors) {
  if (errors.noticedWindow) focusSelector('input[name="noticedWindow"][type="radio"]');
  else if (errors.recurs) focusSelector('input[name="recurs"][type="radio"]');
  else if (errors.accident) focusSelector('input[name="accident"][type="radio"]');
}
