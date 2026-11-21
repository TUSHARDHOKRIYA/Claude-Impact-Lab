import { describe, expect, it } from "vitest";
import { CLUSTER_GRID, MATCH_METERS, clusterKey, neighbourClusterKeys } from "@/lib/geo";

const CENTER = { lat: 18.9298, lng: 72.8324 };
const METERS_PER_DEGREE_LAT = 111_320;

describe("geo clusters", () => {
  it("uses a 40 metre match radius and 0.00028 grid", () => {
    expect(MATCH_METERS).toBe(40);
    expect(CLUSTER_GRID).toBe(0.00028);
  });

  it("returns a 5x5 neighbourhood of cluster keys", () => {
    const keys = neighbourClusterKeys(CENTER.lat, CENTER.lng);
    expect(keys).toHaveLength(25);
    expect(new Set(keys).size).toBe(25);
  });

  it("keeps a point 40m north of the origin inside the origin neighbourhood", () => {
    const northLat = CENTER.lat + MATCH_METERS / METERS_PER_DEGREE_LAT;
    const northKey = clusterKey(northLat, CENTER.lng);
    expect(neighbourClusterKeys(CENTER.lat, CENTER.lng)).toContain(northKey);
  });
});
