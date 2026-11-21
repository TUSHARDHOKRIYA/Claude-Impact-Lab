import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { byTypeQueryInput, catalogScanInput, toPhotoItem } from "@/lib/repo/mappers";
import type { CreateReportInput } from "@/lib/types";
import { sampleJpegDataUrl } from "./sample-jpeg";

const send = vi.fn();

vi.mock("@/lib/repo/dynamo-client", () => ({
  getDocClient: () => ({ send }),
  getTableName: () => "rastabaaz-test",
}));

const REPORT_ITEM = {
  pk: "RPT#rpt_1",
  sk: "META",
  type: "report",
  id: "rpt_1",
  locationId: "loc_1",
  issueType: "pothole",
  lat: 18.93,
  lng: 72.83,
  noticedAt: "2026-01-01",
  noticedWindow: "this_week",
  recurs: false,
    description: null,
  isSample: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const LOCATION = {
  type: "location",
  id: "loc_1",
  name: "Pothole on Dr Ambedkar Road",
  slug: "ambedkar-pothole",
  issueType: "waterlogging",
  lat: 18.9298,
  lng: 72.8328,
  street: "Dr Ambedkar Road",
  ward: "A Ward",
  createdAt: "2026-01-01T00:00:00.000Z",
};

let DynamoRastabaazRepository: typeof import("@/lib/repo/dynamo").DynamoRastabaazRepository;
let ScanCommand: typeof import("@aws-sdk/lib-dynamodb").ScanCommand;

function citizenInput(): CreateReportInput {
  return {
    issueType: "waterlogging",
    lat: 18.9298,
    lng: 72.8328,
    photo: sampleJpegDataUrl(),
    noticedAt: "2026-09-01",
    recurs: false,
        description: "Loose stones",
  };
}

const PHOTO_ITEM = { pk: "RPT#rpt_1", sk: "PHOTO", photo: "data:image/jpeg;base64,aa" };

const STORED_REPORT = {
  ...REPORT_ITEM,
  photo: "data:image/jpeg;base64,secret",
  voiceTranscript: "private",
};

const TABLE_ITEMS: Record<string, unknown>[] = [LOCATION, STORED_REPORT, PHOTO_ITEM];

function projectedNames(input: Record<string, unknown>): string[] {
  const expr = String(input.ProjectionExpression ?? "");
  const names = (input.ExpressionAttributeNames ?? {}) as Record<string, string>;
  return expr
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((token) => names[token] ?? token.replace(/^#/, ""));
}

function projectItem(item: Record<string, unknown>, input: Record<string, unknown>): Record<string, unknown> {
  const names = projectedNames(input);
  if (!names.length) return { ...item };
  const projected: Record<string, unknown> = {};
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(item, name)) projected[name] = item[name];
  }
  return projected;
}

function itemsForByTypeQuery(input: Record<string, unknown>): Record<string, unknown>[] {
  const type = (input.ExpressionAttributeValues as Record<string, unknown> | undefined)?.[":type"];
  return TABLE_ITEMS.filter((item) => item.type === type).map((item) => projectItem(item, input));
}

function photoBesideReport(command: { input?: { TransactItems?: { Put?: { Item: Record<string, unknown> } }[] } }) {
  const puts = (command.input?.TransactItems ?? []).flatMap((item) => (item.Put ? [item.Put.Item] : []));
  const meta = puts.find((item) => item.sk === "META" && item.type === "report");
  const photo = puts.find((item) => item.sk === "PHOTO");
  expect(meta?.photo).toBeUndefined();
  expect(photo).toMatchObject({ pk: meta?.pk, sk: "PHOTO" });
  expect(photo?.type).toBeUndefined();
  expect(photo?.gsi1pk).toBeUndefined();
  expect(photo?.gsi2pk).toBeUndefined();
  expect(String(photo?.photo)).toMatch(/^data:image/);
}

describe("Dynamo photo and catalog reads", () => {
  beforeAll(async () => {
    ({ ScanCommand } = await import("@aws-sdk/lib-dynamodb"));
    ({ DynamoRastabaazRepository } = await import("@/lib/repo/dynamo"));
  });

  beforeEach(() => {
    send.mockReset();
  });

  it("getReportPhoto reads the PHOTO item and falls back to a legacy META photo", async () => {
    send.mockResolvedValueOnce({ Item: { pk: "RPT#rpt_1", sk: "PHOTO", photo: "data:image/jpeg;base64,aa" } });
    const photo = await new DynamoRastabaazRepository().getReportPhoto("rpt_1");
    expect(send.mock.calls[0]?.[0].input.Key).toEqual({ pk: "RPT#rpt_1", sk: "PHOTO" });
    expect(photo).toBe("data:image/jpeg;base64,aa");

    send.mockReset();
    send
      .mockResolvedValueOnce({ Item: undefined })
      .mockResolvedValueOnce({ Item: { ...REPORT_ITEM, photo: "data:image/jpeg;base64,legacy" } });
    const legacy = await new DynamoRastabaazRepository().getReportPhoto("rpt_1");
    expect(send.mock.calls[1]?.[0].input.Key).toEqual({ pk: "RPT#rpt_1", sk: "META" });
    expect(legacy).toBe("data:image/jpeg;base64,legacy");
  });

  it("loadCatalog queries byType and never projects photo", async () => {
    let reportItems: Record<string, unknown>[] = [];
    send.mockImplementation((command: { input?: Record<string, unknown> }) => {
      const input = command.input ?? {};
      const items = itemsForByTypeQuery(input);
      if ((input.ExpressionAttributeValues as Record<string, unknown> | undefined)?.[":type"] === "report") {
        reportItems = items;
      }
      return { Items: items, LastEvaluatedKey: undefined };
    });
    const catalog = await new DynamoRastabaazRepository().loadCatalog();
    const queries = send.mock.calls.map((call) => call[0].input);
    expect(queries.map((input) => input.IndexName)).toEqual(["byType", "byType", "byType"]);
    expect(queries.map((input) => input.ExpressionAttributeValues[":type"])).toEqual(["location", "report", "note"]);
    const names = projectedNames(queries[0]);
    expect(names).not.toContain("photo");
    expect(names).not.toContain("voiceTranscript");
    expect(reportItems).toHaveLength(1);
    expect(reportItems[0]).not.toHaveProperty("photo");
    expect(reportItems[0]).not.toHaveProperty("voiceTranscript");
    expect(reportItems.some((item) => item.sk === "PHOTO")).toBe(false);
    expect(catalog.reports[0] && "photo" in catalog.reports[0]).toBe(false);
    expect(catalog.reports[0]?.noticedWindow).toBe("this_week");
    expect(byTypeQueryInput("report").ProjectionExpression).not.toContain("photo");
  });

  it("falls back to a scan when the byType index is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const missing = Object.assign(new Error("The table does not have the specified index: byType"), {
      name: "ValidationException",
    });
    send.mockImplementation((command: { constructor?: { name?: string } }) => {
      if (command.constructor?.name === "ScanCommand") return { Items: [REPORT_ITEM] };
      return Promise.reject(missing);
    });
    const catalog = await new DynamoRastabaazRepository().loadCatalog();
    expect(send.mock.calls.some((call) => call[0] instanceof ScanCommand)).toBe(true);
    expect(catalog.reports[0]?.id).toBe("rpt_1");
    expect(warn).toHaveBeenCalled();
    expect(catalogScanInput().ProjectionExpression).not.toContain("photo");
    warn.mockRestore();
  });

  it("writes the photo in the same transact as a report on an existing place", async () => {
    send.mockImplementation((command: { input?: { IndexName?: string } }) => {
      if (command.input?.IndexName === "gsi2") return { Items: [LOCATION] };
      return { Items: [] };
    });
    await new DynamoRastabaazRepository().createReport(citizenInput());
    const transact = send.mock.calls.map(([command]) => command).find((command) => command.constructor?.name === "TransactWriteCommand");
    photoBesideReport(transact);
    expect(toPhotoItem("rpt_1", "data:image/jpeg;base64,aa")).toEqual({
      pk: "RPT#rpt_1",
      sk: "PHOTO",
      photo: "data:image/jpeg;base64,aa",
    });
  });

  it("writes the photo in the same transact when the place is new", async () => {
    send.mockResolvedValue({ Items: [] });
    await new DynamoRastabaazRepository().createReport(citizenInput());
    const transact = send.mock.calls.map(([command]) => command).find((command) => command.constructor?.name === "TransactWriteCommand");
    photoBesideReport(transact);
    const puts = transact.input.TransactItems as { Put?: { Item: Record<string, unknown> } }[];
    expect(puts.some((item) => item.Put?.Item.type === "location")).toBe(true);
  });
});
