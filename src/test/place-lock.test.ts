import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { clusterKey, MATCH_METERS, metersBetween } from "@/lib/geo";
import { placeLockItem, placeLockKey } from "@/lib/repo/place-lock";
import type { CreateReportInput } from "@/lib/types";

import { sampleJpegDataUrl } from "./sample-jpeg";

const send = vi.fn();

vi.mock("@/lib/repo/dynamo-client", () => ({
  getDocClient: () => ({ send }),
  getTableName: () => "rastabaaz-test",
}));

let DynamoRastabaazRepository: typeof import("@/lib/repo/dynamo").DynamoRastabaazRepository;
let TransactionCanceledException: typeof import("@aws-sdk/client-dynamodb").TransactionCanceledException;

function input(partial: Partial<CreateReportInput> = {}): CreateReportInput {
  return {
    issueType: "pothole",
    lat: 18.9298,
    lng: 72.8328,
    photo: sampleJpegDataUrl(),
    noticedAt: "2026-09-01",
    recurs: false,
    description: null,
    ...partial,
  };
}

const WINNER_LOCATION = {
  pk: "LOC#loc_winner",
  sk: "META",
  type: "location",
  id: "loc_winner",
  name: "Pothole near Hindmata",
  slug: "hindmata-pothole",
  issueType: "pothole",
  lat: 18.9298,
  lng: 72.8328,
  street: "Hindmata",
  ward: "A Ward",
  createdAt: "2026-09-01T00:00:00.000Z",
};

/** A place-creating transact. The later report write is a transact too, and must not be treated as a second place. */
function placeCreate(input: Record<string, unknown>): boolean {
  const items = input.TransactItems as { Put?: { Item?: { type?: string } } }[] | undefined;
  return Array.isArray(items) && items.some((entry) => entry.Put?.Item?.type === "location");
}

/** A lost race: DynamoDB reports a failed condition on one of the Put items. */
function cancelled() {
  return new TransactionCanceledException({
    message: "transaction cancelled",
    $metadata: {},
    CancellationReasons: [{ Code: "ConditionalCheckFailed" }],
  });
}

/** A real fault, not a race. Must surface rather than retry as a collision. */
function throttled() {
  return new TransactionCanceledException({
    message: "transaction cancelled",
    $metadata: {},
    CancellationReasons: [{ Code: "ThrottlingError" }],
  });
}

