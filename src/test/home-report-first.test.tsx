import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MapInsightCounts, PlaceSummary } from "@/lib/types";

vi.mock("@/lib/voice/actions", () => ({ processVoiceTurnAction: vi.fn() }));
vi.mock("@/lib/voice/speak-action", () => ({ speakPromptAction: vi.fn(async () => null) }));
vi.mock("@/lib/queries", () => ({
  listMapPoints: vi.fn(),
  listPlaces: vi.fn(),
  readReportPoint: vi.fn(async () => null),
  readReportPlace: vi.fn(async () => null),
  getMapInsights: vi.fn(),
  insightsFromPlaces: (places: { reportCount: number; recurring: boolean }[]) => ({
    reports: places.reduce((sum, item) => sum + item.reportCount, 0),
    places: places.length,
    recurringPlaces: places.filter((item) => item.recurring).length,
  }),
}));

vi.mock("@/lib/actions", () => ({
  createReportAction: vi.fn(),
}));

vi.mock("@/lib/photo-compress", () => ({
  compressImageFile: vi.fn(),
}));

vi.mock("@/components/report/PinMap", () => ({
  default: function PinMapStub() {
    return <div data-testid="pin-map">pin</div>;
  },
}));

vi.mock("@/components/map/KalaGhodaMap", () => ({
  KalaGhodaMap: ({
    points,
    highlightReportId,
    focusPoint,
  }: {
    points: { id: string }[];
    highlightReportId?: string;
    focusPoint?: { lat: number; lng: number };
  }) => (
    <div data-testid="kg-map-enhancement">
      <span>points {points.map((item) => item.id).join(" ")}</span>
      <span>highlight {highlightReportId ?? "none"}</span>
      <span>focus {focusPoint ? `${focusPoint.lat},${focusPoint.lng}` : "none"}</span>
    </div>
  ),
}));

import MapPage from "@/app/map/page";
import HomePage from "@/app/page";
import NotFound from "@/app/not-found";
import NewReportPage from "@/app/report/new/page";
import { HomeIssueLinks } from "@/components/home/HomeIssueLinks";
import { getMapInsights, listMapPoints, listPlaces, readReportPlace, readReportPoint } from "@/lib/queries";

const place: PlaceSummary = {
  location: {
    id: "loc_1",
    name: "K Dubash Marg footpath, Kala Ghoda Part 2",
    slug: "k-dubash-marg-kala-ghoda-part-2-footpath",
    issueType: "footpath",
    lat: 18.9298,
    lng: 72.8328,
    street: "K Dubash Marg",
    ward: "A Ward",
    createdAt: "2022-08-18",
  },
  reportCount: 4,
  recurring: true,
  latestReport: null,
};

const insights: MapInsightCounts = {
  reports: 4,
  places: 1,
  recurringPlaces: 3,
};

afterEach(() => {
  cleanup();
  vi.mocked(listMapPoints).mockReset();
  vi.mocked(listPlaces).mockReset();
  vi.mocked(readReportPoint).mockReset();
  vi.mocked(readReportPoint).mockResolvedValue(null);
  vi.mocked(readReportPlace).mockReset();
  vi.mocked(readReportPlace).mockResolvedValue(null);
  vi.mocked(getMapInsights).mockReset();
});

const point = {
  id: "rpt_1",
  locationId: "loc_1",
  lat: 18.9298,
  lng: 72.8328,
  issueType: "footpath" as const,
  noticedAt: "2022-08-18",
};

function stubMap(places: PlaceSummary[] = [place]) {
  vi.mocked(listMapPoints).mockResolvedValue([point]);
  vi.mocked(listPlaces).mockResolvedValue(places);
  vi.mocked(getMapInsights).mockResolvedValue(insights);
}

