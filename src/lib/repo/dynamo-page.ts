import { QueryCommand, ScanCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { catalogScanInput, type DynamoItem } from "@/lib/repo/mappers";

type Page = { Items?: unknown[]; LastEvaluatedKey?: Record<string, unknown> };

async function page(sendPage: (key?: Record<string, unknown>) => Promise<Page>): Promise<DynamoItem[]> {
  const items: DynamoItem[] = [];
  let key: Record<string, unknown> | undefined;
  do {
    const result = await sendPage(key);
    items.push(...((result.Items ?? []) as DynamoItem[]));
    key = result.LastEvaluatedKey;
  } while (key);
  return items;
}

export function queryAll(
  client: DynamoDBDocumentClient,
  table: string,
  params: {
    IndexName?: string;
    KeyConditionExpression: string;
    ExpressionAttributeValues: Record<string, unknown>;
    ProjectionExpression?: string;
    ExpressionAttributeNames?: Record<string, string>;
  },
): Promise<DynamoItem[]> {
  return page((ExclusiveStartKey) => client.send(new QueryCommand({ TableName: table, ...params, ExclusiveStartKey })));
}

export function scanMeta(client: DynamoDBDocumentClient, table: string): Promise<DynamoItem[]> {
  return page((ExclusiveStartKey) =>
    client.send(new ScanCommand({ TableName: table, ...catalogScanInput(), ExclusiveStartKey })),
  );
}
