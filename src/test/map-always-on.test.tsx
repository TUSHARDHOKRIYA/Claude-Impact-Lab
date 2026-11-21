import { readFileSync } from "node:fs";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MapReportPoint, PlaceSummary } from "@/lib/types";

vi.mock("@/components/map/CityMap", () => ({
  CityMap: ({ selectedId }: { selectedId?: string | null }) => (
    <div data-testid="rb-map-enhancement">
      <a href="#inside-map">Map canvas control</a>
      <button type="button">Zoom in</button>
      {selectedId ? <span>preview {selectedId}</span> : "map"}
    </div>
  ),
}));

import { MapFilters } from "@/components/map/MapFilters";

const MAP_CSS = "src/styles/map.css";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const place: PlaceSummary = {
  location: {
    id: "loc_1",
    name: "Pothole on Dr Ambedkar Road, Parel",
    slug: "dr-ambedkar-road-parel-pothole",
    issueType: "pothole",
    lat: 18.9298,
    lng: 72.8328,
    street: "Dr Ambedkar Road",
    ward: "A Ward",
    createdAt: "2022-08-18",
  },
  reportCount: 4,
  recurring: true,
  latestReport: null,
};

const point: MapReportPoint = {
  id: "rpt_1",
  locationId: "loc_1",
  lat: 18.9298,
  lng: 72.8328,
  issueType: "pothole",
  noticedAt: "2022-08-18",
  reportedAt: "2022-08-18",
};

afterEach(() => {
  cleanup();
});

describe("the map is always on", () => {
  it("renders the map with no disclosure to open", async () => {
    render(<MapFilters points={[point]} places={[place]} />);
    expect(await screen.findByTestId("rb-map-enhancement")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Map canvas control" })).toBeVisible();
    expect(screen.queryByText("Show the map")).not.toBeInTheDocument();
    expect(document.querySelector("details")).toBeNull();
  });

  it("keeps no trace of the old closed-details hide in the stylesheet", () => {
    const css = read(MAP_CSS);
    expect(css).not.toMatch(/rb-map-disclosure/);
    expect(css).not.toMatch(/details:not\(\[open\]\)/);
    expect(css).not.toMatch(/::details-content/);
  });

  it("holds the map's footprint while MapLibre is still loading", () => {
    const css = read(MAP_CSS);
    expect(css).toMatch(/\.rb-map-placeholder\s*\{[^}]*min-height/);
  });

  it("puts the list back on the left at the desktop breakpoint", () => {
    const css = read(MAP_CSS);
    const desktop = css.slice(css.search(/@media\s*\(\s*min-width:\s*64rem\s*\)/));
    expect(desktop).toMatch(/\.rb-map-panel\s*\{[^}]*order:\s*2/);
  });
});
