import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getReportPhoto = vi.fn();

vi.mock("@/lib/repo/context", () => ({
  getRepository: () => ({ getReportPhoto }),
}));

import { GET } from "@/app/reports/[id]/photo/route";
import { sampleJpegDataUrl } from "./sample-jpeg";

const CACHE = "public, max-age=0, must-revalidate";

function request(id: string, headers?: HeadersInit) {
  return new Request(`http://localhost/reports/${id}/photo`, { headers });
}

describe("report photo route", () => {
  beforeEach(() => {
    getReportPhoto.mockReset();
  });

  it("rejects an id that is not a report id", async () => {
    const response = await GET(request("nope"), { params: Promise.resolve({ id: "nope" }) });
    expect(response.status).toBe(404);
    expect(getReportPhoto).not.toHaveBeenCalled();
  });

  it("returns 404 when the report has no photo", async () => {
    getReportPhoto.mockResolvedValue(null);
    const response = await GET(request("rpt_missing"), { params: Promise.resolve({ id: "rpt_missing" }) });
    expect(response.status).toBe(404);
  });

  it("decodes a data URL and honours a strong etag", async () => {
    const stored = sampleJpegDataUrl();
    getReportPhoto.mockResolvedValue(stored);
    const tag = `"${createHash("sha256").update(stored).digest("hex")}"`;
    const response = await GET(request("rpt_1"), { params: Promise.resolve({ id: "rpt_1" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("etag")).toBe(tag);
    expect(response.headers.get("cache-control")).toBe(CACHE);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1]).toBe(0xd8);

    const cached = await GET(request("rpt_1", { "if-none-match": tag }), {
      params: Promise.resolve({ id: "rpt_1" }),
    });
    expect(cached.status).toBe(304);
  });

  it("redirects a stored sample path", async () => {
    getReportPhoto.mockResolvedValue("/samples/paving.svg");
    const response = await GET(request("rpt_seed"), { params: Promise.resolve({ id: "rpt_seed" }) });
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/samples/paving.svg");
  });
});
