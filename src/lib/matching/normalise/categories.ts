import type { CanonicalCategory } from "../types";

const CATEGORY_MAP: Record<string, CanonicalCategory> = {
  pothole: "pothole",
  waterlogging: "waterlogging",
  "broken paver blocks": "broken_paver_blocks",
  "open or broken manhole": "open_manhole",
  "choked drain / nullah overflow": "choked_drain",
  "road cave-in": "road_cave_in",
  "road related": "road_surface_other",
  other: "other",
};

/** Maps raw reported category to strongly typed canonical category. */
export function normaliseCategory(raw: string | null | undefined): CanonicalCategory {
  if (!raw) return "other";
  const key = raw.trim().toLowerCase();
  return CATEGORY_MAP[key] ?? "other";
}

/**
 * For vague reports ('Road related', 'Other'), checks description text
 * for specific cues (in Marathi, Hindi, or English) to infer a precise category.
 */
export function inferCategoryFromText(text: string): CanonicalCategory | null {
  const lower = text.toLowerCase();

  // Pothole cues (Marathi: खड्डा, Hindi: गड्ढा / खड्डा, English/Hinglish)
  if (/(pothole|khadda|gadda|खड्डा|गड्ढा|गड्डा)/i.test(lower)) {
    return "pothole";
  }

  // Waterlogging cues (Marathi: पाणी साचले, Hindi: पानी भर गया)
  if (/(waterlog|paani bhar|pani bhar|water accumul|पाणी साच|जलभराव|पानी भर)/i.test(lower)) {
    return "waterlogging";
  }

  // Manhole cues (Marathi: झाकण, Hindi: ढक्कन)
  if (/(manhole|open chamber|chamber cover|gutter lid|झाकण|ढक्कन)/i.test(lower)) {
    return "open_manhole";
  }

  // Choked drain / nullah cues
  if (/(choked drain|nullah|overflow|gutter choked|नाल|गटर|सांडपाणी)/i.test(lower)) {
    return "choked_drain";
  }

  // Paver block cues
  if (/(paver|paver block|blocks broken|पेव्हर|ब्लॉक)/i.test(lower)) {
    return "broken_paver_blocks";
  }

  // Cave-in cues
  if (/(cave-in|cave in|sank|road collapsed|धसला|धंस)/i.test(lower)) {
    return "road_cave_in";
  }

  return null;
}

/** Checks whether two categories are compatible for candidate matching. */
export function areCategoriesCompatible(
  catA: CanonicalCategory,
  catB: CanonicalCategory,
): boolean {
  if (catA === catB) return true;
  if (catA === "other" || catB === "other") return true;
  if (catA === "road_surface_other" || catB === "road_surface_other") return true;

  // Inter-compatible pairs
  const compatiblePairs = new Set([
    "pothole:broken_paver_blocks",
    "broken_paver_blocks:pothole",
    "waterlogging:choked_drain",
    "choked_drain:waterlogging",
    "pothole:road_cave_in",
    "road_cave_in:pothole",
  ]);

  return compatiblePairs.has(`${catA}:${catB}`);
}
