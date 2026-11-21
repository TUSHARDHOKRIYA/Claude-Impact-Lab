import { afterEach, describe, expect, it, vi } from "vitest";

const incoming = new Map<string, string>();
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => ({ get: (name: string) => incoming.get(name) ?? null }) }));

import { siteOrigin } from "@/lib/site-url";

afterEach(() => {
  incoming.clear();
  vi.unstubAllEnvs();
});

describe("siteOrigin", () => {
  it("prefers NEXT_PUBLIC_SITE_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://rastabaaz.example");
    incoming.set("host", "other.example");
    expect((await siteOrigin())?.origin).toBe("https://rastabaaz.example");
  });

  it("uses the host header and ignores x-forwarded-host", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not a url");
    incoming.set("x-forwarded-host", "dev.d123.amplifyapp.com");
    incoming.set("host", "rastabaaz.example");
    expect((await siteOrigin())?.origin).toBe("https://rastabaaz.example");
  });

  it("uses http for localhost and refuses a host that is not a host", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    incoming.set("host", "localhost:3111");
    expect((await siteOrigin())?.origin).toBe("http://localhost:3111");
    incoming.set("host", "evil.example/path?x");
    expect(await siteOrigin()).toBeUndefined();
  });
});
