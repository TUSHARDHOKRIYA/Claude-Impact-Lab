/**
 * Text normalisation for multilingual Mumbai civic complaints.
 *
 * Preserves Devanagari script (Marathi and Hindi) while cleaning whitespace,
 * punctuation, and standardising Hinglish phonetic tokens.
 */

// Common Devanagari unicode range: \u0900-\u097F
const UNICODE_PUNCTUATION = /[.,/#!$%^&*;:{}=\-_`~()?"'«»।॥]/g;
const MULTIPLE_WHITESPACE = /\s+/g;

/** Normalises text via Unicode NFC, standardising whitespace while preserving Devanagari. */
export function cleanText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Zero-width spaces
    .replace(/[–—―]/g, "-") // Normalise dashes
    .replace(/[“”"']/g, '"') // Normalise quotes
    .replace(MULTIPLE_WHITESPACE, " ")
    .trim();
}

/** Standardises Hinglish / Marathi / Hindi phonetic tokens for robust text comparison. */
const PHONETIC_MAPPINGS: Record<string, string> = {
  khaddha: "khadda",
  gadda: "khadda",
  gaddha: "khadda",
  paani: "pani",
  paanee: "pani",
  raasta: "rasta",
  raaste: "rasta",
  raste: "rasta",
  sadak: "rasta",
  nala: "nullah",
  naala: "nullah",
  nulla: "nullah",
  gutters: "gutter",
  gutur: "gutter",
  chok: "choked",
  chamber: "manhole",
};

/** Extracts semantic comparison tokens from multilingual text. */
export function extractTokens(text: string): string[] {
  if (!text) return [];
  const cleaned = cleanText(text).toLowerCase();
  const rawWords = cleaned
    .replace(UNICODE_PUNCTUATION, " ")
    .split(MULTIPLE_WHITESPACE)
    .filter((w) => w.length > 1);

  return rawWords.map((word) => PHONETIC_MAPPINGS[word] ?? word);
}

/** Computes character/word n-gram Jaccard similarity for script-agnostic matching. */
export function jaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
