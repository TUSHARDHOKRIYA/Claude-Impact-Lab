import { describe, expect, it } from "vitest";

import { CITY, LANDMARKS, isInsideCity } from "@/lib/city";
import {
  ALL_LANDMARKS,
  DISPUTED_LANDMARKS,
  PINNABLE_LANDMARKS,
  aliasIndex,
  boundsFlagIsHonest,
  landmarkById,
} from "@/lib/landmarks";

const CONFIDENCE = new Set(["high", "medium", "low"]);
const AGREEMENT = new Set(["agree", "near", "conflict", "unresolved"]);

/** Rows verified as outside the app's bounding box. Anything else must be inside. */
const OUT_OF_BOX = ["asiatic-library", "regal-cinema", "sir-jj-school", "wellington-fountain"];

describe("merged landmark table", () => {
  it("has no duplicate ids", () => {
    const ids = ALL_LANDMARKS.map((row) => row.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every row at least one alias", () => {
    const bare = ALL_LANDMARKS.filter(
      (row) => row.aliases.length === 0 || row.aliases.some((alias) => alias.trim() === ""),
    );
    expect(bare.map((row) => row.id)).toEqual([]);
  });

  it("gives every row a plausible coordinate", () => {
    for (const row of ALL_LANDMARKS) {
      expect(Number.isFinite(row.lat), `${row.id} lat`).toBe(true);
      expect(Number.isFinite(row.lng), `${row.id} lng`).toBe(true);
      // Kala Ghoda and its immediate surroundings. A pin outside this is a typo,
      // a swapped lat/lng, or a different city.
      expect(row.lat, `${row.id} lat`).toBeGreaterThan(18.9);
      expect(row.lat, `${row.id} lat`).toBeLessThan(18.96);
      expect(row.lng, `${row.id} lng`).toBeGreaterThan(72.8);
      expect(row.lng, `${row.id} lng`).toBeLessThan(72.86);
    }
  });

  it("puts every row inside the bounding box unless it is marked inBounds: false", () => {
    const outside = ALL_LANDMARKS.filter((row) => !isInsideCity(row.lat, row.lng));
    expect(outside.map((row) => row.id).sort()).toEqual([...OUT_OF_BOX].sort());
    for (const row of ALL_LANDMARKS) {
      expect(boundsFlagIsHonest(row), `${row.id} inBounds flag disagrees with the box`).toBe(true);
    }
  });

  it("keeps out-of-box rows out of the pinnable set", () => {
    for (const id of OUT_OF_BOX) {
      expect(landmarkById(id)?.inBounds, `${id} should be flagged out of bounds`).toBe(false);
    }
    expect(PINNABLE_LANDMARKS.some((row) => OUT_OF_BOX.includes(row.id))).toBe(false);
    expect(PINNABLE_LANDMARKS.length).toBe(ALL_LANDMARKS.length - OUT_OF_BOX.length);
  });

  it("uses only known confidence and agreement values", () => {
    for (const row of ALL_LANDMARKS) {
      expect(CONFIDENCE.has(row.confidence), `${row.id} confidence`).toBe(true);
      expect(AGREEMENT.has(row.agreement), `${row.id} agreement`).toBe(true);
      expect(Number.isFinite(row.deltaMeters), `${row.id} deltaMeters`).toBe(true);
    }
  });

  it("marks every row where the two sources disagree by more than 50 m as low confidence", () => {
    for (const row of ALL_LANDMARKS) {
      if (row.deltaMeters > 50) {
        expect(row.confidence, `${row.id} should be low confidence`).toBe("low");
      }
    }
  });

  it("never picks a winner silently — disputed rows carry both candidates", () => {
    expect(DISPUTED_LANDMARKS.length).toBeGreaterThan(0);
    for (const row of ALL_LANDMARKS) {
      if (row.agreement === "agree") continue;
      const sources = (row.candidates ?? []).map((candidate) => candidate.source);
      expect(sources, `${row.id} must keep both source coordinates`).toContain("A");
      expect(sources, `${row.id} must keep both source coordinates`).toContain("B");
    }
  });

  it("leaves black-horse unresolved with all three candidates on the row", () => {
    const horse = landmarkById("black-horse");
    expect(horse).toBeDefined();
    expect(horse?.agreement).toBe("unresolved");
    expect(horse?.confidence).toBe("low");
    expect((horse?.candidates ?? []).map((candidate) => candidate.source).sort()).toEqual([
      "A",
      "B",
      "app",
    ]);
    // The pin holds the value already in the code until a human adjudicates.
    expect(horse?.lat).toBe(18.92945);
    expect(horse?.lng).toBe(72.83225);
  });

  it("resolves every alias to exactly one landmark", () => {
    const index = aliasIndex();
    expect(index.get("kala ghoda")).toBe("black-horse");
    expect(index.get("काला घोड़ा")).toBe("black-horse");
    expect(index.get("the museum")).toBe("csmvs");
    for (const row of ALL_LANDMARKS) {
      expect(index.get(row.name.toLowerCase()), `${row.id} name is not indexed`).toBeDefined();
    }
  });
});

describe("the app's five landmark chips", () => {
  it("gives every entry at least one alias", () => {
    for (const landmark of LANDMARKS) {
      expect(landmark.aliases.length, `${landmark.id} has no alias`).toBeGreaterThan(0);
    }
  });

  it("keeps its ids, coordinates and names unchanged", () => {
    expect(LANDMARKS.map((landmark) => landmark.id)).toEqual([
      "black-horse",
      "jehangir",
      "csmvs",
      "sassoon",
      "max-mueller",
    ]);
    const horse = LANDMARKS.find((landmark) => landmark.id === "black-horse");
    expect(horse?.lat).toBe(18.92945);
    expect(horse?.lng).toBe(72.83225);
  });

  it("keeps every chip inside the bounding box", () => {
    for (const landmark of LANDMARKS) {
      expect(isInsideCity(landmark.lat, landmark.lng), `${landmark.id} is outside`).toBe(true);
    }
  });

  it("names a row that also exists in the merged table", () => {
    for (const landmark of LANDMARKS) {
      expect(landmarkById(landmark.id), `${landmark.id} is missing from the merged table`).toBeDefined();
    }
  });

  it("keeps the bounding box the merged table was checked against", () => {
    expect(CITY.bounds).toEqual({
      north: 18.9346,
      south: 18.9258,
      west: 72.8292,
      east: 72.8358,
    });
  });
});
