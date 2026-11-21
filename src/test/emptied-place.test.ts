import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { CITY } from "@/lib/city";
import { getMapInsights, getPlacePage, listPlaces } from "@/lib/queries";
import { setRepositoryForTests } from "@/lib/repo/context";
import { MemoryKhabarRepository } from "@/lib/repo/memory";
import type { CreateReportInput } from "@/lib/types";

function submission(overrides: Partial<CreateReportInput> = {}): CreateReportInput {
  return {
    issueType: "road",
    lat: CITY.center.lat,
    lng: CITY.center.lng,
    photo: "data:image/jpeg;base64,/9j/4AAQ",
    noticedAt: "2026-09-01",
    recurs: false,
    affects: ["walking"],
    description: null,
    ...overrides,
  };
}

/**
 * The desk changing a report's problem moves it to the place for the new one.
 * When it was the only report there, the place it left is empty.
 *
 * The row stays: it holds a geo-cell lock slot, and deleting it would strand
 * that slot and invite the duplicate the lock exists to prevent. What must not
 * happen is an empty place being published as an unresolved problem nobody
 * reported.
 */
describe("a place a move emptied", () => {
  let repo: MemoryKhabarRepository;

  beforeEach(() => {
    repo = new MemoryKhabarRepository({ strictPhoto: false });
    setRepositoryForTests(repo);
  });

  afterEach(() => {
    setRepositoryForTests(null);
  });

  it("is not listed and does not count", async () => {
    const created = await repo.createReport(submission({ issueType: "road" }));
    expect(await listPlaces()).toHaveLength(1);

    await repo.updateReport({ id: created.report.id, issueType: "waste" });

    const places = await listPlaces();
    expect(places).toHaveLength(1);
    expect(places[0].location.id).not.toBe(created.location.id);
    expect(places.map((place) => place.reportCount)).toEqual([1]);

    // The row is still there to be joined; it is only unpublished.
    expect(await repo.getLocation(created.location.id)).not.toBeNull();
  });

  it("is not a page", async () => {
    const created = await repo.createReport(submission({ issueType: "road" }));
    expect(await getPlacePage(created.location.slug)).not.toBeNull();

    await repo.updateReport({ id: created.report.id, issueType: "waste" });

    expect(await getPlacePage(created.location.slug)).toBeNull();
  });

  it("does not inflate the insight counts", async () => {
    const created = await repo.createReport(submission({ issueType: "road" }));
    await repo.updateReport({ id: created.report.id, issueType: "waste" });

    const insights = await getMapInsights();
    // One live place, not two: the emptied one is nobody's unresolved problem.
    expect(insights.places).toBe(1);
    expect(insights.reports).toBe(1);
  });

  it("comes back the moment someone reports that problem there again", async () => {
    const created = await repo.createReport(submission({ issueType: "road" }));
    await repo.updateReport({ id: created.report.id, issueType: "waste" });

    const again = await repo.createReport(submission({ issueType: "road" }));

    // Joined the emptied place rather than minting a second one beside it.
    expect(again.location.id).toBe(created.location.id);
    expect(await listPlaces()).toHaveLength(2);
  });
});
