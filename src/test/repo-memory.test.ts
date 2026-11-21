import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MemoryRastabaazRepository } from "@/lib/repo/memory";
import { getReportPage } from "@/lib/queries/reports";
import type { CreateReportInput } from "@/lib/types";
import { sampleJpegDataUrl } from "./sample-jpeg";

const PHOTO = "data:image/jpeg;base64,/9j/4AAQ";

function input(partial: Partial<CreateReportInput> = {}): CreateReportInput {
  return {
    issueType: "waterlogging",
    lat: 18.9298,
    lng: 72.8328,
    photo: PHOTO,
    noticedAt: "2026-09-01",
    recurs: false,
        description: "Loose stones",
    ...partial,
  };
}

describe("MemoryRastabaazRepository", () => {
  it("creates a location and a report together", async () => {
    const repo = new MemoryRastabaazRepository({ strictPhoto: false });
    const created = await repo.createReport(input());
    expect(created.report.locationId).toBe(created.location.id);
    expect(created.connectedCount).toBe(0);
    expect((await repo.getReportPhoto(created.report.id))?.startsWith("data:image/jpeg")).toBe(true);
    expect(created.report).not.toHaveProperty("photo");
  });

  it("reuses a location within 40 metres", async () => {
    const repo = new MemoryRastabaazRepository({ strictPhoto: false });
    const first = await repo.createReport(input());
    const second = await repo.createReport(input({ lat: 18.92981, lng: 72.83281 }));
    expect(second.location.id).toBe(first.location.id);
    expect(second.connectedCount).toBe(1);
  });

  it("omits photo from catalog reports", async () => {
    const repo = new MemoryRastabaazRepository({ strictPhoto: false });
    await repo.createReport(input());
    const catalog = await repo.loadCatalog();
    expect(catalog.reports).toHaveLength(1);
    expect("photo" in catalog.reports[0]).toBe(false);
  });

  it("stores the voice transcript but strips it from catalog reports", async () => {
    const repo = new MemoryRastabaazRepository({ strictPhoto: false });
    const created = await repo.createReport(
      input({ voiceTranscript: "mixed transcript" }),
    );
    expect((await repo.getReport(created.report.id))?.voiceTranscript).toBe(
      "mixed transcript",
    );
    await expect(repo.loadCatalog()).resolves.not.toHaveProperty(
      "reports.0.voiceTranscript",
    );
    const page = await getReportPage(created.report.id, repo);
    expect(page?.report).not.toHaveProperty("voiceTranscript");
  });

  it("seeds once for version 2026-09-08-v1", async () => {
    const repo = new MemoryRastabaazRepository({ strictPhoto: false });
    expect(await repo.putSeedMarker("2026-09-08-v1")).toBe(true);
    expect(await repo.putSeedMarker("2026-09-08-v1")).toBe(false);
    expect(await repo.getSeedMarker()).toBe("2026-09-08-v1");
    expect("rep-test-paving".length).toBeGreaterThan(0);
  });

  it("replaces the seed marker when the version changes", async () => {
    const repo = new MemoryRastabaazRepository({ strictPhoto: false });
    expect(await repo.putSeedMarker("v1")).toBe(true);
    expect(await repo.putSeedMarker("v2")).toBe(true);
    expect(await repo.getSeedMarker()).toBe("v2");
  });

  it("rejects a fake jpeg data url when strictPhoto defaults on", async () => {
    const repo = new MemoryRastabaazRepository();
    await expect(repo.createReport(input())).rejects.toThrow(/JPEG, PNG, or WebP/);
  });

  it("does not persist an oversize description under strictPhoto", async () => {
    const repo = new MemoryRastabaazRepository({ strictPhoto: true });
    await expect(
      repo.createReport(input({ photo: sampleJpegDataUrl(), description: "x".repeat(410000) })),
    ).rejects.toThrow(/too large/);
    const catalog = await repo.loadCatalog();
    expect(catalog.locations).toHaveLength(0);
    expect(catalog.reports).toHaveLength(0);
  });
});
