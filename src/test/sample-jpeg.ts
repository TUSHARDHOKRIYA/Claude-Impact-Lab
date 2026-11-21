const SAMPLE_JPEG = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x20, 0x00, 0x20, 0x01, 0x01, 0x11, 0x00, 0xff, 0xd9,
]);

export function sampleJpegBytes(): Uint8Array {
  return new Uint8Array(SAMPLE_JPEG);
}

export function sampleJpegDataUrl(): string {
  const bytes = sampleJpegBytes();
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:image/jpeg;base64,${btoa(binary)}`;
}
