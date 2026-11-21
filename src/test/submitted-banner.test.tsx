import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlaceSummary } from "@/lib/types";

vi.mock("@/lib/queries", () => ({
  listMapPoints: vi.fn(),
  listPlaces: vi.fn(),
  readReportPoint: vi.fn(async () => null),
  readReportPlace: vi.fn(async () => null),
  getMapInsights: vi.fn(),
  insightsFromPlaces: () => ({ reports: 1, places: 1, recurringPlaces: 0 }),
}));

vi.mock("@/components/map/CityMap", () => ({
  CityMap: () => <div data-testid="rb-map-enhancement">map</div>,
}));

import MapPage from "@/app/map/page";
import { MapFilters } from "@/components/map/MapFilters";
import { SubmittedPanel } from "@/components/report/SubmittedPanel";
import type { ReportAnswers } from "@/components/report/ReportSummary";
import { listMapPoints, listPlaces } from "@/lib/queries";
import { SUBMITTED_BANNER } from "@/lib/review-copy";

const place: PlaceSummary = {
  location: {
    id: "loc_1",
    name: "Pothole on Dr Ambedkar Road",
    slug: "ambedkar-pothole",
    issueType: "pothole",
    lat: 18.9298,
    lng: 72.8328,
    street: "Dr Ambedkar Road",
    ward: "A Ward",
    createdAt: "2022-08-18",
  },
  reportCount: 1,
  recurring: false,
  latestReport: null,
};

const point = {
  id: "rpt_1",
  locationId: "loc_1",
  lat: 18.9298,
  lng: 72.8328,
  issueType: "pothole" as const,
  noticedAt: "2022-08-18",
  reportedAt: "2022-08-18",
};

const answers: ReportAnswers = {
  issueType: "pothole",
  preview: "data:image/jpeg;base64,AAAA",
  lat: 18.9298,
  lng: 72.8328,
  noticedWindow: "this_week",
  recurs: "false",
  accident: "",
  description: "",
};

afterEach(() => {
  cleanup();
  vi.mocked(listMapPoints).mockReset();
  vi.mocked(listPlaces).mockReset();
});

async function renderMap(search: { report?: string; new?: string; lang?: string }) {
  vi.mocked(listMapPoints).mockResolvedValue([point]);
  vi.mocked(listPlaces).mockResolvedValue([place]);
  render(await MapPage({ searchParams: Promise.resolve(search) }));
}

describe("submitted map link", () => {
  it("adds lang only for Hindi and Marathi", () => {
    const { rerender } = render(
      <SubmittedPanel reportId="rpt_1" answers={answers} lang="en" onAgain={() => undefined} />,
    );
    expect(screen.getByRole("link", { name: "See it on the map" })).toHaveAttribute(
      "href",
      "/map?report=rpt_1&new=1",
    );
    rerender(<SubmittedPanel reportId="rpt_1" answers={answers} lang="hi-IN" onAgain={() => undefined} />);
    expect(screen.getByRole("link", { name: "नक्शे पर देखें" })).toHaveAttribute(
      "href",
      "/map?report=rpt_1&new=1&lang=hi",
    );
    rerender(<SubmittedPanel reportId="rpt_1" answers={answers} lang="mr" onAgain={() => undefined} />);
    expect(screen.getByRole("link", { name: "नकाशावर पहा" })).toHaveAttribute(
      "href",
      "/map?report=rpt_1&new=1&lang=mr",
    );
  });
});

describe("submitted banner language", () => {
  it("keeps the English banner copy and renders Hindi and Marathi", async () => {
    expect(SUBMITTED_BANNER.en).toBe("Submitted. Your report is highlighted on the map.");
    await renderMap({ report: "rpt_1", new: "1" });
    expect(screen.getByText(SUBMITTED_BANNER.en)).toBeInTheDocument();
    cleanup();
    await renderMap({ report: "rpt_1", new: "1", lang: "hi" });
    expect(screen.getByText(SUBMITTED_BANNER.hi)).toBeInTheDocument();
    cleanup();
    await renderMap({ report: "rpt_1", new: "1", lang: "mr-IN" });
    expect(screen.getByText(SUBMITTED_BANNER.mr)).toBeInTheDocument();
    cleanup();
    await renderMap({ report: "rpt_1", new: "1", lang: "ta" });
    expect(screen.getByText(SUBMITTED_BANNER.en)).toBeInTheDocument();
  });
});

describe("submitted query cleanup", () => {
  it("drops new and lang after the first paint, keeping report, extras and hash", async () => {
    window.history.replaceState({ keep: true }, "", "/map?report=rpt_1&new=1&lang=hi&issue=road#pin");
    const replaceState = vi.spyOn(window.history, "replaceState");
    render(<MapFilters points={[point]} places={[place]} notice={SUBMITTED_BANNER.hi} />);
    await waitFor(() => {
      expect(replaceState).toHaveBeenCalledWith(
        { keep: true },
        "",
        "/map?report=rpt_1&issue=road#pin",
      );
    });
    expect(screen.getByText(SUBMITTED_BANNER.hi)).toBeInTheDocument();
    replaceState.mockRestore();
  });

  it("leaves the URL alone when there is no notice", async () => {
    window.history.replaceState({}, "", "/map?report=rpt_1&new=1&lang=hi");
    const replaceState = vi.spyOn(window.history, "replaceState");
    render(<MapFilters points={[point]} places={[place]} />);
    await waitFor(() => expect(screen.getByTestId("rb-map-enhancement")).toBeInTheDocument());
    expect(replaceState).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?report=rpt_1&new=1&lang=hi");
    replaceState.mockRestore();
  });
});
