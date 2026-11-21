import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { placeLockKey } from "@/lib/repo/place-lock";
import type { CreateReportInput, ReportRecord } from "@/lib/types";

import { sampleJpegDataUrl } from "./sample-jpeg";

const send = vi.fn();

vi.mock("@/lib/repo/dynamo-client", () => ({
  getDocClient: () => ({ send }),
  getTableName: () => "khabar-test",
}));

let DynamoKhabarRepository: typeof import("@/lib/repo/dynamo").DynamoKhabarRepository;
let TransactionCanceledException: typeof import("@aws-sdk/client-dynamodb").TransactionCanceledException;

const SPOT = { lat: 18.9298, lng: 72.8328 };

function input(partial: Partial<CreateReportInput> = {}): CreateReportInput {
  return {
    issueType: "footpath",
    ...SPOT,
    photo: sampleJpegDataUrl(),
    noticedAt: "2026-09-01",
    recurs: false,
    affects: ["walking"],
    description: null,
    ...partial,
  };
}

function storedReport(): ReportRecord {
  return {
    id: "rpt_1",
    locationId: "loc_old",
    issueType: "footpath",
    ...SPOT,
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

function cancelled(codes: (string | undefined)[]) {
  return new TransactionCanceledException({
    message: "transaction cancelled",
    $metadata: {},
    CancellationReasons: codes.map((Code) => ({ Code: Code ?? "None" })),
  });
}

type Input = Record<string, unknown>;

function inputs(): Input[] {
  return send.mock.calls.map(([command]) => command.input as Input);
}

function transacts(): Input[] {
  return inputs().filter((candidate) => Array.isArray(candidate.TransactItems));
}

/**
 * A transact carries the place and whatever the caller asked to write with it.
 * When DynamoDB cancels one, three different things can have happened, and the
 * old code called all three a lost race: it walked the lock slots and ended in
 * an unlocked write even for a throttle.
 */
describe("a cancelled transact", () => {
  beforeAll(async () => {
    ({ TransactionCanceledException } = await import("@aws-sdk/client-dynamodb"));
    ({ DynamoKhabarRepository } = await import("@/lib/repo/dynamo"));
  });

  beforeEach(() => {
    send.mockReset();
  });

  it("surfaces a mix of a lost race and a real fault", async () => {
    // Reasons are per item, so one cancellation can carry both. A single
    // ConditionalCheckFailed is not proof the whole thing was a race: the
    // throttle here is the operational failure that has to reach the caller.
    let attempts = 0;
    send.mockImplementation(async (command: { input: Input }) => {
      if (Array.isArray(command.input.TransactItems)) {
        attempts += 1;
        throw cancelled(["ConditionalCheckFailed", "None", "ThrottlingError"]);
      }
      return { Items: [] };
    });

    await expect(new DynamoKhabarRepository().createReport(input())).rejects.toThrow(
      /transaction cancelled/,
    );
    // Not retried as a collision, so no slot walk and no unlocked fallback.
    expect(attempts).toBe(1);
  });

  it("still walks the slots when every reason is a lost race", async () => {
    let attempts = 0;
    send.mockImplementation(async (command: { input: Input }) => {
      if (Array.isArray(command.input.TransactItems)) {
        attempts += 1;
        if (attempts === 1) throw cancelled(["ConditionalCheckFailed", "None", "None"]);
        return {};
      }
      if (command.input.ConsistentRead === true) return { Item: undefined };
      return { Items: [] };
    });

    await new DynamoKhabarRepository().createReport(input());

    expect(attempts).toBe(2);
  });
});

/**
 * Changing a report's problem moves it to the place for the new one. Creating
 * that place and moving the report used to be two writes, so a move that
 * failed after the first left a place standing with no report in it.
 */
describe("moving a report to a place that has to be created", () => {
  beforeAll(async () => {
    ({ TransactionCanceledException } = await import("@aws-sdk/client-dynamodb"));
    ({ DynamoKhabarRepository } = await import("@/lib/repo/dynamo"));
  });

  beforeEach(() => {
    send.mockReset();
  });

  function reads(command: { input: Input }): unknown {
    const key = command.input.Key as { pk: string } | undefined;
    if (key?.pk === "RPT#rpt_1" && !command.input.UpdateExpression) {
      return { Item: { pk: "RPT#rpt_1", sk: "META", type: "report", ...storedReport() } };
    }
    return { Items: [] };
  }

  it("writes the place and the move in one transact", async () => {
    send.mockImplementation(async (command: { input: Input }) => {
      if (Array.isArray(command.input.TransactItems)) return {};
      return reads(command);
    });

    const moved = await new DynamoKhabarRepository().updateReport({
      id: "rpt_1",
      issueType: "waste",
    });

    expect(moved?.issueType).toBe("waste");
    expect(moved?.locationId).not.toBe("loc_old");

    const ops = transacts()[0].TransactItems as {
      Put?: { Item: { pk: string } };
      Update?: { Key: { pk: string }; ConditionExpression: string };
    }[];
    // Location, slug lock, place lock, and the report's move, all or nothing.
    expect(ops.map((op) => op.Put?.Item.pk ?? op.Update?.Key.pk)).toEqual([
      moved ? `LOC#${moved.locationId}` : "",
      expect.stringMatching(/^SLUG#/),
      placeLockKey({ ...SPOT, issueType: "waste" }).pk,
      "RPT#rpt_1",
    ]);
    expect(ops[3].Update?.ConditionExpression).toBe("attribute_exists(pk)");

    // No second write: a standalone update is what could fail on its own.
    expect(inputs().filter((candidate) => candidate.UpdateExpression)).toHaveLength(0);
  });

  it("reports the report gone rather than retrying its condition as a race", async () => {
    // Index 3 is the report's own op. A failed condition there means someone
    // deleted the report mid-move, which no slot walk can fix.
    let attempts = 0;
    send.mockImplementation(async (command: { input: Input }) => {
      if (Array.isArray(command.input.TransactItems)) {
        attempts += 1;
        throw cancelled(["None", "None", "None", "ConditionalCheckFailed"]);
      }
      return reads(command);
    });

    const moved = await new DynamoKhabarRepository().updateReport({
      id: "rpt_1",
      issueType: "waste",
    });

    expect(moved).toBeNull();
    expect(attempts).toBe(1);
  });

  it("still writes when a cancelled attempt ends up joining the winner", async () => {
    // `extra` is called on every attempt, including ones whose transact is
    // cancelled. Treating "the callback ran" as "the move was written" made
    // the desk see a save that never happened: the attempt was cancelled, the
    // probe found a place to join, and no write was ever issued.
    const winner = {
      pk: "LOC#loc_winner",
      sk: "META",
      type: "location",
      id: "loc_winner",
      name: "Waste at Kala Ghoda",
      slug: "kala-ghoda-waste",
      issueType: "waste",
      ...SPOT,
      street: "Kala Ghoda",
      ward: "A Ward",
      createdAt: "2026-09-01T00:00:00.000Z",
    };
    send.mockImplementation(async (command: { input: Input }) => {
      // gsi2 misses the place a concurrent writer just made, so the transact
      // is cancelled and the consistent read names the winner.
      if (Array.isArray(command.input.TransactItems)) {
        throw cancelled(["None", "None", "ConditionalCheckFailed"]);
      }
      if (command.input.ConsistentRead === true) {
        const key = command.input.Key as { pk: string };
        if (key.pk.startsWith("PLACE#")) {
          return { Item: { pk: key.pk, sk: "LOCK", locationId: "loc_winner" } };
        }
        if (key.pk === "LOC#loc_winner") return { Item: winner };
      }
      return reads(command);
    });

    const moved = await new DynamoKhabarRepository().updateReport({
      id: "rpt_1",
      issueType: "waste",
    });

    expect(moved?.locationId).toBe("loc_winner");
    // The move joined an existing place, so it still owes the report a write.
    const updates = inputs().filter((candidate) => candidate.UpdateExpression);
    expect(updates).toHaveLength(1);
    expect(updates[0].ExpressionAttributeValues).toMatchObject({
      ":locationId": "loc_winner",
      ":issueType": "waste",
    });
  });

  it("uses a plain update when the destination place already exists", async () => {
    const existing = {
      pk: "LOC#loc_waste",
      sk: "META",
      type: "location",
      id: "loc_waste",
      name: "Waste at Kala Ghoda",
      slug: "kala-ghoda-waste",
      issueType: "waste",
      ...SPOT,
      street: "Kala Ghoda",
      ward: "A Ward",
      createdAt: "2026-09-01T00:00:00.000Z",
    };
    send.mockImplementation(async (command: { input: Input }) => {
      if (command.input.IndexName === "gsi2") return { Items: [existing] };
      return reads(command);
    });

    const moved = await new DynamoKhabarRepository().updateReport({
      id: "rpt_1",
      issueType: "waste",
    });

    expect(moved?.locationId).toBe("loc_waste");
    // Nothing was created, so there is no place to strand: one update is fine.
    expect(transacts()).toHaveLength(0);
    expect(inputs().filter((candidate) => candidate.UpdateExpression)).toHaveLength(1);
  });
});
