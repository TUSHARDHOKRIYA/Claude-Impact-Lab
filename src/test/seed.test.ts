import { describe, expect, it } from "vitest";
import { MemoryRastabaazRepository } from "@/lib/repo/memory";
import { SEED_VERSION } from "@/lib/repo/keys";
import { buildSeedItems, runSeed } from "@/lib/seed/run";

function idsOf(items: ReturnType<typeof buildSeedItems>): string[] {
  return items.map((item) => item.record.id);
}

function entitiesOf(items: ReturnType<typeof buildSeedItems>): string[] {
  return items.map((item) => item.entity);
}

describe("runSeed", () => {
  it("inserts seed road records once", async () => {
    const repo = new MemoryRastabaazRepository({ strictPhoto: false });
    expect(await runSeed(repo)).toBe("seeded");
    expect(await runSeed(repo)).toBe("already");
    const catalog = await repo.loadCatalog();
    expect(catalog.locations.length).toBeGreaterThan(0);
    expect(catalog.reports.length).toBeGreaterThan(0);
    expect(catalog).not.toHaveProperty("interventions");
    expect(entitiesOf(buildSeedItems()).includes("note")).toBe(false);
    expect(entitiesOf(buildSeedItems()).includes("intervention")).toBe(false);

    const firstReport = catalog.reports[0];
    expect(firstReport).toBeTruthy();
    expect("photo" in firstReport).toBe(false);
    const sample = await repo.getReport(firstReport.id);
    expect(sample?.isSample).toBe(true);
    expect(SEED_VERSION).toBe("rasta-v1");
    expect(await repo.getSeedMarker()).toBe(SEED_VERSION);
    expect(catalog.notes).toHaveLength(0);
  });

  it("returns already without writing when the marker exists", async () => {
    const repo = new MemoryRastabaazRepository({ strictPhoto: false });
    expect(await repo.putSeedMarker(SEED_VERSION)).toBe(true);
    expect(await runSeed(repo)).toBe("already");
    const catalog = await repo.loadCatalog();
    expect(catalog.locations).toHaveLength(0);
    expect(catalog.reports).toHaveLength(0);
  });
});

describe("buildSeedItems", () => {
  it("emits identical ids and content on every call", () => {
    const first = buildSeedItems();
    const second = buildSeedItems();
    expect(first).toEqual(second);
    expect(idsOf(first)).toEqual(idsOf(second));
    expect(entitiesOf(first).includes("note")).toBe(false);
    expect(new Set(idsOf(first)).size).toBe(first.length);
  });
});
