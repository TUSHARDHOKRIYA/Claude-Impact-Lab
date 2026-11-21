import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PlacePreview } from "@/components/map/PlacePreview";
import { paintSelectedLocation } from "@/components/map/map-layers";
import type { PlaceSummary } from "@/lib/types";

const place: PlaceSummary = {
  location: {
    id: "loc_1",
    name: "Pothole on SV Road",
    slug: "sv-road-pothole",
    issueType: "pothole",
    lat: 18.93,
    lng: 72.83,
    street: "Homi Modi Street",
    ward: "A Ward",
    createdAt: "2026-09-01",
  },
  reportCount: 2,
  recurring: true,
  latestReport: {
    id: "rpt_latest",
    locationId: "loc_1",
    issueType: "pothole",
    lat: 18.93,
    lng: 72.83,
    noticedAt: "2026-09-01",
    noticedWindow: null,
    recurs: false,
    description: null,
    isSample: false,
    photoIsIllustration: false,
    createdAt: "2026-09-01",
  },
};

afterEach(() => cleanup());

describe("report highlight", () => {
  it("enlarges the submitted report's dot, not every dot at the place", () => {
    const setPaintProperty = vi.fn();
    const map = { getLayer: () => true, setPaintProperty };
    paintSelectedLocation(map as never, "loc_1", "rpt_fresh");
    expect(setPaintProperty).toHaveBeenCalledWith(
      "rb-points",
      "circle-radius",
      ["case", ["==", ["get", "id"], "rpt_fresh"], 12, 7],
    );
  });

  it("links the opened place to your report", () => {
    render(<PlacePreview place={place} onClose={() => undefined} yourReportId="rpt_fresh" />);
    expect(screen.getByRole("link", { name: "Your report" })).toHaveAttribute("href", "/reports/rpt_fresh");
    expect(screen.getByRole("link", { name: "Open this place" })).toHaveAttribute(
      "href",
      "/places/sv-road-pothole?report=rpt_fresh",
    );
    expect(screen.queryByRole("link", { name: "Latest report" })).not.toBeInTheDocument();
  });
});
