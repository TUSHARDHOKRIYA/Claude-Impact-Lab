import { beforeEach, describe, expect, it, vi } from "vitest";
import { DynamoKhabarRepository } from "@/lib/repo/dynamo";
import { sampleJpegDataUrl } from "./sample-jpeg";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@/lib/repo/dynamo-client", () => ({
  getDocClient: () => ({ send }),
  getTableName: () => "khabar-test",
}));

const location = {
  type: "location", id: "loc_1", name: "Footpath on K Dubash Marg",
  slug: "dubash-footpath", issueType: "footpath", lat: 18.9298, lng: 72.8328,
  street: "K Dubash Marg", ward: "A Ward", createdAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => { send.mockReset(); });

describe("reads immediately after recording", () => {
  it("reads both PHOTO and legacy META consistently", async () => {
    send.mockResolvedValueOnce({}).mockResolvedValueOnce({ Item: { photo: "legacy-photo" } });
    expect(await new DynamoKhabarRepository().getReportPhoto("rpt_1")).toBe("legacy-photo");
    expect(send.mock.calls.map(([command]) => command.input)).toEqual([
      { TableName: "khabar-test", Key: { pk: "RPT#rpt_1", sk: "PHOTO" }, ConsistentRead: true },
      { TableName: "khabar-test", Key: { pk: "RPT#rpt_1", sk: "META" }, ConsistentRead: true },
    ]);
  });

  it("finds a newly created place through its slug lock while gsi1 lags", async () => {
    send.mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Item: { locationId: location.id } })
      .mockResolvedValueOnce({ Item: location });
    expect(await new DynamoKhabarRepository().getLocationBySlug(location.slug)).toMatchObject({ id: location.id, slug: location.slug });
    expect(send.mock.calls.slice(1).map(([command]) => command.input)).toEqual([
      { TableName: "khabar-test", Key: { pk: "SLUG#dubash-footpath", sk: "LOCK" }, ConsistentRead: true },
      { TableName: "khabar-test", Key: { pk: "LOC#loc_1", sk: "META" }, ConsistentRead: true },
    ]);
  });

  it("does not report a failed submission when only the post-commit count fails", async () => {
    send.mockImplementation((command) => {
      if (command.input.IndexName === "gsi2") return { Items: [location] };
      if (command.input.IndexName === "gsi1") throw new Error("Throttled count query");
      return {};
    });
    const result = await new DynamoKhabarRepository().createReport({
      issueType: "footpath", lat: location.lat, lng: location.lng,
      photo: sampleJpegDataUrl(), noticedAt: "2026-09-27", recurs: false,
      affects: ["walking"], description: "Loose paving",
    });
    expect(result.report.id).toMatch(/^rpt_/);
    expect(result.connectedCount).toBe(0);
    expect(send.mock.calls.filter(([command]) => command.constructor.name === "TransactWriteCommand")).toHaveLength(1);
  });
});
