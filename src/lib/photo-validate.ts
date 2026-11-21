import { utf8Bytes } from "@/lib/item-size";
import {
  DATA_URL_PATTERN,
  MAX_ENCODED_PHOTO_BYTES,
  MAX_PHOTO_EDGE,
  MIN_PHOTO_EDGE,
  SAMPLE_PHOTO_PATTERN,
} from "@/lib/photo-limits";

const PHOTO_KIND_ERROR = "Use a JPEG, PNG, or WebP photo.";
const PHOTO_SIZE_ERROR = "Photo is over 250 KB.";
const PHOTO_EDGE_ERROR = `Photo width and height must be between ${MIN_PHOTO_EDGE} and ${MAX_PHOTO_EDGE} pixels.`;

export type PhotoMime = "image/jpeg" | "image/png" | "image/webp";

function u16be(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function u32be(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  );
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

function decodeBase64(payload: string): Uint8Array {
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function readJpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  let i = 2;
  while (i + 8 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xd8 || marker === 0x00) {
      i += 1;
      continue;
    }
    if (marker >= 0xd0 && marker <= 0xd9) {
      i += 2;
      continue;
    }
    const length = u16be(bytes, i + 2);
    if (length < 2) return null;
    const sof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (sof) {
      const height = u16be(bytes, i + 5);
      const width = u16be(bytes, i + 7);
      return width > 0 && height > 0 ? { width, height } : null;
    }
    i += 2 + length;
  }
  return null;
}

function readPngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  if (ascii(bytes, 12, 16) !== "IHDR") return null;
  const width = u32be(bytes, 16);
  const height = u32be(bytes, 20);
  return width > 0 && height > 0 ? { width, height } : null;
}

function readWebpSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 20) return null;
  const fourcc = ascii(bytes, 12, 16);
  if (fourcc === "VP8X" && bytes.length >= 30) {
    const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
    const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
    return { width, height };
  }
  if (fourcc === "VP8 " && bytes.length >= 30) {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    const width = bytes[26] | ((bytes[27] & 0x3f) << 8);
    const height = bytes[28] | ((bytes[29] & 0x3f) << 8);
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (fourcc === "VP8L" && bytes.length >= 25) {
    if (bytes[20] !== 0x2f) return null;
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

export function dataUrlByteLength(value: string): number {
  return utf8Bytes(value);
}

export function parseDataUrl(value: string): { mime: PhotoMime; bytes: Uint8Array } {
  const match = DATA_URL_PATTERN.exec(value);
  if (!match) throw new Error(PHOTO_KIND_ERROR);
  const kind = match[1].toLowerCase() as "jpeg" | "png" | "webp";
  try {
    return { mime: `image/${kind}`, bytes: decodeBase64(value.slice(value.indexOf(",") + 1)) };
  } catch {
    throw new Error(PHOTO_KIND_ERROR);
  }
}

export function sniffImageMime(bytes: Uint8Array): PhotoMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

export function readImageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const mime = sniffImageMime(bytes);
  if (mime === "image/jpeg") return readJpegSize(bytes);
  if (mime === "image/png") return readPngSize(bytes);
  if (mime === "image/webp") return readWebpSize(bytes);
  return null;
}

export function assertPhotoString(photo: string, options: { allowSample: boolean }): void {
  if (SAMPLE_PHOTO_PATTERN.test(photo)) {
    if (!options.allowSample) throw new Error(PHOTO_KIND_ERROR);
    return;
  }
  if (dataUrlByteLength(photo) > MAX_ENCODED_PHOTO_BYTES) {
    throw new Error(PHOTO_SIZE_ERROR);
  }
  const { mime, bytes } = parseDataUrl(photo);
  if (sniffImageMime(bytes) !== mime) throw new Error(PHOTO_KIND_ERROR);
  const size = readImageSize(bytes);
  if (!size) throw new Error(PHOTO_KIND_ERROR);
  if (
    size.width < MIN_PHOTO_EDGE ||
    size.height < MIN_PHOTO_EDGE ||
    size.width > MAX_PHOTO_EDGE ||
    size.height > MAX_PHOTO_EDGE
  ) {
    throw new Error(PHOTO_EDGE_ERROR);
  }
}
