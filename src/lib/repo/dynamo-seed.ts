import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { UpdateCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SAMPLE_PHOTO_PATTERN } from "@/lib/photo-limits";
import {
  getConsistent,
  putIfAbsent,
  repairLocationIssueType,
  retireSeedReport,
} from "@/lib/repo/dynamo-write";
import { reportPk } from "@/lib/repo/keys";
import { assertWritePhoto, guardItemSize, seedToItem, slugLockItem, toPhotoItem, type DynamoItem } from "@/lib/repo/mappers";
import { placeLockItem } from "@/lib/repo/place-lock";
import type { SeedItem } from "@/lib/repo/port";
import { PREVIOUS_SEED_DESCRIPTIONS } from "@/lib/seed/previous-copy";
import type { SeedReport } from "@/lib/types";

export async function writeSeedItems(
  client: DynamoDBDocumentClient,
  table: string,
  items: SeedItem[],
): Promise<void> {
  for (const item of items) {
    if (item.entity === "retire_report") {
      await retireSeedReport(client, table, item.record);
      continue;
    }
    if (item.entity === "report") {
      assertWritePhoto(item.record.photo, true);
      const meta = seedToItem(item);
      const photo = toPhotoItem(item.record.id, item.record.photo);
      guardItemSize(meta);
      guardItemSize(photo);
      if (await putIfAbsent(client, table, meta)) {
        await putIfAbsent(client, table, photo);
        continue;
      }
      // The report is already stored. A legacy row keeps its photo on META,
      // possibly edited at the desk, so it is left alone. Any other row gets
      // its PHOTO item back if an earlier run failed to write it; putIfAbsent
      // never replaces a PHOTO item that is there.
      const held = await getConsistent(client, table, String(meta.pk), "META");
      if (held && typeof held.photo !== "string") await putIfAbsent(client, table, photo);
      await repairStoredSeedReport(client, table, item.record, held);
      continue;
    }
    const dynamoItem = seedToItem(item);
    guardItemSize(dynamoItem);
    const fresh = await putIfAbsent(client, table, dynamoItem);
    if (item.entity === "location") {
      // A row seeded before issueType was a field is skipped by the insert
      // above and would keep matching nothing, so repair it instead.
      if (!fresh) await repairLocationIssueType(client, table, item.record);
      await putIfAbsent(client, table, slugLockItem(item.record.slug, item.record.id));
      // Without this a gsi2 miss at a seeded pin mints a place beside it.
      await putIfAbsent(client, table, placeLockItem(item.record, item.record.id));
    }
  }
}

async function updateIf(
  client: DynamoDBDocumentClient,
  table: string,
  input: {
    Key: { pk: string; sk: string };
    UpdateExpression: string;
    ConditionExpression: string;
    ExpressionAttributeValues: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await client.send(new UpdateCommand({ TableName: table, ...input }));
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) return;
    throw error;
  }
}

/**
 * Seed writes are insert-only, so a row already stored keeps a description or
 * an illustration flag the previous seed left behind. Each repair is conditional
 * on the previous value, so a desk edit is not overwritten.
 */
async function repairStoredSeedReport(
  client: DynamoDBDocumentClient,
  table: string,
  record: SeedReport,
  held: DynamoItem | null,
): Promise<void> {
  const previous = PREVIOUS_SEED_DESCRIPTIONS[record.id];
  if (previous !== undefined) {
    await updateIf(client, table, {
      Key: { pk: reportPk(record.id), sk: "META" },
      UpdateExpression: "SET description = :new",
      ConditionExpression: "description = :old",
      ExpressionAttributeValues: { ":new": record.description, ":old": previous },
    });
  }
  if (!record.isSample) return;
  const photoItem = await getConsistent(client, table, reportPk(record.id), "PHOTO");
  const legacy = typeof held?.photo === "string" ? held.photo : null;
  const photo = typeof photoItem?.photo === "string" ? photoItem.photo : legacy;
  if (typeof photo !== "string" || SAMPLE_PHOTO_PATTERN.test(photo)) return;
  await updateIf(client, table, {
    Key: { pk: reportPk(record.id), sk: "META" },
    UpdateExpression: "SET isSample = :false",
    ConditionExpression: "isSample = :true",
    ExpressionAttributeValues: { ":false": false, ":true": true },
  });
}
