import { afterEach, describe, expect, it } from "vitest";
import { ConditionalCheckFailedException, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";

import { writeSeedItems } from "@/lib/repo/dynamo-seed";
import type { SeedItem } from "@/lib/repo/port";
import { seedRoads } from "@/lib/seed-roads";

const ddbMock = mockClient(DynamoDBDocumentClient);

afterEach(() => {
  ddbMock.reset();
});

function firstSeedReport(): SeedItem {
  const item = seedRoads().find((row) => row.entity === "report");
  if (!item || item.entity !== "report") throw new Error("seed report missing");
  return item;
}

function client() {
  return DynamoDBDocumentClient.from(new DynamoDBClient({ region: "ap-south-1" }));
}

function photoPuts() {
  return ddbMock.commandCalls(PutCommand).filter((call) => call.args[0].input.Item?.sk === "PHOTO");
}

describe("re-seeding a report photo", () => {
  it("writes the seed photo when the report insert is new", async () => {
    ddbMock.on(PutCommand).resolves({});
    await writeSeedItems(client(), "rastabaaz-test", [firstSeedReport()]);
    expect(photoPuts()).toHaveLength(1);
  });

  it("does not replace a PHOTO item that is already stored", async () => {
    ddbMock.on(PutCommand).rejects(new ConditionalCheckFailedException({ message: "exists", $metadata: {} }));
    ddbMock.on(GetCommand).resolves({ Item: { pk: "RPT#x", sk: "META", type: "report" } });
    await expect(writeSeedItems(client(), "rastabaaz-test", [firstSeedReport()])).resolves.toBeUndefined();
    for (const call of photoPuts()) {
      expect(call.args[0].input.ConditionExpression).toBe("attribute_not_exists(pk)");
    }
  });

  it("restores a PHOTO item an earlier run failed to write", async () => {
    ddbMock.on(PutCommand).callsFake((input) => {
      const isPhoto = input.Item?.sk === "PHOTO";
      return isPhoto ? Promise.resolve({}) : Promise.reject(new ConditionalCheckFailedException({ message: "exists", $metadata: {} }));
    });
    ddbMock.on(GetCommand).resolves({ Item: { pk: "RPT#x", sk: "META", type: "report" } });
    await writeSeedItems(client(), "rastabaaz-test", [firstSeedReport()]);
    expect(photoPuts()).toHaveLength(1);
  });
});
