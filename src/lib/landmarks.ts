import { LOCALITIES, type Landmark } from "@/lib/city";

/**
 * Places a pin may land on by name: the 118 localities in the gazetteer
 * (`data/rupee/localities.csv`), with their spellings and Devanagari aliases.
 * The report form's place search reads this list.
 */
export type MergedLandmark = Landmark & {
  kind: "locality";
  ward: string;
  confidence: "high";
  inBounds: true;
};

export const ALL_LANDMARKS: MergedLandmark[] = LOCALITIES.map((row) => ({
  ...row,
  kind: "locality",
  confidence: "high",
  inBounds: true,
}));

export const PINNABLE_LANDMARKS: MergedLandmark[] = ALL_LANDMARKS;

export function landmarkById(id: string): MergedLandmark | undefined {
  return ALL_LANDMARKS.find((row) => row.id === id);
}

/** Every spoken form the table knows, lowercased, mapped to its locality id. */
export function aliasIndex(): Map<string, string> {
  const index = new Map<string, string>();
  for (const row of ALL_LANDMARKS) {
    for (const alias of [row.name, ...row.aliases]) {
      const key = alias.trim().toLowerCase();
      if (key && !index.has(key)) index.set(key, row.id);
    }
  }
  return index;
}
