import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getReportPage = vi.fn();
vi.mock("@/lib/queries", () => ({ getReportPage: (...args: unknown[]) => getReportPage(...args) }));

import { generateMetadata } from "@/app/reports/[id]/page";
import type { LocationRecord, PublicReportRecord, ReportPageData } from "@/lib/types";

const location: LocationRecord = {
  id: "loc_1",
  name: "Waste on Rampart Row",
  slug: "rampart-waste",
  issueType: "pothole",
  lat: 18.93,
  lng: 72.83,
  street: "Rampart Row",
  ward: "A Ward",
  createdAt: "2026-01-01",
};

function report(photoIsIllustration: boolean): PublicReportRecord {
  return {
    id: "rpt_1",
    locationId: location.id,
    issueType: "pothole",
    lat: location.lat,
    lng: location.lng,
    noticedAt: "2026-09-01",
    noticedWindow: "this_week",
    recurs: false,
    description: "Bags on the edge",
    isSample: photoIsIllustration,
    photoIsIllustration,
    createdAt: "2026-09-01",
  };
}

function page(photoIsIllustration: boolean): ReportPageData {
  const row = report(photoIsIllustration);
  return {
    report: row,
    location,
    place: { location, reportCount: 1, recurring: false, latestReport: row },
    similar: [],
    history: [],
    connectedCount: 0,
  };
}

describe("report social images", () => {
  it("uses the report photo for a real photo and the site PNG for an illustration", async () => {
    getReportPage.mockResolvedValueOnce(page(false));
    const photo = await generateMetadata({ params: Promise.resolve({ id: "rpt_1" }) });
    expect(photo.openGraph?.images).toEqual(["/reports/rpt_1/photo"]);
    expect(photo.twitter?.images).toEqual(["/reports/rpt_1/photo"]);
    expect(JSON.stringify(photo)).not.toMatch(/sample/i);

    getReportPage.mockResolvedValueOnce(page(true));
    const illustration = await generateMetadata({ params: Promise.resolve({ id: "rpt_1" }) });
    expect(illustration.openGraph?.images).toEqual(["/opengraph-image"]);
    expect(illustration.twitter?.images).toEqual(["/opengraph-image"]);
    expect(JSON.stringify(illustration)).not.toMatch(/\/reports\/rpt_1\/photo/);
    expect(JSON.stringify(illustration)).not.toMatch(/sample/i);
  });
});
