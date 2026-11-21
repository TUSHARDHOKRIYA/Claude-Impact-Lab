import { createHash } from "node:crypto";

import { isReportId } from "@/lib/id";
import { SAMPLE_PHOTO_PATTERN } from "@/lib/photo-limits";
import { getRepository } from "@/lib/repo/context";

const CACHE_CONTROL = "public, max-age=0, must-revalidate";

function strongEtag(stored: string): string {
  return `"${createHash("sha256").update(stored).digest("hex")}"`;
}

function matchesEtag(header: string | null, tag: string): boolean {
  if (!header) return false;
  return header.split(",").some((part) => part.trim() === tag);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isReportId(id)) return new Response(null, { status: 404 });
  const stored = await getRepository().getReportPhoto(id);
  if (!stored) return new Response(null, { status: 404 });

  const tag = strongEtag(stored);
  const headers = {
    "Cache-Control": CACHE_CONTROL,
    "X-Content-Type-Options": "nosniff",
    ETag: tag,
  };
  if (matchesEtag(request.headers.get("if-none-match"), tag)) {
    return new Response(null, { status: 304, headers });
  }
  if (SAMPLE_PHOTO_PATTERN.test(stored)) {
    return new Response(null, {
      status: 307,
      headers: { ...headers, Location: new URL(stored, request.url).toString() },
    });
  }
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/]+=*)$/i.exec(stored);
  if (!match) return new Response(null, { status: 404 });
  return new Response(Buffer.from(match[2], "base64"), {
    status: 200,
    headers: { ...headers, "Content-Type": match[1] },
  });
}
