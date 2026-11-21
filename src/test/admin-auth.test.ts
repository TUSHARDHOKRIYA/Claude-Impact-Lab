import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  ADMIN_COOKIE,
  equalSecret,
  keyMatches,
  signAdminCookie,
  verifyAdminCookie,
} from "@/lib/admin-auth";

const SECRET = "test-admin-secret";
const OTHER = "other-admin-secret";
const ORIGINAL_ADMIN_KEY = process.env.ADMIN_KEY;

describe("admin-auth", () => {
  beforeEach(() => {
    process.env.ADMIN_KEY = SECRET;
  });

  afterEach(() => {
    if (ORIGINAL_ADMIN_KEY === undefined) delete process.env.ADMIN_KEY;
    else process.env.ADMIN_KEY = ORIGINAL_ADMIN_KEY;
  });

  it("uses the non-host cookie name outside production", () => {
    expect(ADMIN_COOKIE).toBe("rastabaaz_admin");
  });

  it("equalSecret compares buffers of equal length", () => {
    expect(equalSecret("abc", "abc")).toBe(true);
    expect(equalSecret("abc", "abd")).toBe(false);
    expect(equalSecret("abc", "ab")).toBe(false);
  });

  it("keyMatches uses constant-time equality against ADMIN_KEY", () => {
    expect(keyMatches(SECRET)).toBe(true);
    expect(keyMatches("xxxx-admin-secret")).toBe(false);
  });

  it("keyMatches rejects an empty candidate", () => {
    expect(keyMatches("")).toBe(false);
    expect(keyMatches(null)).toBe(false);
    expect(keyMatches(undefined)).toBe(false);
  });

  it("rejects a forged cookie value", () => {
    expect(verifyAdminCookie("1")).toBe(false);
  });

  it("verifies a cookie signed with the current secret", () => {
    const now = 1_700_000_000_000;
    const cookie = signAdminCookie(now);
    expect(cookie).toEqual(expect.stringMatching(/^\d+\.[0-9a-f]{64}$/));
    expect(verifyAdminCookie(cookie, now)).toBe(true);
  });

  it("rejects an expired signed cookie", () => {
    const now = 0;
    const cookie = signAdminCookie(now);
    const ttlMs = 12 * 60 * 60 * 1000;
    expect(verifyAdminCookie(cookie, ttlMs)).toBe(true);
    expect(verifyAdminCookie(cookie, ttlMs + 1)).toBe(false);
  });

  it("rejects a cookie signed with a different secret", () => {
    const cookie = signAdminCookie(1_000);
    process.env.ADMIN_KEY = OTHER;
    expect(verifyAdminCookie(cookie, 1_000)).toBe(false);
  });
});
