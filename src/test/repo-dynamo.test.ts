import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCitizenReport,
  catalogScanInput,
  fromReportItem,
  reportListProjection,
  toReportItem,
} from "@/lib/repo/mappers";
import type { CreateReportInput } from "@/lib/types";
import { sampleJpegDataUrl } from "./sample-jpeg";

const send = vi.fn();

vi.mock("@/lib/repo/dynamo-client", () => ({
  getDocClient: () => ({ send }),
  getTableName: () => "rastabaaz-test",
}));

const AWS_PACKAGES = ["@aws-sdk/client-dynamodb", "@aws-sdk/lib-dynamodb"] as const;

const REPORT_LIST_ATTRS = [
  "id",
  "locationId",
  "issueType",
  "lat",
  "lng",
  "noticedAt",
  "noticedWindow",
  "recurs",
  "affects",
  "description",
  "isSample",
  "createdAt",
] as const;

const REPORT_ITEM = {
  pk: "RPT#rpt_1",
  sk: "META",
  type: "report",
  id: "rpt_1",
  locationId: "loc_1",
  issueType: "road",
  lat: 18.93,
  lng: 72.83,
  noticedAt: "2026-01-01",
  noticedWindow: "this_week",
  recurs: false,
  affects: ["walking"],
  description: null,
  isSample: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

let DynamoRastabaazRepository: typeof import("@/lib/repo/dynamo").DynamoRastabaazRepository;
let QueryCommand: typeof import("@aws-sdk/lib-dynamodb").QueryCommand;

async function requireAwsPackages(): Promise<void> {
  const missing: string[] = [];
  for (const spec of AWS_PACKAGES) {
    try {
      await import(spec);
    } catch {
      missing.push(spec);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `node_modules is stale or incomplete (missing ${missing.join(", ")}). Run \`npm ci\` in this worktree, then \`npm test -- src/test/repo-dynamo.test.ts\`.`,
    );
  }
}

function jpegDataUrl(): string {
  return sampleJpegDataUrl();
}

function citizenInput(partial: Partial<CreateReportInput> = {}): CreateReportInput {
  return {
    issueType: "footpath",
    lat: 18.9298,
    lng: 72.8328,
    photo: jpegDataUrl(),
    noticedAt: "2026-09-01",
    recurs: false,
    affects: ["walking"],
    description: "Loose stones",
    ...partial,
  };
}

function sentCommand(index = 0): { name: string; input: Record<string, unknown> } {
  const command = send.mock.calls[index]?.[0] as
    | { constructor?: { name?: string }; input?: Record<string, unknown> }
    | undefined;
  if (!command?.input) throw new Error("Expected a DynamoDB document command to be sent.");
  return { name: command.constructor?.name ?? "", input: command.input };
}

function projectedNames(input: Record<string, unknown>): string[] {
  const expr = String(input.ProjectionExpression ?? "");
  const names = (input.ExpressionAttributeNames ?? {}) as Record<string, string>;
  return expr
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((token) => names[token] ?? token.replace(/^#/, ""));
}

describe("DynamoRastabaazRepository", () => {
  beforeAll(async () => {
    await requireAwsPackages();
    ({ QueryCommand } = await import("@aws-sdk/lib-dynamodb"));
    ({ DynamoRastabaazRepository } = await import("@/lib/repo/dynamo"));
  });

  beforeEach(() => {
    send.mockReset();
  });

  it("keeps voice transcripts out of list and catalog projections", () => {
    expect(catalogScanInput().ProjectionExpression).not.toContain(
      "voiceTranscript",
    );
    expect(reportListProjection().ProjectionExpression).not.toContain(
      "voiceTranscript",
    );
  });

  it("round-trips a voice transcript through the full report item", () => {
    const report = buildCitizenReport(
      citizenInput({ voiceTranscript: "mixed transcript" }),
      "loc_1",
    );
    const item = toReportItem(report);
    expect(item.voiceTranscript).toBe("mixed transcript");
    expect(fromReportItem(item).voiceTranscript).toBe("mixed transcript");
  });

  it("listReportsForLocation Query excludes photo at the read boundary", async () => {
    const older = { ...REPORT_ITEM, id: "rpt_old", noticedAt: "2026-01-01", createdAt: "2026-01-01T00:00:00.000Z" };
    const newer = { ...REPORT_ITEM, id: "rpt_new", noticedAt: "2026-03-01", createdAt: "2026-03-01T00:00:00.000Z" };
    send.mockResolvedValueOnce({ Items: [older, newer], LastEvaluatedKey: undefined });
    const rows = await new DynamoRastabaazRepository().listReportsForLocation("loc_1");
    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(QueryCommand);
    const { input } = sentCommand();
    expect(input.IndexName).toBe("gsi1");
    expect(input.KeyConditionExpression).toBe("gsi1pk = :pk AND begins_with(gsi1sk, :rpt)");
    expect(input.ProjectionExpression).toEqual(expect.any(String));
    expect(String(input.ProjectionExpression).length).toBeGreaterThan(0);
    const names = projectedNames(input);
    expect(names).not.toContain("photo");
    expect(Object.values((input.ExpressionAttributeNames ?? {}) as Record<string, string>)).not.toContain(
      "photo",
    );
    expect(names).toEqual(expect.arrayContaining([...REPORT_LIST_ATTRS]));
    expect(rows.map((row) => row.id)).toEqual(["rpt_new", "rpt_old"]);
    expect(rows.every((row) => !("photo" in row))).toBe(true);
    expect(rows[0]?.locationId).toBe("loc_1");
  });

  it("rejects a sample path as a citizen photo before writing", async () => {
    await expect(new DynamoRastabaazRepository().createReport(citizenInput({ photo: "/samples/paving.svg" }))).rejects.toThrow(
      /JPEG, PNG, or WebP/,
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects an item over 400 KiB before writing", async () => {
    await expect(
      new DynamoRastabaazRepository().createReport(citizenInput({ description: "x".repeat(410000) })),
    ).rejects.toThrow(/too large/);
    expect(send).not.toHaveBeenCalled();
  });

  it("retires a seed report with a conditional delete, and not at all once it has notes", async () => {
    const { RETIRED_HEATMAP_REPORTS } = await import("@/lib/seed-heatmap");
    const [retired] = RETIRED_HEATMAP_REPORTS;
    send
      .mockResolvedValueOnce({ Count: 0 })
      .mockResolvedValueOnce({ Item: { photo: retired.photo } })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    await new DynamoRastabaazRepository().putSeedItems([{ entity: "retire_report", record: retired }]);
    const inputs = send.mock.calls.map(([command]) => command.input);
    const [notes, , del, photoDelete] = inputs;
    expect(notes).toMatchObject({ IndexName: "gsi1", ExpressionAttributeValues: { ":pk": `RPT#${retired.id}`, ":upd": "UPD#" } });
    expect(del.Key).toEqual({ pk: `RPT#${retired.id}`, sk: "META" });
    // Only the seed's own row may go: every desk-editable field must still read as seeded.
    expect(photoDelete.Key).toEqual({ pk: `RPT#${retired.id}`, sk: "PHOTO" });
    expect(del.ConditionExpression).toContain("attribute_exists(pk)");
    expect(del.ConditionExpression).not.toContain("#photo");
    for (const field of ["isSample", "issueType", "description", "recurs", "locationId"]) {
      expect(del.ConditionExpression).toContain(`#${field} = :${field}`);
      expect(del.ExpressionAttributeValues[`:${field}`]).toEqual(retired[field as keyof typeof retired]);
    }

    send.mockReset();
    send.mockResolvedValueOnce({ Count: 1 });
    await new DynamoRastabaazRepository().putSeedItems([{ entity: "retire_report", record: retired }]);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
