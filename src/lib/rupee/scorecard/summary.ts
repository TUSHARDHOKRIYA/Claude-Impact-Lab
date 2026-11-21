import type { ScoreBand } from "./types";

/** Badge colour for each band. The band name is always written out beside it. */
export const BAND_TONE: Record<ScoreBand, "success" | "neutral" | "error" | "warning"> = {
  Strong: "success",
  "As expected": "neutral",
  "Needs attention": "error",
  "Limited data": "warning",
};
