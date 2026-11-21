import { beforeEach, describe, expect, it } from "vitest";

import { CITY } from "@/lib/city";
import { MemoryRastabaazRepository } from "@/lib/repo/memory";
import type { CreateReportInput } from "@/lib/types";

import { sampleJpegDataUrl } from "./sample-jpeg";

function submission(overrides: Partial<CreateReportInput> = {}): CreateReportInput {
  return {
    issueType: "road",
    lat: CITY.center.lat,
    lng: CITY.center.lng,
    photo: sampleJpegDataUrl(),
    noticedAt: "2026-09-01",
    recurs: false,
    affects: ["walking"],
    description: null,
    ...overrides,
  };
}

/**
 * A place is one problem at one spot. The desk can change a report's problem,
 * and if the report stayed put it would sit under a place named for the old
 * one, which no later report of the corrected type could ever join.
 */
describe("changing a report's problem at the desk", () => {
  let repo: MemoryRastabaazRepository;

  beforeEach(() => {
    repo = new MemoryRastabaazRepository({ strictPhoto: false });
  });

  it("moves the report to a place for the new problem", async () => {
    const created = await repo.createReport(submission({ issueType: "road" }));

    const updated = await repo.updateReport({ id: created.report.id, issueType: "waste" });

    expect(updated?.issueType).toBe("waste");
    expect(updated?.locationId).not.toBe(created.location.id);

    const moved = await repo.getLocation(updated!.locationId);
    expect(moved?.issueType).toBe("waste");
    expect(moved?.name.toLowerCase()).not.toContain("road");
  });

  it("joins an existing place of the corrected problem rather than making a second", async () => {
    const waste = await repo.createReport(submission({ issueType: "waste" }));
    const road = await repo.createReport(submission({ issueType: "road" }));
    expect(road.location.id).not.toBe(waste.location.id);

    const updated = await repo.updateReport({ id: road.report.id, issueType: "waste" });

    expect(updated?.locationId).toBe(waste.location.id);
  });

  it("leaves the report where it is when the problem does not change", async () => {
    const created = await repo.createReport(submission({ issueType: "road" }));

    const updated = await repo.updateReport({
      id: created.report.id,
      issueType: "road",
      description: "edited",
    });

    expect(updated?.locationId).toBe(created.location.id);
    expect(updated?.description).toBe("edited");
  });

  it("lets a later report of the corrected problem join the moved report", async () => {
    const created = await repo.createReport(submission({ issueType: "road" }));
    await repo.updateReport({ id: created.report.id, issueType: "waste" });

    // This is what used to break: the corrected report was stranded, so the
    // next waste report at the same pin started a third place.
    const next = await repo.createReport(submission({ issueType: "waste" }));

    expect(next.connectedCount).toBe(1);
  });
});
