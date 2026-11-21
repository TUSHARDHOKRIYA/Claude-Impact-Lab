import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

/**
 * The action suite mocks `headers()` to throw, which meant no test ever reached
 * the limiter. This file serves real headers so the identity and the fail-closed
 * behaviour are both exercised.
 */
let requestHeaders = new Headers();

vi.mock("next/headers", () => ({
  headers: async () => requestHeaders,
  cookies: async () => ({ get: () => undefined }),
}));

import { createReportAction } from "@/lib/actions";
import { setRepositoryForTests } from "@/lib/repo/context";
import { MemoryKhabarRepository } from "@/lib/repo/memory";
import { resetRateLimits } from "@/lib/rate-limit";
import { CITY } from "@/lib/city";

import { sampleJpegDataUrl } from "./sample-jpeg";

const TOO_MANY = "Too many reports. Try again later.";

function form(): FormData {
  const data = new FormData();
  const fields: Record<string, string> = {
    issueType: "road",
    lat: String(CITY.center.lat),
    lng: String(CITY.center.lng),
    locationConfirmed: "true",
    photo: sampleJpegDataUrl(),
    noticedWindow: "today",
    recurs: "false",
    affects: JSON.stringify(["walking"]),
  };
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function submit(): Promise<string | null> {
  const result = await createReportAction(form());
  return result.ok ? null : result.error;
}

describe("the citizen write limiter binds to an identity", () => {
  beforeEach(() => {
    resetRateLimits();
    setRepositoryForTests(new MemoryKhabarRepository({ strictPhoto: false }));
    requestHeaders = new Headers();
  });

  afterEach(() => {
    setRepositoryForTests(null);
    resetRateLimits();
  });

  it("runs the limiter when no header identifies the caller", async () => {
    // Previously `if (ip && ...)` skipped the check entirely here.
    for (let i = 0; i < 60; i += 1) expect(await submit()).toBeNull();
    expect(await submit()).toBe(TOO_MANY);
  });

  it("does not let a spoofed header buy a fresh bucket", async () => {
    for (let i = 0; i < 60; i += 1) {
      requestHeaders = new Headers({ "x-amzn-remote-ip": `203.0.113.${i}` });
      expect(await submit()).toBeNull();
    }
    requestHeaders = new Headers({
      "x-amzn-remote-ip": "203.0.113.200",
      "x-forwarded-for": "198.51.100.7",
    });
    expect(await submit()).toBe(TOO_MANY);
  });

  it("gives two real viewers separate buckets", async () => {
    requestHeaders = new Headers({ "cloudfront-viewer-address": "203.0.113.9:1111" });
    for (let i = 0; i < 60; i += 1) expect(await submit()).toBeNull();
    // Same viewer, new connection port: still the same bucket.
    requestHeaders = new Headers({ "cloudfront-viewer-address": "203.0.113.9:2222" });
    expect(await submit()).toBe(TOO_MANY);

    requestHeaders = new Headers({ "cloudfront-viewer-address": "198.51.100.4:3333" });
    expect(await submit()).toBeNull();
  });
});
