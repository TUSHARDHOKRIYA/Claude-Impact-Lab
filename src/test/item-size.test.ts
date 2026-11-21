import { describe, expect, it } from "vitest";
import { dynamoItemByteLength, utf8Bytes } from "@/lib/item-size";
import { MAX_DYNAMO_ITEM_BYTES } from "@/lib/photo-limits";

describe("dynamoItemByteLength", () => {
  it("counts utf-8 bytes of serialized attributes", () => {
    expect(utf8Bytes("café")).toBe(5);
    const length = dynamoItemByteLength({ pk: "RPT#1", photo: "x".repeat(100) });
    expect(length).toBeGreaterThan(100);
    expect(length).toBeLessThan(MAX_DYNAMO_ITEM_BYTES);
  });
});
