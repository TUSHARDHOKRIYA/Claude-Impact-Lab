import { describe, expect, it } from "vitest";
import { generateCandidatePairs } from "../lib/matching/candidate/generator";
import { scoreCandidatePair } from "../lib/matching/candidate/scorer";
import type { NormalizedComplaintRecord } from "../lib/matching/types";

function mockComplaint(overrides: Partial<NormalizedComplaintRecord>): NormalizedComplaintRecord {
  return {
    id: "COMP-01",
    receivedAt: "2025-06-01 10:00",
    normalizedTimestamp: "2025-06-01T10:00:00.000Z",
    channel: "app",
    channelRaw: "MyBMC App",
    rawCategory: "Pothole",
    canonicalCategory: "pothole",
    inferredCategory: null,
    rawDescription: "Huge pothole on road",
    cleanText: "huge pothole on road",
    tokens: ["huge", "pothole", "on", "road"],
    language: "en",
    rawLocality: "Hindmata",
    gps: { lat: 19.003, lng: 72.84, accuracyM: 10 },
    status: "Open",
    upvotes: 0,
    resolution: {
      roadId: "RD001",
      roadName: "Dr Ambedkar Road",
      ward: "F/S",
      locality: "Hindmata",
      distanceToRoadM: 15,
      method: "gps_road_snap",
      confidence: 0.95,
      warnings: [],
    },
    ...overrides,
  };
}

describe("matching candidate scoring and duplicate detection", () => {
  it("assigns high-confidence auto-merge to same road and proximate reports", () => {
    const c1 = mockComplaint({
      id: "C1",
      normalizedTimestamp: "2025-06-01T10:00:00.000Z",
    });
    const c2 = mockComplaint({
      id: "C2",
      normalizedTimestamp: "2025-06-01T14:00:00.000Z",
      rawDescription: "Big pothole near signal on road",
      tokens: ["big", "pothole", "near", "signal", "on", "road"],
    });

    const pair = scoreCandidatePair(c1, c2);
    expect(pair.score).toBeGreaterThanOrEqual(0.8);
    expect(pair.confidenceTier).toBe("high");
    expect(pair.policy).toBe("auto_merge");
    expect(pair.features.sameRoad).toBe(true);
  });

  it("STRICT GUARDRAIL: rejects merging physically distant defects despite identical text", () => {
    // Both complaints have identical text "Huge pothole on road"
    // But C1 is at lat 19.003, C2 is at lat 19.008 (~550m away on different road)
    const c1 = mockComplaint({
      id: "C1",
      gps: { lat: 19.003, lng: 72.84, accuracyM: 10 },
      resolution: {
        roadId: "RD001",
        roadName: "Road A",
        ward: "F/S",
        locality: "Hindmata",
        distanceToRoadM: 10,
        method: "gps_road_snap",
        confidence: 0.95,
        warnings: [],
      },
    });

    const c2 = mockComplaint({
      id: "C2",
      gps: { lat: 19.008, lng: 72.84, accuracyM: 10 },
      resolution: {
        roadId: "RD002",
        roadName: "Road B",
        ward: "F/S",
        locality: "Hindmata",
        distanceToRoadM: 10,
        method: "gps_road_snap",
        confidence: 0.95,
        warnings: [],
      },
    });

    const pair = scoreCandidatePair(c1, c2);
    expect(pair.features.sameRoad).toBe(false);
    expect(pair.features.distanceM).toBeGreaterThan(500);
    expect(pair.policy).toBe("separate_issue");
    expect(pair.score).toBeLessThan(0.4);
  });

  it("STRICT GUARDRAIL: rejects merging incompatible categories near same coordinates", () => {
    // Both complaints are at exact same spot 10m apart
    // But C1 is Pothole, C2 is Open Manhole
    const c1 = mockComplaint({
      id: "C1",
      canonicalCategory: "pothole",
      cleanText: "pothole in middle lane",
    });

    const c2 = mockComplaint({
      id: "C2",
      canonicalCategory: "open_manhole",
      cleanText: "open manhole lid missing",
    });

    const pair = scoreCandidatePair(c1, c2);
    expect(pair.features.categoryMatch).toBe(false);
    expect(pair.policy).toBe("separate_issue");
    expect(pair.score).toBeLessThanOrEqual(0.25);
  });

  it("filters candidate generation efficiently avoiding unnecessary comparisons", () => {
    const cWardF_S = mockComplaint({ id: "C_FS", resolution: { ...mockComplaint({}).resolution, ward: "F/S", roadId: "RD001" } });
    const cWardA = mockComplaint({
      id: "C_A",
      gps: { lat: 18.92, lng: 72.83, accuracyM: 10 },
      resolution: { ...mockComplaint({}).resolution, ward: "A", roadId: "RD099" },
    });

    const pairs = generateCandidatePairs([cWardF_S, cWardA]);
    // Different wards, different roads, different spatial cells -> zero candidates generated!
    expect(pairs).toHaveLength(0);
  });
});