describe("home report-first experience", () => {
  it("opens on the report form", async () => {
    render(await HomePage({ searchParams: Promise.resolve({}) }));
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "You are recording a visible street condition, not filing a BMC complaint.",
    );
    expect(alert.className).toMatch(/ux4g-alert-warning/);
    expect(
      screen.getByRole("heading", { level: 1, name: "Record a street condition" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/not a municipal complaint portal/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(screen.queryByText(/Dispatch/)).not.toBeInTheDocument();
    expect(document.querySelector(".ledger, .plate, .stamp, .display")).toBeNull();
  });
});

describe("map page", () => {
  it("lists places under the map title", async () => {
    stubMap();
    render(await MapPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1, name: "Map of reports" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Counts from the stored records" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Places in Kala Ghoda" })).toBeInTheDocument();
    expect(screen.queryByText(/Submitted\. Your report is highlighted/)).not.toBeInTheDocument();
  });

  it("highlights a submitted report and banners only when it is new", async () => {
    stubMap();
    render(await MapPage({ searchParams: Promise.resolve({ report: "rpt_1", new: "1" }) }));
    expect(screen.getByText("Submitted. Your report is highlighted on the map.")).toBeInTheDocument();
    expect(readReportPlace).not.toHaveBeenCalled();
    expect(screen.getByText("highlight rpt_1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /K Dubash Marg footpath/i })).toHaveAttribute("aria-current", "true");
  });

  it("keeps the highlight without the banner when new is absent", async () => {
    stubMap();
    render(await MapPage({ searchParams: Promise.resolve({ report: "rpt_1" }) }));
    expect(screen.queryByText(/Submitted\. Your report is highlighted/)).not.toBeInTheDocument();
    expect(screen.getByText("highlight rpt_1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /K Dubash Marg footpath/i })).toHaveAttribute("aria-current", "true");
  });

  it("shows a report the catalog has not caught up to, even with no place row", async () => {
    vi.mocked(listMapPoints).mockResolvedValue([]);
    vi.mocked(listPlaces).mockResolvedValue([]);
    vi.mocked(getMapInsights).mockResolvedValue(insights);
    vi.mocked(readReportPoint).mockResolvedValue({
      id: "rpt_fresh",
      locationId: "loc_fresh",
      lat: 18.93,
      lng: 72.83,
      issueType: "waste",
      noticedAt: "2026-09-27",
    });
    vi.mocked(readReportPlace).mockResolvedValue({
      ...place,
      location: { ...place.location, id: "loc_fresh", name: "Waste near Max Mueller Bhavan", slug: "fresh" },
    });
    render(await MapPage({ searchParams: Promise.resolve({ report: "rpt_fresh", new: "1" }) }));
    expect(readReportPlace).toHaveBeenCalledWith("rpt_fresh");
    expect(screen.getByRole("link", { name: /Waste near Max Mueller Bhavan/i })).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("Submitted. Your report is highlighted on the map.")).toBeInTheDocument();
    expect(screen.getByText("points rpt_fresh")).toBeInTheDocument();
    expect(screen.getByText("highlight rpt_fresh")).toBeInTheDocument();
    expect(screen.getByText("focus 18.93,72.83")).toBeInTheDocument();
  });

  it("opens preview when the listed report's place is still missing", async () => {
    stubMap([]);
    vi.mocked(readReportPlace).mockResolvedValue(place);
    render(await MapPage({ searchParams: Promise.resolve({ report: "rpt_1" }) }));
    expect(readReportPlace).toHaveBeenCalledWith("rpt_1");
    expect(readReportPoint).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /K Dubash Marg footpath/i })).toHaveAttribute("aria-current", "true");
  });
  it("rebuilds a joined place so the new report is counted", async () => {
    stubMap();
    vi.mocked(readReportPoint).mockResolvedValue({
      id: "rpt_fresh",
      locationId: "loc_1",
      lat: 18.9298,
      lng: 72.8328,
      issueType: "footpath",
      noticedAt: "2026-09-27",
    });
    vi.mocked(readReportPlace).mockResolvedValue({ ...place, reportCount: 5, recurring: true });
    render(await MapPage({ searchParams: Promise.resolve({ report: "rpt_fresh" }) }));
    expect(readReportPlace).toHaveBeenCalledWith("rpt_fresh");
    expect(screen.getByText("5 reports")).toBeInTheDocument();
    expect(screen.queryByText("4 reports")).not.toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows the map alone when the report id is unknown", async () => {
    stubMap();
    render(await MapPage({ searchParams: Promise.resolve({ report: "rpt_missing" }) }));
    expect(screen.getByRole("heading", { name: "Map of reports" })).toBeInTheDocument();
    expect(screen.queryByText(/Submitted\. Your report is highlighted/)).not.toBeInTheDocument();
    expect(readReportPoint).toHaveBeenCalledWith("rpt_missing");
  });

  it("never looks up a malformed report id", async () => {
    stubMap();
    vi.mocked(readReportPoint).mockClear();
    render(await MapPage({ searchParams: Promise.resolve({ report: "x".repeat(3000) }) }));
    expect(screen.getByRole("heading", { name: "Map of reports" })).toBeInTheDocument();
    expect(readReportPoint).not.toHaveBeenCalled();
  });
});

describe("HomeIssueLinks", () => {
  it("exposes six 48px deep links in order with visible focus classes", async () => {
    const user = userEvent.setup();
    render(<HomeIssueLinks />);
    const nav = screen.getByRole("navigation", { name: "Condition types" });
    expect(within(nav).getByRole("list")).toBeInTheDocument();
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/?type=footpath",
      "/?type=lighting",
      "/?type=road",
      "/?type=drainage",
      "/?type=waste",
      "/?type=other",
    ]);
    expect(links.map((link) => link.textContent)).toEqual([
      "Footpath",
      "Lighting",
      "Road",
      "Drainage",
      "Waste",
      "Other",
    ]);
    for (const link of links) {
      expect(link.className).toMatch(/touch-target/);
      expect(link.className).toMatch(/ux4g-btn/);
    }
    await user.tab();
    expect(links[0]).toHaveFocus();
  });
});

describe("not-found and new-report pages", () => {
  it("returns home with the exact GovButton label", () => {
    render(<NotFound />);
    const link = screen.getByRole("link", { name: "Return to Kala Ghoda records" });
    expect(link).toHaveAttribute("href", "/map");
    expect(link.className).toMatch(/ux4g-btn-primary/);
    expect(link.className).toMatch(/touch-target/);
    expect(screen.queryByRole("link", { name: "Return to the map" })).toBeNull();
  });

  it("passes a valid searchParams type into the guided form", async () => {
    render(
      await HomePage({
        searchParams: Promise.resolve({ type: "footpath" }),
      }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "You are recording a visible street condition, not filing a BMC complaint.",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Record a street condition" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /photo of what you can see/i }),
    ).toBeInTheDocument();
    expect(document.querySelector('input[type="hidden"][name="issueType"]')).toHaveValue(
      "footpath",
    );
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("ignores an invalid type and leaves the picker empty", async () => {
    render(
      await HomePage({
        searchParams: Promise.resolve({ type: "not-an-issue" }),
      }),
    );
    expect(document.querySelector('input[type="hidden"][name="issueType"]')).toHaveValue("");
  });

  it("sends the old report URL back to the form and keeps the type", async () => {
    await expect(
      NewReportPage({ searchParams: Promise.resolve({ type: "footpath" }) }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
  });
});
