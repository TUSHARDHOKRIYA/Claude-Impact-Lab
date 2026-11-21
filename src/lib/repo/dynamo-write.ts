import { ConditionalCheckFailedException, TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
  type DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { locationPk, reportPk } from "@/lib/repo/keys";
import { toSeedMarkerItem, type DynamoItem } from "@/lib/repo/mappers";
import { SEED_EDITABLE_FIELDS } from "@/lib/repo/port";
import type { LocationRecord, ReportRecord, SeedReport } from "@/lib/types";

export const EXISTS = "attribute_not_exists(pk)";

/**
 * A strongly consistent read of the main table. Used after a cancelled transact
 * to learn who won a contested lock; the secondary indexes cannot answer that
 * because their reads are eventually consistent.
 */
export async function getConsistent(
  client: DynamoDBDocumentClient,
  table: string,
  pk: string,
  sk: string,
): Promise<DynamoItem | null> {
  const result = await client.send(
    new GetCommand({ TableName: table, Key: { pk, sk }, ConsistentRead: true }),
  );
  return (result.Item as DynamoItem | undefined) ?? null;
}

export async function putItem(
  client: DynamoDBDocumentClient,
  table: string,
  item: DynamoItem,
  condition?: string,
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: table,
      Item: item,
      ...(condition ? { ConditionExpression: condition } : {}),
    }),
  );
}

export async function putIfAbsent(
  client: DynamoDBDocumentClient,
  table: string,
  item: DynamoItem,
): Promise<boolean> {
  try {
    await putItem(client, table, item, EXISTS);
    return true;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) return false;
    throw error;
  }
}

/**
 * Gives an already-stored location the issue type it was written without.
 *
 * A location row from before the field existed matches no report, so the next
 * report at that spot starts a second place beside it. Seed writes are
 * otherwise insert-only, which would leave those rows that way forever; this
 * is the one field a re-seed is allowed to repair, and only when it is absent,
 * so a later correction at the desk is never overwritten.
 */
export async function repairLocationIssueType(
  client: DynamoDBDocumentClient,
  table: string,
  record: LocationRecord,
): Promise<boolean> {
  try {
    await client.send(
      new UpdateCommand({
        TableName: table,
        Key: { pk: locationPk(record.id), sk: "META" },
        UpdateExpression: "SET issueType = :issueType",
        ConditionExpression: "attribute_exists(pk) AND attribute_not_exists(issueType)",
        ExpressionAttributeValues: { ":issueType": record.issueType },
      }),
    );
    return true;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) return false;
    throw error;
  }
}

/** PHOTO item, or the photo attribute a row stored before photos had their own item. */
async function storedPhoto(
  client: DynamoDBDocumentClient,
  table: string,
  id: string,
): Promise<string | null> {
  const photo = await getConsistent(client, table, reportPk(id), "PHOTO");
  if (typeof photo?.photo === "string") return photo.photo;
  const meta = await getConsistent(client, table, reportPk(id), "META");
  return typeof meta?.photo === "string" ? meta.photo : null;
}

/**
 * Removes a report an earlier seed wrote and the current one has retired, but
 * only while it is still the seed's: no desk note points at it, and every
 * field the desk can edit still reads as seeded. Anything else is the desk's
 * record now and stays. Returns whether a row was removed.
 *
 * Only the seed calls this, and the seed runs from the operator's CLI, never
 * from the Amplify role, which is why the compute policy grants no DeleteItem.
 */
export async function retireSeedReport(
  client: DynamoDBDocumentClient,
  table: string,
  seeded: SeedReport,
): Promise<boolean> {
  const notes = await client.send(
    new QueryCommand({
      TableName: table,
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :pk AND begins_with(gsi1sk, :upd)",
      ExpressionAttributeValues: { ":pk": reportPk(seeded.id), ":upd": "UPD#" },
      Limit: 1,
    }),
  );
  if ((notes.Count ?? 0) > 0) return false;
  if ((await storedPhoto(client, table, seeded.id)) !== seeded.photo) return false;
  const names = Object.fromEntries(SEED_EDITABLE_FIELDS.map((field) => [`#${field}`, field]));
  const values = Object.fromEntries(SEED_EDITABLE_FIELDS.map((field) => [`:${field}`, seeded[field]]));
  try {
    await client.send(
      new DeleteCommand({
        TableName: table,
        Key: { pk: reportPk(seeded.id), sk: "META" },
        ConditionExpression: ["attribute_exists(pk)", ...SEED_EDITABLE_FIELDS.map((f) => `#${f} = :${f}`)].join(" AND "),
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }),
    );
    await client.send(new DeleteCommand({ TableName: table, Key: { pk: reportPk(seeded.id), sk: "PHOTO" } }));
    return true;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) return false;
    throw error;
  }
}

