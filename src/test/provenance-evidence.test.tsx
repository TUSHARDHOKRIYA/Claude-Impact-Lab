import { vi } from "vitest";

vi.mock("server-only", () => ({}));

import { describe, expect, it } from "vitest";
import { insightsFromPlaces } from "@/lib/insights";
import { toPlaceSummary } from "@/lib/place-summary";
import type { LocationRecord, ReportListItem } from "@/lib/types";

const location: LocationRecord = {
  id: "loc_1",
  name: "Pothole near Hindmata",
  slug: "pothole-near-hindmata",
  issueType: "pothole",
  lat: 18.92714,
  lng: 72.8316,
  street: "Mahatma Gandhi Road",
  ward: "A Ward",
  createdAt: "2026-09-18T10:00:00.000Z",
};

function report(partial: Partial<ReportListItem> = {}): ReportListItem {
  return {
    id: "rpt_1",
    locationId: location.id,
    issueType: "pothole",
    lat: location.lat,
    lng: location.lng,
    noticedAt: "2026-09-18",
    noticedWindow: "this_week",
    recurs: false,
    description: "Broken paving.",
    isSample: false,
    photoIsIllustration: false,
    createdAt: "2026-09-18T10:00:00.000Z",
    ...partial,
  };
}

describe("reporting insights", () => {
  it("counts reports, places, and places reported more than once", () => {
    const once = toPlaceSummary(location, [report()]);
    const again = toPlaceSummary(
      { ...location, id: "loc_2" },
      [report({ id: "rpt_a" }), report({ id: "rpt_b", recurs: true })],
    );
    expect(insightsFromPlaces([once, again])).toEqual({
      reports: 3,
      places: 2,
      recurringPlaces: 1,
    });
  });
});
