import { describe, expect, it } from "vitest";
import { ipFromHeaders } from "@/lib/client-ip-parse";

function getter(headers: Record<string, string | null>) {
  return (name: string) => headers[name] ?? null;
}

describe("ipFromHeaders", () => {
  it("reads the CloudFront viewer address and drops the port", () => {
    expect(ipFromHeaders(getter({ "cloudfront-viewer-address": "203.0.113.9:54321" }))).toBe(
      "203.0.113.9",
    );
  });

  it("handles an IPv6 viewer address", () => {
    expect(ipFromHeaders(getter({ "cloudfront-viewer-address": "2001:db8::1:55965" }))).toBe(
      "2001:db8::1",
    );
    expect(ipFromHeaders(getter({ "cloudfront-viewer-address": "[2001:db8::1]:55965" }))).toBe(
      "2001:db8::1",
    );
  });

  it("ignores headers the viewer can set", () => {
    // On Amplify these are not platform-assured. Trusting them let an attacker
    // pick a fresh rate-limit bucket per request.
    expect(
      ipFromHeaders(
        getter({
          "x-amzn-remote-ip": "203.0.113.9",
          "x-real-ip": "203.0.113.8",
          "x-forwarded-for": "198.51.100.1, 203.0.113.7",
        }),
      ),
    ).toBeNull();
  });

  it("does not let a spoofed forwarded chain override the viewer address", () => {
    expect(
      ipFromHeaders(
        getter({
          "cloudfront-viewer-address": "203.0.113.9:443",
          "x-forwarded-for": "198.51.100.1",
          "x-amzn-remote-ip": "198.51.100.2",
        }),
      ),
    ).toBe("203.0.113.9");
  });

  it("returns null rather than a junk identity", () => {
    expect(ipFromHeaders(getter({}))).toBeNull();
    expect(ipFromHeaders(getter({ "cloudfront-viewer-address": "not an ip:80" }))).toBeNull();
    expect(ipFromHeaders(getter({ "cloudfront-viewer-address": "1.2.3.4; drop:80" }))).toBeNull();
    expect(
      ipFromHeaders(getter({ "cloudfront-viewer-address": `${"a".repeat(46)}:80` })),
    ).toBeNull();
  });

  it("keeps an address that arrives without a port", () => {
    expect(ipFromHeaders(getter({ "cloudfront-viewer-address": "203.0.113.9" }))).toBe(
      "203.0.113.9",
    );
  });
});
