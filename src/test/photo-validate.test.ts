import { describe, expect, it } from "vitest";
import { assertPhotoString, dataUrlByteLength, sniffImageMime } from "@/lib/photo-validate";
import { sampleJpegBytes } from "./sample-jpeg";

const JPEG_NO_SOF = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_NO_IHDR = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function dataUrl(mime: string, bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${mime};base64,${btoa(binary)}`;
}

describe("assertPhotoString", () => {
  it("accepts a sniffed jpeg data url", () => {
    expect(() =>
      assertPhotoString(dataUrl("image/jpeg", sampleJpegBytes()), { allowSample: false }),
    ).not.toThrow();
  });

  it("rejects a jpeg without SOF", () => {
    expect(sniffImageMime(JPEG_NO_SOF)).toBe("image/jpeg");
    expect(() =>
      assertPhotoString(dataUrl("image/jpeg", JPEG_NO_SOF), { allowSample: false }),
    ).toThrow(/JPEG, PNG, or WebP/);
  });

  it("rejects a png without IHDR", () => {
    expect(sniffImageMime(PNG_NO_IHDR)).toBe("image/png");
    expect(() =>
      assertPhotoString(dataUrl("image/png", PNG_NO_IHDR), { allowSample: false }),
    ).toThrow(/JPEG, PNG, or WebP/);
  });

  it("rejects a sample path for citizen photos", () => {
    expect(() =>
      assertPhotoString("/samples/paving.svg", { allowSample: false }),
    ).toThrow(/JPEG, PNG, or WebP/);
  });

  it("accepts a sample path when allowed", () => {
    expect(() =>
      assertPhotoString("/samples/paving.svg", { allowSample: true }),
    ).not.toThrow();
  });

  it("rejects a payload over 256000 utf-8 bytes", () => {
    const huge = `data:image/jpeg;base64,${"A".repeat(256001)}`;
    expect(dataUrlByteLength(huge)).toBeGreaterThan(256000);
    expect(() => assertPhotoString(huge, { allowSample: false })).toThrow(/250/);
  });

  it("rejects a png header labelled as jpeg", () => {
    expect(sniffImageMime(PNG_NO_IHDR)).toBe("image/png");
    expect(() =>
      assertPhotoString(dataUrl("image/jpeg", PNG_NO_IHDR), { allowSample: false }),
    ).toThrow(/JPEG, PNG, or WebP/);
  });
});
