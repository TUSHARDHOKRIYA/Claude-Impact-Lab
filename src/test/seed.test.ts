import { describe, expect, it } from "vitest";
import { MemoryKhabarRepository } from "@/lib/repo/memory";
import { SEED_VERSION } from "@/lib/repo/keys";
import { RETIRED_HEATMAP_REPORTS } from "@/lib/seed-heatmap";
import { PAVING_SLUG, seedPaving } from "@/lib/seed-paving";
import { PREVIOUS_SEED_DESCRIPTIONS } from "@/lib/seed/previous-copy";
import { buildSeedItems, runSeed } from "@/lib/seed/run";

const REQUIRED_LOCATION_IDS = [
  "loc_k_dubash_footpath",
  "loc_mg_road_surface",
  "loc_rampart_row_waste",
  "loc_jehangir_lighting",
  "loc_black_horse_parking",
  "loc_max_mueller_drain",
  "loc_csmvs_street",
] as const;

const REQUIRED_REPORT_IDS = [
  "rpt_paving_202208",
  "rpt_paving_202301",
  "rpt_paving_202407",
  "rpt_paving_202509",
  "rpt_mg_road_202406",
  "rpt_mg_road_202603",
  "rpt_rampart_waste_202511",
  "rpt_jehangir_light_202412",
  "rpt_jehangir_light_202607",
  "rpt_horse_park_202505",
  "rpt_horse_park_202608",
  "rpt_horse_park_202609",
  "rpt_drain_202609",
  "rpt_csmvs_bench_202510",
] as const;

function idsOf(items: ReturnType<typeof buildSeedItems>): string[] {
  return items.map((item) => item.record.id);
}

function entitiesOf(items: ReturnType<typeof buildSeedItems>): string[] {
  return items.map((item) => item.entity);
}

describe("runSeed", () => {
  it("inserts paving, heatmap, and tender records once", async () => {
    const repo = new MemoryKhabarRepository({ strictPhoto: false });
    expect(await runSeed(repo)).toBe("seeded");
    expect(await runSeed(repo)).toBe("already");
    const catalog = await repo.loadCatalog();
    expect(catalog.locations.some((row) => row.id === "loc_k_dubash_footpath")).toBe(true);
    expect(catalog.reports.some((row) => row.id === "rpt_paving_202509")).toBe(true);
    expect(catalog).not.toHaveProperty("interventions");
    expect(entitiesOf(buildSeedItems()).includes("note")).toBe(false);
    expect(entitiesOf(buildSeedItems()).includes("intervention")).toBe(false);
    const paving = catalog.reports.find((row) => row.id === "rpt_paving_202208");
    expect(paving).toBeTruthy();
    expect(paving && "photo" in paving).toBe(false);
    const sample = await repo.getReport("rpt_paving_202208");
    expect(await repo.getReportPhoto("rpt_paving_202208")).toBe("/samples/paving.svg");
    expect(sample?.isSample).toBe(true);
    expect(catalog.locations.find((row) => row.id === "loc_k_dubash_footpath")?.slug).toBe(PAVING_SLUG);
    expect(SEED_VERSION).toBe("2026-09-27-v5");
    expect(await repo.getSeedMarker()).toBe(SEED_VERSION);
    for (const id of REQUIRED_LOCATION_IDS) {
      expect(catalog.locations.some((row) => row.id === id), id).toBe(true);
    }
    for (const id of REQUIRED_REPORT_IDS) {
      expect(catalog.reports.some((row) => row.id === id), id).toBe(true);
    }
    expect(catalog.notes).toHaveLength(0);
  });

  it("deletes a report an earlier seed wrote and this one retired, while it is still the seed's", async () => {
    const [retired] = RETIRED_HEATMAP_REPORTS;
    const repo = new MemoryKhabarRepository({ strictPhoto: false });
    // The -v2 seed's museum obstruction report, stored as that seed wrote it.
    await repo.putSeedItems([{ entity: "report", record: retired }]);
    expect(await repo.getReport(retired.id)).not.toBeNull();
    await runSeed(repo);
    expect(await repo.getReport(retired.id)).toBeNull();
    expect((await repo.listReportsForLocation("loc_csmvs_street")).map((row) => row.id)).toEqual(["rpt_csmvs_bench_202510"]);
  });

  it("keeps a retired seed report the desk has edited or annotated", async () => {
    const [retired] = RETIRED_HEATMAP_REPORTS;
    const edited = new MemoryKhabarRepository({ strictPhoto: false });
    await edited.putSeedItems([{ entity: "report", record: { ...retired, description: "Corrected by the desk." } }]);
    await runSeed(edited);
    expect(await edited.getReport(retired.id)).not.toBeNull();

    const annotated = new MemoryKhabarRepository({ strictPhoto: false });
    await annotated.putSeedItems([{ entity: "report", record: retired }]);
    await annotated.addDeskNote(retired.id, "Inspected on site.");
    await runSeed(annotated);
    expect(await annotated.getReport(retired.id)).not.toBeNull();
  });

  it("returns already without writing when the marker exists", async () => {
    const repo = new MemoryKhabarRepository({ strictPhoto: false });
    expect(await repo.putSeedMarker(SEED_VERSION)).toBe(true);
    expect(await runSeed(repo)).toBe("already");
    const catalog = await repo.loadCatalog();
    expect(catalog.locations).toHaveLength(0);
    expect(catalog.reports).toHaveLength(0);
  });
});

function pavingReport(id: string) {
  const item = seedPaving().find((row) => row.entity === "report" && row.record.id === id);
  if (!item || item.entity !== "report") throw new Error(id);
  return item;
}

describe("re-seeding a report the previous version already stored", () => {
  it("replaces the previous description and leaves a desk edit", async () => {
    const current = pavingReport("rpt_paving_202509");
    const previous = {
      ...current,
      record: { ...current.record, description: PREVIOUS_SEED_DESCRIPTIONS.rpt_paving_202509 },
    };
    const repo = new MemoryKhabarRepository({ strictPhoto: false });
    await repo.putSeedItems([previous]);
    await repo.putSeedItems([current]);
    expect((await repo.getReport(current.record.id))?.description).toBe(current.record.description);

    const edited = new MemoryKhabarRepository({ strictPhoto: false });
    await edited.putSeedItems([{ ...current, record: { ...current.record, description: "Corrected by the desk." } }]);
    await edited.putSeedItems([current]);
    expect((await edited.getReport(current.record.id))?.description).toBe("Corrected by the desk.");
  });

  it("clears the illustration flag when a desk photo is already stored", async () => {
    const current = pavingReport("rpt_paving_202208");
    const repo = new MemoryKhabarRepository({ strictPhoto: false });
    await repo.putSeedItems([{ ...current, record: { ...current.record, photo: "data:image/jpeg;base64,desk" } }]);
    expect((await repo.getReport(current.record.id))?.isSample).toBe(true);
    await repo.putSeedItems([current]);
    expect((await repo.getReport(current.record.id))?.isSample).toBe(false);
    expect(await repo.getReportPhoto(current.record.id)).toBe("data:image/jpeg;base64,desk");
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
