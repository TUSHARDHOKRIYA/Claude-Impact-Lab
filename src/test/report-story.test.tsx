import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, expectTypeOf, it } from "vitest";
import type { ComponentProps } from "react";

import { ReportStory } from "@/components/report/ReportStory";
import type { LocationRecord, PlaceSummary, PublicReportRecord, ReportListItem } from "@/lib/types";

const location: LocationRecord = {
  id: "loc_1",
  name: "Pothole on Dr Ambedkar Road",
  slug: "dr-ambedkar-road",
  issueType: "footpath",
  lat: 18.9298,
  lng: 72.8324,
  street: "Dr Ambedkar Road",
  ward: "A Ward",
  createdAt: "2022-01-01T00:00:00.000Z",
};

const report: PublicReportRecord = {
  id: "rpt_1",
  locationId: "loc_1",
  issueType: "footpath",
  lat: 18.9298,
  lng: 72.8324,
  noticedAt: "2022-08-01",
  noticedWindow: "this_week",
  recurs: true,
  affects: ["walking"],
  description: "Broken paving.",
  isSample: true,
  photoIsIllustration: true,
  createdAt: "2022-08-01T00:00:00.000Z",
};

const listed: ReportListItem = {
  id: "rpt_2",
  locationId: "loc_1",
  issueType: "footpath",
  lat: 18.9298,
  lng: 72.8324,
  noticedAt: "2023-01-01",
  noticedWindow: null,
  recurs: true,
  affects: ["walking"],
  description: null,
  isSample: true,
  photoIsIllustration: true,
  createdAt: "2023-01-01T00:00:00.000Z",
};

const place: PlaceSummary = {
  location,
  reportCount: 2,
  recurring: true,
  latestReport: listed,
};

afterEach(() => cleanup());

describe("ReportStory", () => {
  it("accepts only the public report shape", () => {
    expectTypeOf<ComponentProps<typeof ReportStory>["report"]>().toEqualTypeOf<PublicReportRecord>();
  });

  it("loads the photo by route and does not call the report a sample", () => {
    render(
      <ReportStory
        report={report}
        location={location}
        place={place}
        history={[]}
        similar={[listed]}
        connectedCount={1}
      />,
    );
    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("src", "/reports/rpt_1/photo");
    expect(image).toHaveAttribute("alt", "Pothole on Dr Ambedkar Road");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Pothole on Dr Ambedkar Road");
    expect(screen.getByText(/Noticed in the week up to 1 August 2022/)).toBeInTheDocument();
    expect(screen.getByText(/Illustration\. No photo was supplied with this report\./)).toBeInTheDocument();
    expect(screen.getAllByText("Street report").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Sample/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Illustration\. No photo was supplied with this report\./)).toHaveLength(1);
    expect(screen.getAllByText(location.name).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Map" })).toHaveAttribute("href", "/map");
    expect(screen.getByRole("link", { name: location.name })).toHaveAttribute(
      "href",
      "/places/dr-ambedkar-road?report=rpt_1",
    );
    expect(screen.getByRole("link", { name: `Open the full record for ${location.name}` })).toHaveAttribute(
      "href",
      "/places/dr-ambedkar-road?report=rpt_1",
    );
    expect(screen.getByRole("link", { name: "Footpath" })).toHaveAttribute("href", "/reports/rpt_2");
  });
});
