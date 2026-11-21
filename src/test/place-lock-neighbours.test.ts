import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { MATCH_METERS, metersBetween } from "@/lib/geo";
import { placeLockItem, placeLockKey } from "@/lib/repo/place-lock";
import type { CreateReportInput } from "@/lib/types";

import { sampleJpegDataUrl } from "./sample-jpeg";

const send = vi.fn();

vi.mock("@/lib/repo/dynamo-client", () => ({
  getDocClient: () => ({ send }),
  getTableName: () => "rastabaaz-test",
}));

let DynamoRastabaazRepository: typeof import("@/lib/repo/dynamo").DynamoRastabaazRepository;

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

/**
 * The nearby query is eventually consistent; the place lock is not. Before
 * creating a place, the neighbouring cells' locks are read consistently so a
 * place the index has not caught up with is joined rather than duplicated.
 */
function placeCreate(input: Record<string, unknown>): boolean {
  const items = input.TransactItems as { Put?: { Item?: { type?: string } } }[] | undefined;
  return Array.isArray(items) && items.some((entry) => entry.Put?.Item?.type === "location");
}

describe("the neighbour lock probe", () => {
  beforeAll(async () => {
    ({ DynamoRastabaazRepository } = await import("@/lib/repo/dynamo"));
  });

  beforeEach(() => {
    send.mockReset();
  });

  it("joins a place the index has not caught up with when its lock sits in the next cell", async () => {
    // Two pins 9 m apart across a cell boundary: different locks, one place.
    const pin = { lat: 18.92986, lng: 72.8328 };
    const at = { lat: 18.92978, lng: 72.8328 };
    expect(placeLockKey(input(pin)).pk).not.toBe(placeLockKey(input(at)).pk);
    expect(metersBetween(pin.lat, pin.lng, at.lat, at.lng)).toBeLessThan(MATCH_METERS);
    send.mockImplementation(async (command: { input: Record<string, unknown> }) => {
      if (placeCreate(command.input)) throw new Error("must not create a second place");
      if (Array.isArray(command.input.TransactItems)) return {};
      const key = command.input.Key as { pk: string } | undefined;
      if (key?.pk === placeLockKey(input(at)).pk) return { Item: placeLockItem(input(at), "loc_winner") };
      if (key?.pk === "LOC#loc_winner") return { Item: { ...WINNER_LOCATION, ...at } };
      return { Item: undefined, Items: [] }; // gsi2 has not indexed the winner yet
    });

    const result = await new DynamoRastabaazRepository().createReport(input(pin));

    expect(result.location.id).toBe("loc_winner");
    expect(result.report.locationId).toBe("loc_winner");
  });

  it("walks a neighbour cell's later slots when its first holder is a different spot", async () => {
    const pin = { lat: 18.92986, lng: 72.8328 };
    const at = { lat: 18.92978, lng: 72.8328 };
    // Slot 0 next door is held by a spot 43 m off; the matching place sits on slot 1.
    const far = { ...WINNER_LOCATION, id: "loc_far", pk: "LOC#loc_far", lat: 18.92955, lng: 72.83252 };
    expect(metersBetween(pin.lat, pin.lng, far.lat, far.lng)).toBeGreaterThan(MATCH_METERS);
    send.mockImplementation(async (command: { input: Record<string, unknown> }) => {
      if (placeCreate(command.input)) throw new Error("must not create a second place");
      if (Array.isArray(command.input.TransactItems)) return {};
      const key = command.input.Key as { pk: string } | undefined;
      if (key?.pk === placeLockKey(input(at), 0).pk) return { Item: placeLockItem(input(at), "loc_far", 0) };
      if (key?.pk === placeLockKey(input(at), 1).pk) return { Item: placeLockItem(input(at), "loc_winner", 1) };
      if (key?.pk === "LOC#loc_far") return { Item: far };
      if (key?.pk === "LOC#loc_winner") return { Item: { ...WINNER_LOCATION, ...at } };
      return { Item: undefined, Items: [] };
    });

    const result = await new DynamoRastabaazRepository().createReport(input(pin));

    expect(result.location.id).toBe("loc_winner");
  });
});