describe("the place lock", () => {
  beforeAll(async () => {
    ({ TransactionCanceledException } = await import("@aws-sdk/client-dynamodb"));
    ({ DynamoRastabaazRepository } = await import("@/lib/repo/dynamo"));
  });

  beforeEach(() => {
    send.mockReset();
  });

  it("keys on the geo cell and the problem, not the slug", () => {
    const key = placeLockKey(input({ issueType: "pothole" }));
    expect(key.pk).toBe(`PLACE#${clusterKey(18.9298, 72.8328)}#pothole`);
    expect(key.sk).toBe("LOCK");

    // Same spot, different problem: a different lock, so both can be created.
    expect(placeLockKey(input({ issueType: "waterlogging" })).pk).not.toBe(key.pk);
    // Same problem, same spot: the same lock, so only one writer wins.
    expect(placeLockKey(input({ lat: 18.92980001 })).pk).toBe(key.pk);
  });

  it("is written inside the create transact", async () => {
    // nearby query pages (25 cells), then the transact
    send.mockResolvedValue({ Items: [] });
    await new DynamoRastabaazRepository().createReport(input());

    const transact = send.mock.calls
      .map(([command]) => command.input)
      .find((candidate) => Array.isArray(candidate.TransactItems));
    const locks = transact.TransactItems.map(
      (entry: { Put: { Item: { pk: string } } }) => entry.Put.Item.pk,
    );

    expect(locks).toContain(placeLockKey(input()).pk);
    for (const entry of transact.TransactItems) {
      expect(entry.Put.ConditionExpression).toBe("attribute_not_exists(pk)");
    }
  });

  it("joins the winner on a cancelled transact instead of minting a duplicate", async () => {
    let call = 0;
    send.mockImplementation(async (command: { input: Record<string, unknown> }) => {
      call += 1;
      if (placeCreate(command.input)) throw cancelled();
      if (Array.isArray(command.input.TransactItems)) return {};
      // Consistent reads: the lock, then the location it names. Only this
      // cell's lock is held; the neighbour probe before the transact finds nothing.
      if (command.input.ConsistentRead === true) {
        const key = command.input.Key as { pk: string };
        if (key.pk === placeLockKey(input()).pk) return { Item: placeLockItem(input(), "loc_winner") };
        if (key.pk === "LOC#loc_winner") return { Item: WINNER_LOCATION };
      }
      return { Items: [] };
    });

    const result = await new DynamoRastabaazRepository().createReport(input());

    expect(result.location.id).toBe("loc_winner");
    expect(result.report.locationId).toBe("loc_winner");

    // Both lookups must be strongly consistent. An eventually consistent read
    // is what let the old retry mint a second place.
    const consistent = send.mock.calls
      .map(([command]) => command.input)
      .filter((candidate) => candidate.ConsistentRead === true);
    expect(consistent.length).toBeGreaterThanOrEqual(2);

    // Exactly one place was attempted. The second transact only files the report.
    const transacts = send.mock.calls.filter(([command]) =>
      Array.isArray(command.input.TransactItems),
    );
    expect(transacts.filter(([command]) => placeCreate(command.input))).toHaveLength(1);
    expect(transacts).toHaveLength(2);
    expect(call).toBeGreaterThan(1);
  });

  it("refuses to merge a lock holder outside the match radius", async () => {
    // Opposite corners of one geo cell: 42.6 m apart, so past the 40 m match
    // radius, so two places. The cell lock alone would have merged them.
    const pin = { lat: 18.929541, lng: 72.832621 };
    const far = { ...WINNER_LOCATION, lat: 18.929819, lng: 72.832899 };
    expect(placeLockKey(input({ lat: far.lat, lng: far.lng })).pk).toBe(
      placeLockKey(input(pin)).pk,
    );
    expect(metersBetween(pin.lat, pin.lng, far.lat, far.lng)).toBeGreaterThan(MATCH_METERS);

    let transacts = 0;
    send.mockImplementation(async (command: { input: Record<string, unknown> }) => {
      if (Array.isArray(command.input.TransactItems)) {
        transacts += 1;
        if (transacts === 1) throw cancelled();
        return {};
      }
      if (command.input.ConsistentRead === true) {
        const key = command.input.Key as { pk: string };
        if (key.pk.startsWith("PLACE#")) return { Item: placeLockItem(input(pin), "loc_winner") };
        if (key.pk === "LOC#loc_winner") return { Item: far };
      }
      return { Items: [] };
    });

    const result = await new DynamoRastabaazRepository().createReport(input(pin));

    expect(result.location.id).not.toBe("loc_winner");
    expect(result.connectedCount).toBe(0);

    // It must still lock, just on the next slot. Writing unlocked here would
    // let two concurrent reports at this second spot each mint a place.
    const retry = send.mock.calls
      .map(([command]) => command.input)
      .filter((candidate) => Array.isArray(candidate.TransactItems))[1];
    const pks = retry.TransactItems.map(
      (entry: { Put: { Item: { pk: string } } }) => entry.Put.Item.pk,
    );
    expect(pks).toContain(placeLockKey(input(pin), 1).pk);
    expect(placeLockKey(input(pin), 1).pk).not.toBe(placeLockKey(input(pin)).pk);
  });

  it("contends on one slot when two writers hit the same second spot", async () => {
    // Both writers are pushed off slot 0 by the same far holder, so both try
    // slot 1. They collide there, which is the point: one wins, one joins.
    const pin = { lat: 18.929541, lng: 72.832621 };
    const near = { ...WINNER_LOCATION, id: "loc_second", lat: pin.lat, lng: pin.lng };
    const far = { ...WINNER_LOCATION, lat: 18.929819, lng: 72.832899 };

    send.mockImplementation(async (command: { input: Record<string, unknown> }) => {
      if (placeCreate(command.input)) throw cancelled();
      if (Array.isArray(command.input.TransactItems)) return {};
      if (command.input.ConsistentRead === true) {
        const key = command.input.Key as { pk: string };
        if (key.pk === placeLockKey(input(pin)).pk) {
          return { Item: placeLockItem(input(pin), "loc_winner") };
        }
        if (key.pk === placeLockKey(input(pin), 1).pk) {
          return { Item: placeLockItem(input(pin), "loc_second", 1) };
        }
        if (key.pk === "LOC#loc_winner") return { Item: far };
        if (key.pk === "LOC#loc_second") return { Item: near };
      }
      return { Items: [] };
    });

    const result = await new DynamoRastabaazRepository().createReport(input(pin));

    // Joined the slot-1 holder rather than minting a third place.
    expect(result.location.id).toBe("loc_second");
  });

  it("stays on the same slot when the slug collided but the lock is free", async () => {
    // The cancel is a slug clash, not a place clash. Advancing the slot here
    // would leave slot 0 empty with a real place on slot 1, and the next writer
    // would take the empty slot and mint the duplicate the lock exists to stop.
    let transacts = 0;
    send.mockImplementation(async (command: { input: Record<string, unknown> }) => {
      if (Array.isArray(command.input.TransactItems)) {
        transacts += 1;
        if (transacts === 1) throw cancelled();
        return {};
      }
      // Every place lock is free: nobody holds this cell.
      if (command.input.ConsistentRead === true) return { Item: undefined };
      return { Items: [] };
    });

    const result = await new DynamoRastabaazRepository().createReport(input());

    const retry = send.mock.calls
      .map(([command]) => command.input)
      .filter((candidate) => Array.isArray(candidate.TransactItems))[1];
    const pks = retry.TransactItems.map(
      (entry: { Put: { Item: { pk: string } } }) => entry.Put.Item.pk,
    );

    expect(pks).toContain(placeLockKey(input()).pk);
    expect(pks).not.toContain(placeLockKey(input(), 1).pk);
    expect(result.location.slug).toMatch(/-[a-z0-9]{8}$/);
  });

  it("surfaces a throttled transact instead of retrying it as a collision", async () => {
    // Cancellation covers throttling, capacity and validation as well as a lost
    // race. Treating those as collisions burned the slot walk and ended in an
    // unlocked write, so a recovered service would mint an unprotected place.
    let transacts = 0;
    send.mockImplementation(async (command: { input: Record<string, unknown> }) => {
      if (Array.isArray(command.input.TransactItems)) {
        transacts += 1;
        throw throttled();
      }
      return { Items: [] };
    });

    await expect(new DynamoRastabaazRepository().createReport(input())).rejects.toThrow(
      /transaction cancelled/,
    );
    expect(transacts).toBe(1);
  });

  it("falls back to a fresh slug when no lock holder exists", async () => {
    let transacts = 0;
    send.mockImplementation(async (command: { input: Record<string, unknown> }) => {
      if (Array.isArray(command.input.TransactItems)) {
        transacts += 1;
        if (transacts === 1) throw cancelled();
        return {};
      }
      if (command.input.ConsistentRead === true) return { Item: undefined };
      return { Items: [] };
    });

    const result = await new DynamoRastabaazRepository().createReport(input());

    // The slug, not the place, was the conflict: a new place is correct here.
    expect(transacts).toBe(2);
    expect(result.location.slug).toMatch(/-[a-z0-9]{8}$/);
    expect(result.connectedCount).toBe(0);
  });
});
