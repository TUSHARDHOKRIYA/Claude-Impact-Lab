import { describe, expect, it } from "vitest";
import { encodeWithinLimit, fitWithinEdge } from "@/lib/photo-compress";
import { MAX_ENCODED_PHOTO_BYTES } from "@/lib/photo-limits";

describe("fitWithinEdge", () => {
  it("scales a 4000x3000 frame to 1280 on the long edge", () => {
    expect(fitWithinEdge(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
  });
});

describe("encodeWithinLimit", () => {
  it("returns the first data url under the byte cap", async () => {
    const encode = async (_w: number, _h: number, quality: number) => {
      const size = quality > 0.5 ? MAX_ENCODED_PHOTO_BYTES + 10 : 1200;
      return `data:image/jpeg;base64,${"B".repeat(size - 23)}`;
    };
    const result = await encodeWithinLimit(encode, 2000, 1500);
    expect(result.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(new TextEncoder().encode(result).length).toBeLessThanOrEqual(MAX_ENCODED_PHOTO_BYTES);
  });

  it("throws when every quality stays over the cap", async () => {
    const encode = async () => `data:image/jpeg;base64,${"C".repeat(300000)}`;
    await expect(encodeWithinLimit(encode, 2000, 1500)).rejects.toThrow(/250/);
  });
});
