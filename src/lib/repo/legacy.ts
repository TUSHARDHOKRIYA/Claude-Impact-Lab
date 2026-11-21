import { ISSUE_TYPE_LABELS, type IssueType } from "@/lib/types";

const BY_LABEL = new Map<string, IssueType>(
  (Object.keys(ISSUE_TYPE_LABELS) as IssueType[]).map((type) => [
    ISSUE_TYPE_LABELS[type].toLowerCase(),
    type,
  ]),
);

/**
 * The issue type of a location row written before it was a field.
 *
 * A place is one problem at one spot, so a location with no issue type matches
 * no report, and the next report at that spot starts a duplicate place beside
 * it. Citizen locations were always named `"<Label> at <street>"` or
 * `"<Label> near <street>"`, so the problem is still in the row and can be
 * read back. No label contains " at " or " near ", and the label always leads,
 * so the first separator is the right one.
 *
 * Seeded locations carry hand-written names and are not recoverable this way.
 * Re-running the seed repairs those, because the seed items now carry the
 * field; that is why the seed version moved.
 */
export function recoverIssueType(name: string): IssueType | "" {
  const label = name.split(/ (?:at|near) /)[0].trim().toLowerCase();
  return BY_LABEL.get(label) ?? "";
}
