import { ISSUE_TYPE_LABELS, type LocationRecord } from "@/lib/types";

/**
 * The road is the useful name; the issue type already has its own tag.
 * Without a named road, "Waterlogging near Parel" becomes "Parel".
 */
export function placeTitle(place: { location: LocationRecord }): string {
  const { street, name, issueType } = place.location;
  if (street && street !== "Mumbai") return street;
  const issue = ISSUE_TYPE_LABELS[issueType];
  for (const joiner of [" near ", " on "]) {
    const prefix = issue + joiner;
    if (name.startsWith(prefix)) return name.slice(prefix.length);
  }
  // No road and no locality nearby: "Mumbai" says nothing, the issue does.
  return name.startsWith(issue) ? issue : name;
}

/** "Powai" out of "Road cave-in on Village Road Bhandup, Powai", if there is one. */
export function placeArea(location: LocationRecord): string | null {
  const comma = location.name.lastIndexOf(", ");
  if (comma > 0) return location.name.slice(comma + 2);
  const near = location.name.indexOf(" near ");
  return near > 0 ? location.name.slice(near + 6) : null;
}
