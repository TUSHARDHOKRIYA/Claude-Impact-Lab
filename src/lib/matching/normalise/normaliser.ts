import type { Complaint } from "@/lib/rupee/load";
import type { LocationResolution, NormalizedComplaintRecord } from "../types";
import { inferCategoryFromText, normaliseCategory } from "./categories";
import { extractHelplineContent, normaliseChannel } from "./channels";
import { cleanText, extractTokens } from "./text";

/** Converts raw complaint dates (e.g., '2025-06-01 08:26') to standard ISO 8601 strings. */
export function normaliseTimestamp(raw: string | null | undefined): string {
  if (!raw || raw.trim() === "") {
    return new Date().toISOString();
  }
  const trimmed = raw.trim();
  // If in 'YYYY-MM-DD HH:MM' format, assume Indian Standard Time (+05:30)
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?$/.test(trimmed)) {
    const isoWithTz = trimmed.replace(" ", "T") + (trimmed.length === 16 ? ":00+05:30" : "+05:30");
    const d = new Date(isoWithTz);
    return Number.isNaN(d.getTime()) ? new Date(trimmed).toISOString() : d.toISOString();
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

const DEFAULT_UNRESOLVED: LocationResolution = {
  roadId: null,
  roadName: null,
  ward: null,
  locality: null,
  distanceToRoadM: null,
  method: "unresolved",
  confidence: 0,
  warnings: [],
};

/**
 * Normalises a raw complaint record without mutating or discarding
 * the original description or identity.
 */
export function normaliseComplaint(
  raw: Complaint,
  resolution: LocationResolution = DEFAULT_UNRESOLVED,
): NormalizedComplaintRecord {
  const channel = normaliseChannel(raw.channel);
  const canonicalCat = normaliseCategory(raw.category);

  // Extract core content if operator notes are present
  const helplineParsed = extractHelplineContent(raw.description);
  const clean = cleanText(helplineParsed.cleanedText);
  const tokens = extractTokens(clean);

  // If the category reported is vague ('road_surface_other' or 'other'), infer if possible
  const inferred =
    canonicalCat === "road_surface_other" || canonicalCat === "other"
      ? inferCategoryFromText(raw.description)
      : null;

  const gps =
    raw.lat != null && raw.lng != null
      ? {
          lat: raw.lat,
          lng: raw.lng,
          accuracyM: null,
        }
      : null;

  return {
    id: raw.id,
    receivedAt: raw.receivedAt,
    normalizedTimestamp: normaliseTimestamp(raw.receivedAt),
    channel,
    channelRaw: raw.channel,
    rawCategory: raw.category,
    canonicalCategory: canonicalCat,
    inferredCategory: inferred,
    rawDescription: raw.description, // UNTOUCHED
    cleanText: clean,
    tokens,
    language: raw.language ?? "en",
    rawLocality: raw.locality ?? "",
    gps,
    status: raw.status ?? "Open",
    upvotes: raw.upvotes ?? 0,
    resolution,
  };
}
