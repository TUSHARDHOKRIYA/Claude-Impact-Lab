import { clientIp } from "@/lib/client-ip";
import { normalizePlaceQuery, searchPlaces } from "@/lib/places-search";
import { allowRequest } from "@/lib/rate-limit";

const CACHE_CONTROL = "public, max-age=300";
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

/** Place search for the report form: GET /api/places?q=<text> → { results }. */
export async function GET(request: Request) {
  const q = normalizePlaceQuery(new URL(request.url).searchParams.get("q") ?? "");
  if (q === null) return Response.json({ results: [] }, { headers: { "Cache-Control": CACHE_CONTROL } });

  const ip = (await clientIp()) ?? "unknown";
  if (!allowRequest(`places:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return Response.json({ results: [] }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const results = await searchPlaces(q);
  return Response.json({ results }, { headers: { "Cache-Control": CACHE_CONTROL } });
}
