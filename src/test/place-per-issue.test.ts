import { describe, expect, it } from "vitest";

import { CITY } from "@/lib/city";
import { MemoryRastabaazRepository } from "@/lib/repo/memory";
import type { CreateReportInput } from "@/lib/types";

import { sampleJpegDataUrl } from "./sample-jpeg";

function submission(overrides: Partial<CreateReportInput> = {}): CreateReportInput {
  return {
    issueType: "pothole",
    lat: CITY.center.lat,
    lng: CITY.center.lng,
    photo: sampleJpegDataUrl(),
    noticedAt: "2026-09-01",
    recurs: false,
        description: null,
    ...overrides,
  };
}

describe("a place is one problem at one spot", () => {
  it("keeps two issue types at the same pin as two places", async () => {
    const repo = new MemoryRastabaazRepository({ strictPhoto: false });
    const road = await repo.createReport(submission({ issueType: "pothole" }));
    const waste = await repo.createReport(submission({ issueType: "waterlogging" }));

    expect(waste.location.id).not.toBe(road.location.id);
    expect(road.location.issueType).toBe("pothole");
    expect(waste.location.issueType).toBe("waterlogging");
    expect(waste.location.slug).not.toBe(road.location.slug);
    expect(waste.connectedCount).toBe(0);
  });

  it("still connects the same issue type at the same pin", async () => {
    const repo = new MemoryRastabaazRepository({ strictPhoto: false });
    const first = await repo.createReport(submission({ issueType: "pothole" }));
    const second = await repo.createReport(submission({ issueType: "pothole" }));

    expect(second.location.id).toBe(first.location.id);
    expect(second.connectedCount).toBe(1);
  });

  it("never files a report under a place named for another problem", async () => {
    const repo = new MemoryRastabaazRepository({ strictPhoto: false });
    const road = await repo.createReport(submission({ issueType: "pothole" }));
    const waste = await repo.createReport(submission({ issueType: "waterlogging" }));

    expect(waste.location.issueType).toBe("waterlogging");
    expect(waste.location.name.startsWith("Waterlogging")).toBe(true);
    expect(waste.location.id).not.toBe(road.location.id);
    expect(waste.location.slug.endsWith("waterlogging")).toBe(true);
  });

  it("matches a nearby place only when the problem matches", async () => {
    const repo = new MemoryRastabaazRepository({ strictPhoto: false });
    const { location } = await repo.createReport(submission({ issueType: "pothole" }));
    const { lat, lng } = CITY.center;

    expect(await repo.findNearbyLocation(lat, lng, "pothole")).toMatchObject({ id: location.id });
    expect(await repo.findNearbyLocation(lat, lng, "waterlogging")).toBeNull();
  });

  it("gives every seeded place an issue type, so citizen reports can join one", async () => {
    const { buildSeedItems } = await import("@/lib/seed/items");
    const locations = buildSeedItems().flatMap((item) =>
      item.entity === "location" ? [item.record] : [],
    );

    expect(locations.length).toBeGreaterThan(0);
    for (const location of locations) {
      expect(location.issueType, `${location.slug} has no issue type`).toBeTruthy();
    }
  });
});
