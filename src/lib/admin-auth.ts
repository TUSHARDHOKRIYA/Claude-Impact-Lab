import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_TTL_MS = 12 * 60 * 60 * 1000;
const HMAC_HEX_LENGTH = 64;

export const ADMIN_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-rastabaaz_admin" : "rastabaaz_admin";

export function adminCookieOptions() {
  const production = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    path: "/",
    secure: production,
    maxAge: COOKIE_TTL_MS / 1000,
  };
}

export function adminSecret(): string {
  const fromEnv = process.env.ADMIN_KEY;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  if (process.env.NODE_ENV === "development") return "dev-admin-key";
  return "";
}

export function equalSecret(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    if (a.length > 0) timingSafeEqual(a, Buffer.alloc(a.length));
    return false;
  }
  return timingSafeEqual(a, b);
}

export function keyMatches(candidate: string | null | undefined): boolean {
  const secret = adminSecret();
  if (!secret || candidate == null) return false;
  return equalSecret(candidate, secret);
}

function hmacHex(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function signAdminCookie(now = Date.now()): string | null {
  const secret = adminSecret();
  if (!secret) return null;
  const exp = String(now + COOKIE_TTL_MS);
  return `${exp}.${hmacHex(exp, secret)}`;
}

export function verifyAdminCookie(value: string | null | undefined, now = Date.now()): boolean {
  const secret = adminSecret();
  if (!secret || !value) return false;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return false;
  const exp = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  if (!/^\d+$/.test(exp) || mac.length !== HMAC_HEX_LENGTH) return false;
  if (!equalSecret(mac, hmacHex(exp, secret))) return false;
  return Number(exp) >= now;
}

/**
 * The signed cookie is the only way in. An `x-admin-key` / `Bearer` header used
 * to be accepted here too, which made the desk password a guessing oracle on
 * every request: unthrottled, and outside the SameSite=strict protection the
 * cookie gets. `keyMatches` is now reachable only from `login`, which is rate
 * limited.
 */
export async function isAdminAuthed(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminCookie(jar.get(ADMIN_COOKIE)?.value);
}
