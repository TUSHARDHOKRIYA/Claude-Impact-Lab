import "server-only";

import { headers } from "next/headers";

const HOST = /^[a-z0-9.-]+(:\d{1,5})?$/i;

function fromEnv(raw: string | undefined): URL | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The origin Open Graph and Twitter image URLs are resolved against. Link
 * previews need absolute URLs, and without this Next falls back to
 * `http://localhost:3000`. `NEXT_PUBLIC_SITE_URL` wins; otherwise the request
 * `host` is used. `x-forwarded-host` is ignored: a client can set it.
 */
export async function siteOrigin(): Promise<URL | undefined> {
  const configured = fromEnv(process.env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;
  try {
    const incoming = await headers();
    const host = (incoming.get("host") ?? "").split(",")[0].trim();
    if (!HOST.test(host)) return undefined;
    const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
    const forwarded = incoming.get("x-forwarded-proto")?.split(",")[0].trim();
    const proto = forwarded === "http" || forwarded === "https" ? forwarded : local ? "http" : "https";
    return new URL(`${proto}://${host}`);
  } catch {
    return undefined;
  }
}
