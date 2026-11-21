import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { InsightStrip } from "@/components/insights/InsightStrip";
import { insightsFromPlaces } from "@/lib/insights";
import { toPlaceSummary } from "@/lib/place-summary";
import type { LocationRecord, MapInsightCounts, ReportListItem } from "@/lib/types";

const insights: MapInsightCounts = {
  reports: 8,
  places: 3,
  recurringPlaces: 2,
};

const PAIRS: {
  key: keyof MapInsightCounts;
  label: string;
  hint: string;
}[] = [
  {
    key: "reports",
    label: "Reports",
    hint: "Street reports stored for these places.",
  },
  {
    key: "places",
    label: "Places",
    hint: "Places with at least one report.",
  },
  {
    key: "recurringPlaces",
    label: "Recurring",
    hint: "Two or more reports, or a report marked as recurring.",
  },
];

afterEach(() => cleanup());

describe("InsightStrip", () => {
  it("renders report, place, and recurring counts", () => {
    render(<InsightStrip insights={insights} />);
    const region = screen.getByRole("region", { name: "Counts from the stored records" });
    expect(region.querySelector(".ux4g-card")).not.toBeNull();
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("Places")).toBeInTheDocument();
    expect(screen.getByText("Recurring")).toBeInTheDocument();
    expect(screen.queryByText("Reported more than once")).not.toBeInTheDocument();
    expect(screen.queryByText("No identifiable owner")).not.toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("puts each term before its definition and keeps count plus hint inside dd", () => {
    render(<InsightStrip insights={insights} />);
    const terms = screen.getAllByRole("term");
    const defs = screen.getAllByRole("definition");
    expect(terms.map((term) => term.textContent)).toEqual(PAIRS.map((item) => item.label));
    expect(defs).toHaveLength(PAIRS.length);
    const following = Node.DOCUMENT_POSITION_FOLLOWING;
    for (const [index, item] of PAIRS.entries()) {
      const dt = terms[index];
      const dd = defs[index];
      expect(dt.compareDocumentPosition(dd) & following).toBeTruthy();
      expect(dd).toHaveTextContent(String(insights[item.key]));
      expect(dd).toHaveTextContent(item.hint);
    }
  });
});

const location: LocationRecord = {
  id: "loc_1",
  name: "Pothole on SV Road",
  slug: "sv-road-pothole",
  issueType: "pothole",
  lat: 18.93,
  lng: 72.83,
  street: "SV Road",
  ward: "A Ward",
  createdAt: "2026-01-01",
};

function report(partial: Partial<ReportListItem> = {}): ReportListItem {
  return {
    id: "rpt_1",
    locationId: location.id,
    issueType: "pothole",
    lat: location.lat,
    lng: location.lng,
    noticedAt: "2026-09-01",
    noticedWindow: "this_week",
    recurs: false,
    description: null,
    isSample: false,
    photoIsIllustration: false,
    createdAt: "2026-09-01",
    ...partial,
  };
}

describe("recurringPlaces", () => {
  it("counts a place with two reports or one marked recurring", () => {
    const once = toPlaceSummary(location, [report()]);
    const twice = toPlaceSummary({ ...location, id: "loc_2" }, [
      report({ id: "rpt_a" }),
      report({ id: "rpt_b" }),
    ]);
    const marked = toPlaceSummary({ ...location, id: "loc_3" }, [report({ id: "rpt_c", recurs: true })]);
    expect(once.recurring).toBe(false);
    expect(twice.recurring).toBe(true);
    expect(marked.recurring).toBe(true);
    expect(insightsFromPlaces([once, twice, marked])).toEqual({
      reports: 4,
      places: 3,
      recurringPlaces: 2,
    });
  });
});
