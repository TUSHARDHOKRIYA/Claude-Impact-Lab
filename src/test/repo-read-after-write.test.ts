import { beforeEach, describe, expect, it, vi } from "vitest";
import { DynamoRastabaazRepository } from "@/lib/repo/dynamo";
import { sampleJpegDataUrl } from "./sample-jpeg";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@/lib/repo/dynamo-client", () => ({
  getDocClient: () => ({ send }),
  getTableName: () => "rastabaaz-test",
}));

const location = {
  type: "location", id: "loc_1", name: "Pothole on Dr Ambedkar Road",
  slug: "ambedkar-pothole", issueType: "pothole", lat: 18.9298, lng: 72.8328,
  street: "Dr Ambedkar Road", ward: "A Ward", createdAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => { send.mockReset(); });

describe("reads immediately after recording", () => {
  it("reads both PHOTO and legacy META consistently", async () => {
    send.mockResolvedValueOnce({}).mockResolvedValueOnce({ Item: { photo: "legacy-photo" } });
    expect(await new DynamoRastabaazRepository().getReportPhoto("rpt_1")).toBe("legacy-photo");
    expect(send.mock.calls.map(([command]) => command.input)).toEqual([
      { TableName: "rastabaaz-test", Key: { pk: "RPT#rpt_1", sk: "PHOTO" }, ConsistentRead: true },
      { TableName: "rastabaaz-test", Key: { pk: "RPT#rpt_1", sk: "META" }, ConsistentRead: true },
    ]);
  });

  it("finds a newly created place through its slug lock while gsi1 lags", async () => {
    send.mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Item: { locationId: location.id } })
      .mockResolvedValueOnce({ Item: location });
    expect(await new DynamoRastabaazRepository().getLocationBySlug(location.slug)).toMatchObject({ id: location.id, slug: location.slug });
    expect(send.mock.calls.slice(1).map(([command]) => command.input)).toEqual([
      { TableName: "rastabaaz-test", Key: { pk: "SLUG#ambedkar-pothole", sk: "LOCK" }, ConsistentRead: true },
      { TableName: "rastabaaz-test", Key: { pk: "LOC#loc_1", sk: "META" }, ConsistentRead: true },
    ]);
  });

  it("does not report a failed submission when only the post-commit count fails", async () => {
    send.mockImplementation((command) => {
      if (command.input.IndexName === "gsi2") return { Items: [location] };
      if (command.input.IndexName === "gsi1") throw new Error("Throttled count query");
      return {};
    });
    const result = await new DynamoRastabaazRepository().createReport({
      issueType: "pothole", lat: location.lat, lng: location.lng,
      photo: sampleJpegDataUrl(), noticedAt: "2026-09-27", recurs: false, description: "Loose paving",
    });
    expect(result.report.id).toMatch(/^rpt_/);
    expect(result.connectedCount).toBe(0);
    expect(send.mock.calls.filter(([command]) => command.constructor.name === "TransactWriteCommand")).toHaveLength(1);
  });
});
