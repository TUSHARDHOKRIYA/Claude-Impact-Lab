import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { filterMapPoints, MapFilters } from "@/components/map/MapFilters";
import type { MapReportPoint, PlaceSummary } from "@/lib/types";

vi.mock("@/components/map/CityMap", () => ({
  CityMap: () => <div data-testid="rb-map-enhancement">map</div>,
}));

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
  reportedAt: "2026-09-01",
};

const older: MapReportPoint = {
  id: "rpt_jan",
  locationId: "loc_1",
  lat: 18.93,
  lng: 72.83,
  issueType: "pothole",
  noticedAt: "2026-01-01",
  noticedWindow: "over_six_months",
  reportedAt: "2026-01-01",
};

const points = [recent, older];

afterEach(() => {
  cleanup();
});

describe("map date reported filter", () => {
  it("filters by reported month, clears back to all reports, and closes on Done", async () => {
    const user = userEvent.setup();
    render(<MapFilters points={points} places={[place]} />);
    expect(screen.getByText("1 place, 2 reports")).toBeInTheDocument();
    const chip = screen.getByRole("button", { name: /Date reported: Any date/ });
    expect(chip).toHaveAttribute("aria-expanded", "false");

    await user.click(chip);
    const panel = screen.getByRole("group", { name: "Date reported" });
    await user.click(within(panel).getByRole("button", { name: "Sep 2026" }));

    expect(screen.getByText("1 place, 1 report")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Date reported: Sep 2026/ })).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "Clear" }));
    expect(screen.getByText("1 place, 2 reports")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Date reported: Any date/ })).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("group", { name: "Date reported" })).not.toBeInTheDocument();
    expect(chip).toHaveFocus();
  });

  it("accepts an open-ended From date and keeps only later reports", async () => {
    const user = userEvent.setup();
    render(<MapFilters points={points} places={[place]} />);
    await user.click(screen.getByRole("button", { name: /Date reported: Any date/ }));
    const panel = screen.getByRole("group", { name: "Date reported" });
    fireEvent.change(within(panel).getByLabelText("From"), { target: { value: "2026-06-01" } });

    expect(screen.getByText("1 place, 1 report")).toBeInTheDocument();
    expect(filterMapPoints(points, "all", { from: "2026-06-01", to: null }).map((p) => p.id)).toEqual([
      "rpt_recent",
    ]);
  });
});
