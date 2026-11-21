import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { ReportRecord } from "@/lib/types";
import { sampleJpegDataUrl } from "./sample-jpeg";

const send = vi.fn();

vi.mock("@/lib/repo/dynamo-client", () => ({
  getDocClient: () => ({ send }),
  getTableName: () => "rastabaaz-test",
}));

let DynamoRastabaazRepository: typeof import("@/lib/repo/dynamo").DynamoRastabaazRepository;
let TransactionCanceledException: typeof import("@aws-sdk/client-dynamodb").TransactionCanceledException;

const PHOTO = sampleJpegDataUrl();

function stored(): ReportRecord {
  return {
    id: "rpt_1",
    locationId: "loc_old",
    issueType: "footpath",
    lat: 18.9298,
    lng: 72.8328,
    noticedAt: "2026-09-01",
    noticedWindow: null,
    recurs: false,
    affects: ["walking"],
    description: null,
    isSample: false,
    createdAt: "2026-09-01T00:00:00.000Z",
    voiceTranscript: null,
  };
}

type Input = {
  Key?: { pk: string };
  TransactItems?: { Update?: { Key: { sk: string }; UpdateExpression: string }; Put?: { Item: { type?: string } } }[];
  IndexName?: string;
  ConsistentRead?: boolean;
  UpdateExpression?: string;
};

function transacts(): Input[] {
  return send.mock.calls
    .map(([command]) => command.input as Input)
    .filter((input) => Array.isArray(input.TransactItems));
}

describe("desk photo replacement", () => {
  beforeAll(async () => {
    ({ TransactionCanceledException } = await import("@aws-sdk/client-dynamodb"));
    ({ DynamoRastabaazRepository } = await import("@/lib/repo/dynamo"));
  });

  beforeEach(() => {
    send.mockReset();
    send.mockImplementation(async (command: { input: Input }) => {
      if (command.input.Key?.pk === "RPT#rpt_1" && command.input.ConsistentRead) {
        return { Item: { pk: "RPT#rpt_1", sk: "META", type: "report", ...stored() } };
      }
      if (Array.isArray(command.input.TransactItems)) return {};
      return { Items: [] };
    });
  });

  it("reads a report with a strongly consistent get", async () => {
    await new DynamoRastabaazRepository().getReport("rpt_1");
    expect(send.mock.calls[0]?.[0].input).toMatchObject({
      Key: { pk: "RPT#rpt_1", sk: "META" },
      ConsistentRead: true,
    });
  });

  it("writes a photo-only edit and the report in one transact", async () => {
    const updated = await new DynamoRastabaazRepository().updateReport({ id: "rpt_1", photo: PHOTO });
    expect(updated?.id).toBe("rpt_1");
    expect(transacts()).toHaveLength(1);
    const ops = transacts()[0]?.TransactItems ?? [];
    expect(ops.map((op) => op.Update?.Key.sk)).toEqual(["META", "PHOTO"]);
    expect(ops[1]?.Update?.UpdateExpression).toBe("SET photo = :photo");
    expect(ops[0]?.Update?.UpdateExpression).toContain("issueType");
    const puts = send.mock.calls.filter(([command]) => command.constructor?.name === "PutCommand");
    expect(puts).toHaveLength(0);
  });

  it("writes a photo and an issue-type move in one transact", async () => {
    const updated = await new DynamoRastabaazRepository().updateReport({
      id: "rpt_1",
      issueType: "waste",
      photo: PHOTO,
    });
    expect(updated?.issueType).toBe("waste");
    expect(transacts()).toHaveLength(1);
    const ops = transacts()[0]?.TransactItems ?? [];
    expect(ops.some((op) => op.Put?.Item.type === "location")).toBe(true);
    expect(ops.some((op) => op.Update?.Key.sk === "META")).toBe(true);
    expect(ops.some((op) => op.Update?.Key.sk === "PHOTO" && op.Update.UpdateExpression === "SET photo = :photo")).toBe(
      true,
    );
  });

  it("returns null when the report condition cancels the photo transact", async () => {
    send.mockImplementation(async (command: { input: Input }) => {
      if (command.input.Key?.pk === "RPT#rpt_1" && command.input.ConsistentRead) {
        return { Item: { pk: "RPT#rpt_1", sk: "META", type: "report", ...stored() } };
      }
      if (Array.isArray(command.input.TransactItems)) {
        throw new TransactionCanceledException({
          message: "cancelled",
          $metadata: {},
          CancellationReasons: [{ Code: "ConditionalCheckFailed" }, { Code: "None" }],
        });
      }
      return { Items: [] };
    });
    await expect(
      new DynamoRastabaazRepository().updateReport({ id: "rpt_1", photo: PHOTO }),
    ).resolves.toBeNull();
  });
});
