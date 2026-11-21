import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { fromLocationItem } from "@/lib/repo/mappers";
import { recoverIssueType } from "@/lib/repo/legacy";
import { MemoryKhabarRepository } from "@/lib/repo/memory";
import type { LocationRecord } from "@/lib/types";

const send = vi.fn();

vi.mock("@/lib/repo/dynamo-client", () => ({
  getDocClient: () => ({ send }),
  getTableName: () => "khabar-test",
}));

let DynamoKhabarRepository: typeof import("@/lib/repo/dynamo").DynamoKhabarRepository;
let ConditionalCheckFailedException: typeof import("@aws-sdk/client-dynamodb").ConditionalCheckFailedException;

/** A location row as it was written before issueType was a field. */
function legacyItem(name: string) {
  return {
    pk: "LOC#loc_legacy",
    sk: "META",
    type: "location",
    id: "loc_legacy",
    name,
    slug: "kala-ghoda-waste",
    lat: 18.9298,
    lng: 72.8328,
    street: "Kala Ghoda",
    ward: "A Ward",
    createdAt: "2026-09-01T00:00:00.000Z",
  };
}

/**
 * A place is one problem at one spot, so a location with no issue type matches
 * no report and the next report there starts a duplicate place beside it.
 * Rows written before the field existed have to end up with one.
 */
describe("a location written before issueType was a field", () => {
  it("recovers the problem from the name a citizen place was given", () => {
    expect(fromLocationItem(legacyItem("Waste at Kala Ghoda")).issueType).toBe("waste");
    expect(fromLocationItem(legacyItem("Footpath near Rampart Row")).issueType).toBe("footpath");
    // Multi-word labels survive, and so does a street that reads like one.
    expect(recoverIssueType("Parking and vehicle occupation near Rampart Row")).toBe(
      "parking_and_vehicle_occupation",
    );
    expect(recoverIssueType("Obstruction and encroachment at Kala Ghoda")).toBe(
      "obstruction_and_encroachment",
    );
  });

  it("does not guess when the name is not one the app generated", () => {
    // Seeded places carry hand-written names. Inventing a problem for them
    // would be a worse lie than matching nothing; the seed repairs those.
    expect(recoverIssueType("K Dubash Marg footpath, Kala Ghoda Part 2")).toBe("");
  });

  it("keeps the stored field when there is one", () => {
    const item = { ...legacyItem("Waste at Kala Ghoda"), issueType: "road" };
    expect(fromLocationItem(item).issueType).toBe("road");
  });
});

describe("re-seeding a table seeded before issueType was a field", () => {
  beforeAll(async () => {
    ({ ConditionalCheckFailedException } = await import("@aws-sdk/client-dynamodb"));
    ({ DynamoKhabarRepository } = await import("@/lib/repo/dynamo"));
  });

  beforeEach(() => {
    send.mockReset();
  });

  function seededLocation(): LocationRecord {
    return {
      id: "loc_k_dubash",
      name: "K Dubash Marg footpath, Kala Ghoda Part 2",
      slug: "k-dubash-marg-footpath",
      issueType: "footpath",
      lat: 18.9298,
      lng: 72.8328,
      street: "K Dubash Marg",
      ward: "A Ward",
      createdAt: "2022-08-18",
    };
  }

  it("repairs the held row instead of skipping it", async () => {
    // Seed writes are insert-only, so the row already there wins and keeps its
    // old shape. That is the whole bug: without a repair it stays unmatched.
    send.mockImplementation(async (command: { input: Record<string, unknown> }) => {
      if (command.input.ConditionExpression === "attribute_not_exists(pk)") {
        throw new ConditionalCheckFailedException({ message: "exists", $metadata: {} });
      }
      return {};
    });

    await new DynamoKhabarRepository().putSeedItems([
      { entity: "location", record: seededLocation() },
    ]);

    const repair = send.mock.calls
      .map(([command]) => command.input as Record<string, unknown>)
      .find((candidate) => candidate.UpdateExpression === "SET issueType = :issueType");

    expect(repair).toBeDefined();
    expect(repair?.Key).toEqual({ pk: "LOC#loc_k_dubash", sk: "META" });
    expect(repair?.ExpressionAttributeValues).toEqual({ ":issueType": "footpath" });
    // Never overwrites a type the desk already corrected.
    expect(repair?.ConditionExpression).toBe(
      "attribute_exists(pk) AND attribute_not_exists(issueType)",
    );
  });

  it("does not touch a row it just wrote", async () => {
    send.mockResolvedValue({});

    await new DynamoKhabarRepository().putSeedItems([
      { entity: "location", record: seededLocation() },
    ]);

    const updates = send.mock.calls
      .map(([command]) => command.input as Record<string, unknown>)
      .filter((candidate) => candidate.UpdateExpression);
    expect(updates).toHaveLength(0);
  });

  it("repairs the same way in memory", async () => {
    const repo = new MemoryKhabarRepository({ strictPhoto: false });
    const stale = { ...seededLocation(), issueType: "" as LocationRecord["issueType"] };
    await repo.putSeedItems([{ entity: "location", record: stale }]);
    expect((await repo.getLocation("loc_k_dubash"))?.issueType).toBe("");

    await repo.putSeedItems([{ entity: "location", record: seededLocation() }]);

    expect((await repo.getLocation("loc_k_dubash"))?.issueType).toBe("footpath");
  });
});
