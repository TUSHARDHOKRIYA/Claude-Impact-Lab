import { describe, expect, it } from "vitest";
import { namePlace, nearestLandmarkName, nearestStreetName, repairStoredPlace } from "@/lib/place-name";
import { seedHeatmap } from "@/lib/seed-heatmap";
import { seedPaving } from "@/lib/seed-paving";
import streetsFile from "@/lib/streets.data.json";
import type { IssueType, LocationRecord } from "@/lib/types";

const ROAD_NAMES = new Set((streetsFile.streets as { name: string }[]).map((street) => street.name));

const DUBASH = { lat: 18.9277, lng: 72.83185 };

describe("place names from streets", () => {
  it("names the road under a pin on Kaikhushru Dubash Marg", () => {
    expect(nearestStreetName(DUBASH.lat, DUBASH.lng)).toBe("Kaikhushru Dubash Marg");
  });

  it("uses a nearby landmark in the place name and keeps the street separate", () => {
    const named = namePlace("footpath", 18.92714, 72.8316);
    expect(named.landmark).toBe("Jehangir Art Gallery");
    expect(named.street).not.toBe("Jehangir Art Gallery");
    expect(named.name).toBe("Footpath near Jehangir Art Gallery");
  });

  it("names a landmark-button pin after that button, never a closed cafe beside it", () => {
    // The Jehangir button drops its pin 47 m from the Samovar Cafe row.
    expect(nearestLandmarkName(DUBASH.lat, DUBASH.lng)).toBe("Jehangir Art Gallery");
    expect(nearestLandmarkName(18.9273, 72.83168)).not.toMatch(/Samovar|closed/i);
    expect(nearestLandmarkName(18.92945, 72.83225)).toBe("Kala Ghoda horse statue");
  });

  it("falls back to the precinct when nothing named is within 60 m", () => {
    expect(nearestStreetName(0, 0)).toBe("Kala Ghoda");
    expect(nearestLandmarkName(0, 0)).toBeNull();
    expect(namePlace("waste", 0, 0).name).toBe("Waste in Kala Ghoda");
  });

  it("repairs a legacy street and rewrites only a name the old helper generated", () => {
    const legacy: LocationRecord = {
      id: "loc_old",
      name: "Lighting near Kala Ghoda / the black horse",
      slug: "kept-slug",
      issueType: "lighting",
      lat: DUBASH.lat,
      lng: DUBASH.lng,
      street: "Kala Ghoda / the black horse",
      ward: "A Ward",
      createdAt: "2024-01-01",
    };
    const repaired = repairStoredPlace(legacy);
    expect(repaired.slug).toBe("kept-slug");
    expect(repaired.street).toBe("Kaikhushru Dubash Marg");
    expect(repaired.name.startsWith("Lighting")).toBe(true);
    expect(repaired.name).not.toContain("black horse");

    const curatedOnLandmark: LocationRecord = {
      ...legacy,
      name: "Dark stretch near Jehangir Art Gallery",
      street: "Jehangir Art Gallery",
    };
    const kept = repairStoredPlace(curatedOnLandmark);
    expect(kept.name).toBe("Dark stretch near Jehangir Art Gallery");
    expect(kept.street).toBe("Kaikhushru Dubash Marg");

    const alreadyRoad: LocationRecord = {
      ...legacy,
      name: "Broken carriageway on M G Road",
      street: "M G Road",
    };
    expect(repairStoredPlace(alreadyRoad)).toEqual(alreadyRoad);
  });

  it("keeps every seeded place name and never stores a landmark as the street", () => {
    const locations = [...seedPaving(), ...seedHeatmap()].flatMap((item) =>
      item.entity === "location" ? [item.record] : [],
    );
    expect(locations.length).toBeGreaterThan(0);
    // Streets a curated seed name already names; kept as written, as live rows have them.
    const curatedRoads = new Set(["K Dubash Marg", "Rampart Row", "M G Road"]);
    for (const location of locations) {
      expect(repairStoredPlace(location)).toEqual(location);
      if (curatedRoads.has(location.street)) {
        expect(location.name).toContain(location.street);
        continue;
      }
      // Rows that used to carry a landmark take the nearest mapped road, or
      // the precinct when none is within 60 m (the museum pin).
      expect(location.street).toBe(nearestStreetName(location.lat, location.lng));
      expect(ROAD_NAMES.has(location.street) || location.street === "Kala Ghoda").toBe(true);
    }
  });

  it("reads every previous seed street as the street this seed writes", () => {
    const previous: { id: string; name: string; street: string; issueType: IssueType; lat: number; lng: number }[] = [
      { id: "loc_k_dubash_footpath", name: "K Dubash Marg footpath, Kala Ghoda Part 2", street: "K Dubash Marg", issueType: "footpath", lat: 18.9298, lng: 72.8328 },
      { id: "loc_mg_road_surface", name: "Broken carriageway on M G Road", street: "M G Road", issueType: "road", lat: 18.92855, lng: 72.83135 },
      { id: "loc_rampart_row_waste", name: "Overflowing waste on Rampart Row", street: "Rampart Row", issueType: "waste", lat: 18.9314, lng: 72.8329 },
      { id: "loc_jehangir_lighting", name: "Dark stretch near Jehangir Art Gallery", street: "Jehangir Art Gallery", issueType: "lighting", lat: 18.9277, lng: 72.83185 },
      { id: "loc_black_horse_parking", name: "Vehicle occupation by the black horse", street: "Kala Ghoda / the black horse", issueType: "parking_and_vehicle_occupation", lat: 18.92945, lng: 72.83225 },
      { id: "loc_max_mueller_drain", name: "Blocked drain near Max Mueller Bhavan", street: "Max Mueller Bhavan", issueType: "drainage", lat: 18.9289, lng: 72.83305 },
      { id: "loc_csmvs_street", name: "Damaged street furniture near the museum", street: "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya", issueType: "street_furniture", lat: 18.9267, lng: 72.83255 },
    ];
    const current = new Map(
      [...seedPaving(), ...seedHeatmap()].flatMap((item) =>
        item.entity === "location" ? [[item.record.id, item.record.street] as const] : [],
      ),
    );
    for (const old of previous) {
      const row: LocationRecord = { ...old, slug: "kept", ward: "A Ward", createdAt: "2024-01-01" };
      expect(repairStoredPlace(row).street, old.id).toBe(current.get(old.id));
    }
  });
});