export async function putSeedMarkerVersion(
  client: DynamoDBDocumentClient,
  table: string,
  version: string,
): Promise<boolean> {
  try {
    await client.send(
      new PutCommand({
        TableName: table,
        Item: toSeedMarkerItem(version),
        ConditionExpression: "attribute_not_exists(pk) OR #version <> :version",
        ExpressionAttributeNames: { "#version": "version" },
        ExpressionAttributeValues: { ":version": version },
      }),
    );
    return true;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) return false;
    throw error;
  }
}

/**
 * A write that rides inside someone else's transact.
 *
 * `put` creates a new item and fails if the key is taken. `update` edits an
 * item that already exists, which a Put cannot do here because every Put in
 * this file is guarded by `EXISTS`. Both exist so a caller can make its own
 * write atomic with a place creation instead of following it with a second
 * request that can fail on its own.
 */
export type UpdateOp = {
  update: {
    key: { pk: string; sk: string };
    set: string;
    values: Record<string, unknown>;
    /** Omitted when the update should create the item if it is not there yet. */
    condition?: string;
  };
};

export type TransactOp = { put: DynamoItem } | UpdateOp;

export async function transactWrite(
  client: DynamoDBDocumentClient,
  table: string,
  ops: TransactOp[],
): Promise<void> {
  await client.send(
    new TransactWriteCommand({
      TransactItems: ops.map((op) =>
        "put" in op
          ? { Put: { TableName: table, Item: op.put, ConditionExpression: EXISTS } }
          : {
              Update: {
                TableName: table,
                Key: op.update.key,
                UpdateExpression: op.update.set,
                ExpressionAttributeValues: op.update.values,
                ...(op.update.condition ? { ConditionExpression: op.update.condition } : {}),
              },
            },
      ),
    }),
  );
}

/** Replaces the photo. An update with no condition creates the PHOTO item. */
export function photoUpdateOp(id: string, photo: string): UpdateOp {
  return {
    update: {
      key: { pk: reportPk(id), sk: "PHOTO" },
      set: "SET photo = :photo",
      values: { ":photo": photo },
    },
  };
}

/**
 * True when the report META condition rejected the write, so the caller
 * returns the same `null` a missing report used to.
 */
export function reportEditRejected(error: unknown): boolean {
  if (error instanceof ConditionalCheckFailedException) return true;
  if (!(error instanceof TransactionCanceledException)) return false;
  const failed = (error.CancellationReasons ?? [])
    .map((reason, index) => ({ code: reason.Code ?? "None", index }))
    .filter((reason) => reason.code !== "None");
  return failed.length === 1 && failed[0]?.code === "ConditionalCheckFailed" && failed[0].index === 0;
}

/**
 * The desk's edit to one report. One definition, because the edit is issued
 * two ways: on its own when the report stays where it is, and inside a place
 * transact when the edit moves it to a place that has to be created. Two
 * copies of this expression would be two chances to drift.
 */
export function reportEditOp(next: ReportRecord): UpdateOp {
  return {
    update: {
      key: { pk: reportPk(next.id), sk: "META" },
      set: "SET issueType = :issueType, description = :description, recurs = :recurs, isSample = :isSample, locationId = :locationId, gsi1pk = :gsi1pk",
      values: {
        ":issueType": next.issueType,
        ":isSample": next.isSample,
        ":description": next.description,
        ":recurs": next.recurs,
        ":locationId": next.locationId,
        ":gsi1pk": locationPk(next.locationId),
      },
      condition: "attribute_exists(pk)",
    },
  };
}
