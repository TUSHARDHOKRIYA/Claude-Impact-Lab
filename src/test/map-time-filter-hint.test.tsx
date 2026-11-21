import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { filterMapPoints, MapFilters } from "@/components/map/MapFilters";
import type { MapReportPoint, PlaceSummary } from "@/lib/types";

vi.mock("@/components/map/CityMap", () => ({
  CityMap: () => <div data-testid="rb-map-enhancement">map</div>,
}));

const HINT =
  "Reports marked “More than six months ago” have no exact date. Choose All time to include them.";

const place: PlaceSummary = {
  location: {
    id: "loc_1",
    name: "Pothole on Dr Ambedkar Road, Parel",
    slug: "dr-ambedkar-road-parel-pothole",
    issueType: "pothole",
    lat: 18.93,
    lng: 72.83,
    street: "Dr Ambedkar Road",
    ward: "A Ward",
    createdAt: "2026-09-01",
  },
  reportCount: 2,
  recurring: false,
  latestReport: null,
};

const recent: MapReportPoint = {
  id: "rpt_recent",
  locationId: "loc_1",
  lat: 18.93,
  lng: 72.83,
  issueType: "pothole",
  noticedAt: "2026-09-01",
  noticedWindow: "this_week",
};

const overSix: MapReportPoint = {
  id: "rpt_old_window",
  locationId: "loc_1",
  lat: 18.93,
  lng: 72.83,
  issueType: "pothole",
  noticedAt: "2026-01-01",
  noticedWindow: "over_six_months",
};

const points = [recent, overSix];

afterEach(() => {
  cleanup();
});

describe("map time filter explanation", () => {
  it("shows the open-ended-window note only on bounded filters, without changing date semantics", async () => {
    const user = userEvent.setup();
    render(<MapFilters points={points} places={[place]} />);

    expect(screen.getByRole("radio", { name: "All time" })).toBeChecked();
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Past year" }));
    expect(screen.getByText(HINT)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Past five years" }));
    expect(screen.getByText(HINT)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "All time" }));
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    expect(filterMapPoints(points, "all", "all").map((p) => p.id).sort()).toEqual([
      "rpt_old_window",
      "rpt_recent",
    ]);
    expect(filterMapPoints(points, "all", "1y").map((p) => p.id)).toEqual(["rpt_recent"]);
    expect(filterMapPoints(points, "all", "5y").map((p) => p.id)).toEqual(["rpt_recent"]);
  });
});
