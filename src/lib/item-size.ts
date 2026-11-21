import { MAX_DYNAMO_ITEM_BYTES } from "@/lib/photo-limits";

export function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function dynamoItemByteLength(item: Record<string, unknown>): number {
  return utf8Bytes(JSON.stringify(item));
}

export function assertItemSize(item: Record<string, unknown>): void {
  if (dynamoItemByteLength(item) > MAX_DYNAMO_ITEM_BYTES) {
    throw new Error("This record is too large to store.");
  }
}
