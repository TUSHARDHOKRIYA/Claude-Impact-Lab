import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let requestHeaders = new Headers();
let cookieValue: string | undefined;

vi.mock("next/headers", () => ({
  headers: async () => requestHeaders,
  cookies: async () => ({
    get: (name: string) =>
      name === "khabar_admin" && cookieValue !== undefined
        ? { name, value: cookieValue }
        : undefined,
  }),
}));

import { ADMIN_COOKIE, isAdminAuthed, signAdminCookie } from "@/lib/admin-auth";

const SECRET = "test-admin-secret";
const ORIGINAL = process.env.ADMIN_KEY;

/**
 * `isAdminAuthed` used to accept the raw ADMIN_KEY as `x-admin-key` or a Bearer
 * token on every admin request. That path was not rate limited, so it turned
 * the human-typed desk password into an unthrottled guessing oracle and side
 * stepped SameSite=strict. Only the signed cookie authenticates now.
 */
describe("the desk accepts only its signed cookie", () => {
  beforeEach(() => {
    process.env.ADMIN_KEY = SECRET;
    requestHeaders = new Headers();
    cookieValue = undefined;
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.ADMIN_KEY;
    else process.env.ADMIN_KEY = ORIGINAL;
  });

  it("accepts a valid signed cookie", async () => {
    cookieValue = signAdminCookie() ?? undefined;
    expect(ADMIN_COOKIE).toBe("khabar_admin");
    expect(await isAdminAuthed()).toBe(true);
  });

  it("rejects the correct password sent as x-admin-key", async () => {
    requestHeaders = new Headers({ "x-admin-key": SECRET });
    expect(await isAdminAuthed()).toBe(false);
  });

  it("rejects the correct password sent as a Bearer token", async () => {
    requestHeaders = new Headers({ authorization: `Bearer ${SECRET}` });
    expect(await isAdminAuthed()).toBe(false);
  });

  it("rejects a forged cookie", async () => {
    cookieValue = "1";
    expect(await isAdminAuthed()).toBe(false);
    cookieValue = `${Date.now() + 1000}.${"0".repeat(64)}`;
    expect(await isAdminAuthed()).toBe(false);
  });

  it("rejects an expired cookie", async () => {
    cookieValue = signAdminCookie(Date.now() - 13 * 60 * 60 * 1000) ?? undefined;
    expect(await isAdminAuthed()).toBe(false);
  });
});
