import { ISSUE_TYPES, type IssueType } from "@/lib/types";

export const HOME_ISSUE_TYPES = [
  "pothole",
  "waterlogging",
  "open_manhole",
  "road_cave_in",
] as const satisfies readonly IssueType[];

export function parseIssueType(
  value: string | string[] | undefined,
): IssueType | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  return ISSUE_TYPES.includes(raw as IssueType) ? (raw as IssueType) : undefined;
}
