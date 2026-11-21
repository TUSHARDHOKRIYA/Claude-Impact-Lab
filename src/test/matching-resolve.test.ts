import { describe, expect, it } from "vitest";
import { resolveLocality } from "../lib/matching/resolve/locality";
import { resolveLocation } from "../lib/matching/resolve/resolver";
import { snapGpsToRoad } from "../lib/matching/resolve/road";
import { distToSegment, haversineDistance } from "../lib/matching/resolve/spatial";
import type { Road } from "../lib/rupee/types";

describe("matching location resolution", () => {
  const dummyRoad: Road = {
    id: "RD001",
    name: "Dr Ambedkar Road",
    segmentNo: 1,
    ward: "F/S",
    roadType: "Arterial",
    surface: "Asphalt",
    lanes: 4,
    lengthM: 500,
    start: { lat: 19.001, lng: 72.84 },
    end: { lat: 19.005, lng: 72.84 },
    lastResurfaced: "2023-01-01",
    underDlp: false,
    busRoute: true,
  };

  const roadsByWard = new Map<string, Road[]>([["F/S", [dummyRoad]]]);

  it("calculates accurate point-to-segment distances", () => {
    // Point directly on segment midpoint
    const dOn = distToSegment(19.003, 72.84, dummyRoad.start, dummyRoad.end);
    expect(dOn).toBeLessThan(1.0); // Within 1m

    // Point 100m east of midpoint (~0.00095 degrees longitude at 19°N)
    const dOffset = distToSegment(19.003, 72.84095, dummyRoad.start, dummyRoad.end);
    expect(dOffset).toBeGreaterThan(95);
    expect(dOffset).toBeLessThan(105);
  });

  it("Priority 1: snaps GPS within 80m to the nearest road segment", () => {
    // Point ~20m from dummyRoad
    const res = snapGpsToRoad(19.003, 72.8402, [dummyRoad]);
    expect(res.snapped).toBe(true);
    expect(res.road?.id).toBe("RD001");
    expect(res.confidence).toBeGreaterThanOrEqual(0.8);
    expect(res.distanceM).toBeLessThanOrEqual(40);
  });

  it("Priority 1 guardrail: does NOT snap to road if distance exceeds 80m", () => {
    // Point ~200m from dummyRoad
    const res = snapGpsToRoad(19.003, 72.842, [dummyRoad]);
    expect(res.snapped).toBe(false);
    expect(res.road).toBeNull();
    expect(res.warning).toContain("> 80m threshold");
  });

  it("Priority 2: resolves exact locality names and aliases", () => {
    const resColaba = resolveLocality("Colaba");
    expect(resColaba).not.toBeNull();
    expect(resColaba?.matchType).toBe("exact");
    expect(resColaba?.locality.ward).toBe("A");

    // Devanagari alias lookup (Hindmata / हिंदमाता)
    const resHindmata = resolveLocality("हिंदमाता");
    expect(resHindmata).not.toBeNull();
    expect(resHindmata?.locality.name).toBe("Hindmata");
  });

  it("Priority 3: resolves fuzzy locality matches with confidence explanation", () => {
    const res = resolveLocality("Hindmata Flyover Junction");
    expect(res).not.toBeNull();
    expect(res?.locality.name).toBe("Hindmata");
    expect(res?.confidence).toBeGreaterThanOrEqual(0.6);
    expect(res?.explanation).toContain("Fuzzy matched");
  });

  it("executes full 5-level priority correctly", () => {
    // Priority 1: Valid GPS on road
    const p1 = resolveLocation(
      { lat: 19.003, lng: 72.8401, localityText: "Dadar", wardCode: "F/S" },
      { roadsByWard },
    );
    expect(p1.method).toBe("gps_road_snap");
    expect(p1.roadId).toBe("RD001");

    // Priority 2: Missing GPS -> Exact locality
    const p2 = resolveLocation(
      { lat: null, lng: null, localityText: "Colaba", wardCode: null },
      { roadsByWard },
    );
    expect(p2.method).toBe("exact_locality");
    expect(p2.ward).toBe("A");

    // Priority 3: Missing GPS -> Fuzzy locality
    const p3 = resolveLocation(
      { lat: null, lng: null, localityText: "Parel ST Depot", wardCode: null },
      { roadsByWard },
    );
    expect(p3.method).toBe("fuzzy_locality");

    // Priority 4: Ward-only fallback
    const p4 = resolveLocation(
      { lat: null, lng: null, localityText: "Unknown Unknown", wardCode: "K/W" },
      { roadsByWard },
    );
    expect(p4.method).toBe("ward_fallback");
    expect(p4.ward).toBe("K/W");

    // Priority 5: Unresolved
    const p5 = resolveLocation(
      { lat: null, lng: null, localityText: "", wardCode: "INVALID_WARD" },
      { roadsByWard },
    );
    expect(p5.method).toBe("unresolved");
    expect(p5.confidence).toBe(0);
  });
});
