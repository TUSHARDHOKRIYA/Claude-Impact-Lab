export const MAX_ENCODED_PHOTO_BYTES = 256000;
export const MAX_DYNAMO_ITEM_BYTES = 409600;
export const SAMPLE_PHOTO_PATTERN = /^\/samples\/[a-z0-9-]+\.svg$/;
export const DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/]+=*$/i;
export const MIN_PHOTO_EDGE = 32;
/**
 * Matches COMPRESS_MAX_EDGE: the browser never sends a longer edge, so anything
 * bigger arrived by a hand-rolled POST. The public page renders stored bytes
 * as-is, and an 8000x8000 image that fits in 256 KB still decodes to ~256 MB
 * of RGBA on the viewer's phone.
 */
export const MAX_PHOTO_EDGE = 1280;
export const COMPRESS_MAX_EDGE = 1280;
export const COMPRESS_FALLBACK_EDGE = 960;
export const COMPRESS_QUALITIES = [0.72, 0.6, 0.48, 0.4] as const;
