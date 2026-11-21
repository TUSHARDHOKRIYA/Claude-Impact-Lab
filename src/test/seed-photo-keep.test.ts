import { afterEach, describe, expect, it } from "vitest";
import { ConditionalCheckFailedException, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";

import { writeSeedItems } from "@/lib/repo/dynamo-seed";
import { MemoryKhabarRepository } from "@/lib/repo/memory";
import { PREVIOUS_SEED_DESCRIPTIONS } from "@/lib/seed/previous-copy";
import { seedPaving } from "@/lib/seed-paving";

const ddbMock = mockClient(DynamoDBDocumentClient);

afterEach(() => {
  ddbMock.reset();
});

function pavingReport(id = "rpt_paving_202208") {
  const item = seedPaving().find((row) => row.entity === "report" && row.record.id === id);
  if (!item || item.entity !== "report") throw new Error("paving report missing");
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
    await writeSeedItems(client(), "khabar-test", [pavingReport()]);
    expect(photoPuts()).toHaveLength(1);
  });

  it("does not replace a PHOTO item that is already stored", async () => {
    // Both items exist: the META insert and the conditional PHOTO insert both
    // fail their condition, and the run carries on without overwriting.
    ddbMock.on(PutCommand).rejects(new ConditionalCheckFailedException({ message: "exists", $metadata: {} }));
    ddbMock.on(GetCommand).resolves({ Item: { pk: "RPT#x", sk: "META", type: "report" } });
    await expect(writeSeedItems(client(), "khabar-test", [pavingReport()])).resolves.toBeUndefined();
    for (const call of photoPuts()) {
      expect(call.args[0].input.ConditionExpression).toBe("attribute_not_exists(pk)");
    }
  });

  it("restores a PHOTO item an earlier run failed to write", async () => {
    ddbMock.on(PutCommand).callsFake((input) => {
      if (input.Item?.sk === "META") {
        throw new ConditionalCheckFailedException({ message: "exists", $metadata: {} });
      }
      return {};
    });
    // Stored META without a legacy photo: the PHOTO item is what is missing.
    ddbMock.on(GetCommand).resolves({ Item: { pk: "RPT#x", sk: "META", type: "report" } });
    await writeSeedItems(client(), "khabar-test", [pavingReport()]);
    expect(photoPuts()).toHaveLength(1);
    expect(photoPuts()[0].args[0].input.ConditionExpression).toBe("attribute_not_exists(pk)");
  });

  it("leaves a legacy row's META photo alone", async () => {
    ddbMock.on(PutCommand).callsFake((input) => {
      if (input.Item?.sk === "META") {
        throw new ConditionalCheckFailedException({ message: "exists", $metadata: {} });
      }
      return {};
    });
    ddbMock.on(GetCommand).resolves({ Item: { pk: "RPT#x", sk: "META", photo: "data:image/jpeg;base64,edited" } });
    ddbMock.on(UpdateCommand).resolves({});
    await writeSeedItems(client(), "khabar-test", [pavingReport()]);
    expect(photoPuts()).toHaveLength(0);
  });

  it("keeps an edited photo in memory", async () => {
    const repo = new MemoryKhabarRepository({ strictPhoto: false });
    const seeded = pavingReport();
    await repo.putSeedItems([seeded]);
    await repo.updateReport({ id: seeded.record.id, photo: "data:image/jpeg;base64,edited" });
    await repo.putSeedItems([seeded]);
    expect(await repo.getReportPhoto(seeded.record.id)).toBe("data:image/jpeg;base64,edited");
  });
});

function alreadyStored() {
  ddbMock.on(PutCommand).rejects(new ConditionalCheckFailedException({ message: "exists", $metadata: {} }));
}

describe("repairs on a report the previous seed already stored", () => {
  it("sets the new description only while the stored text is still the previous seed", async () => {
    alreadyStored();
    ddbMock.on(GetCommand).resolves({ Item: { photo: "/samples/paving.svg" } });
    ddbMock.on(UpdateCommand).resolves({});
    const report = pavingReport("rpt_paving_202509");
    await writeSeedItems(client(), "khabar-test", [report]);
    const updates = ddbMock.commandCalls(UpdateCommand);
    expect(updates).toHaveLength(1);
    expect(updates[0].args[0].input.ConditionExpression).toBe("description = :old");
    expect(updates[0].args[0].input.UpdateExpression).toBe("SET description = :new");
    expect(updates[0].args[0].input.ExpressionAttributeValues).toEqual({
      ":new": report.record.description,
      ":old": PREVIOUS_SEED_DESCRIPTIONS.rpt_paving_202509,
    });
  });

  it("does not follow a failed description condition with another write", async () => {
    alreadyStored();
    ddbMock.on(GetCommand).resolves({ Item: { photo: "/samples/paving.svg" } });
    ddbMock.on(UpdateCommand).rejects(new ConditionalCheckFailedException({ message: "differs", $metadata: {} }));
    await expect(writeSeedItems(client(), "khabar-test", [pavingReport("rpt_paving_202509")])).resolves.toBeUndefined();
    const updates = ddbMock.commandCalls(UpdateCommand);
    expect(updates).toHaveLength(1);
    expect(updates[0].args[0].input.ConditionExpression).toBe("description = :old");
  });

  it("clears isSample when the stored photo is no longer an illustration", async () => {
    alreadyStored();
    ddbMock.on(GetCommand).resolves({ Item: { photo: "data:image/jpeg;base64,desk" } });
    ddbMock.on(UpdateCommand).resolves({});
    await writeSeedItems(client(), "khabar-test", [pavingReport()]);
    const updates = ddbMock.commandCalls(UpdateCommand);
    expect(updates).toHaveLength(1);
    expect(updates[0].args[0].input.UpdateExpression).toBe("SET isSample = :false");
    expect(updates[0].args[0].input.ConditionExpression).toBe("isSample = :true");
    expect(updates[0].args[0].input.ExpressionAttributeValues).toEqual({ ":false": false, ":true": true });
  });

  it("does not follow a failed isSample condition with another write", async () => {
    alreadyStored();
    ddbMock.on(GetCommand).resolves({ Item: { photo: "data:image/jpeg;base64,desk" } });
    ddbMock.on(UpdateCommand).rejects(new ConditionalCheckFailedException({ message: "flag", $metadata: {} }));
    await expect(writeSeedItems(client(), "khabar-test", [pavingReport()])).resolves.toBeUndefined();
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(1);
    expect(ddbMock.commandCalls(UpdateCommand)[0].args[0].input.ConditionExpression).toBe("isSample = :true");
  });

  it("leaves isSample set while the photo is still an illustration", async () => {
    alreadyStored();
    ddbMock.on(GetCommand).resolves({ Item: { photo: "/samples/paving.svg" } });
    ddbMock.on(UpdateCommand).resolves({});
    await writeSeedItems(client(), "khabar-test", [pavingReport()]);
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });
});
