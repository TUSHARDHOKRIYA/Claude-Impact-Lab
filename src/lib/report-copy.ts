import { nearestLandmarkName, hasNamedStreet } from "@/lib/place-name";
import { noticedLead } from "@/lib/noticed-label";
import type { LocationRecord, NoticedWindow } from "@/lib/types";

type Noticed = { noticedAt: string; noticedWindow: NoticedWindow | null; createdAt: string };

/**
 * The line under the headline. It names the landmark and the street, not the
 * place title, so "Footpath on Kaikhushru Dubash Marg" is not said twice.
 */
export function reportAside(report: Noticed, location: LocationRecord): string {
  const landmark = nearestLandmarkName(location.lat, location.lng);
  const street = hasNamedStreet(location.street) ? location.street : null;
  const where = [landmark ? `near ${landmark}` : null, street, location.ward].filter(Boolean);
  return `${noticedLead(report)} ${where.join(", ")}.`;
}
