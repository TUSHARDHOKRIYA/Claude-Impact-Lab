import { areCategoriesCompatible } from "../normalise/categories";
import { jaccardSimilarity } from "../normalise/text";
import { haversineDistance } from "../resolve/spatial";
import type {
  MatchCandidatePair,
  MatchConfidenceTier,
  MatchPolicyDecision,
  NormalizedComplaintRecord,
} from "../types";

export type ScorerWeights = {
  spatial: number;
  category: number;
  temporal: number;
  semantic: number;
};

const DEFAULT_WEIGHTS: ScorerWeights = {
  spatial: 0.35,
  category: 0.25,
  temporal: 0.2,
  semantic: 0.2,
};

/** Scores a pair of candidate complaints using multi-factor evidence. */
export function scoreCandidatePair(
  a: NormalizedComplaintRecord,
  b: NormalizedComplaintRecord,
  weights: ScorerWeights = DEFAULT_WEIGHTS,
): MatchCandidatePair {
  // 1. Spatial feature
  const sameRoad = Boolean(
    a.resolution.roadId &&
      b.resolution.roadId &&
      a.resolution.roadId === b.resolution.roadId,
  );

  let distanceM: number | null = null;
  let spatialScore = 0.0;

  if (a.gps && b.gps) {
    distanceM = Math.round(haversineDistance(a.gps, b.gps));
    if (distanceM <= 30) spatialScore = 1.0;
    else if (distanceM <= 60) spatialScore = 0.85;
    else if (distanceM <= 100) spatialScore = 0.6;
    else if (distanceM <= 150) spatialScore = 0.3;
    else spatialScore = 0.0;
  } else if (sameRoad) {
    spatialScore = 0.9;
  } else if (
    a.resolution.locality &&
    b.resolution.locality &&
    a.resolution.locality.toLowerCase() === b.resolution.locality.toLowerCase()
  ) {
    spatialScore = 0.5;
  } else if (a.resolution.ward && b.resolution.ward && a.resolution.ward === b.resolution.ward) {
    spatialScore = 0.2;
  }

  // 2. Category feature
  const categoryMatch = areCategoriesCompatible(a.canonicalCategory, b.canonicalCategory);
  const exactCategory = a.canonicalCategory === b.canonicalCategory;
  const categoryScore = exactCategory ? 1.0 : categoryMatch ? 0.6 : 0.0;

  // 3. Temporal feature
  const timeA = new Date(a.normalizedTimestamp).getTime();
  const timeB = new Date(b.normalizedTimestamp).getTime();
  const timeDeltaHours = Math.round(Math.abs(timeA - timeB) / (1000 * 60 * 60));

  let temporalScore = 0.0;
  if (timeDeltaHours <= 24) temporalScore = 1.0;
  else if (timeDeltaHours <= 72) temporalScore = 0.85;
  else if (timeDeltaHours <= 168) temporalScore = 0.6; // 1 week
  else if (timeDeltaHours <= 720) temporalScore = 0.35; // 30 days
  else temporalScore = 0.1;

  // 4. Semantic feature
  const semanticSimilarity = Number(jaccardSimilarity(a.tokens, b.tokens).toFixed(2));

  // 5. Locality feature
  const localityMatch = Boolean(
    a.resolution.locality &&
      b.resolution.locality &&
      a.resolution.locality.toLowerCase() === b.resolution.locality.toLowerCase(),
  );

  // Compute weighted raw score
  let score =
    weights.spatial * spatialScore +
    weights.category * categoryScore +
    weights.temporal * temporalScore +
    weights.semantic * semanticSimilarity;

  // --- STRICT DOMAIN GUARDRAILS ---
  // Invariant 1: Never merge physically distinct road problems based solely on text similarity.
  if (distanceM != null && distanceM > 120 && !sameRoad) {
    score = Math.min(score, 0.35);
  }

  // Invariant 2: Incompatible categories cannot auto-merge
  if (!categoryMatch) {
    score = Math.min(score, 0.25);
  }

  score = Number(Math.max(0, Math.min(1, score)).toFixed(2));

  // Policy decision & confidence tier
  let confidenceTier: MatchConfidenceTier = "low";
  let policy: MatchPolicyDecision = "separate_issue";

  if (score >= 0.8 && categoryMatch && (sameRoad || (distanceM != null && distanceM <= 50))) {
    confidenceTier = "high";
    policy = "auto_merge";
  } else if (score >= 0.58 && categoryMatch) {
    confidenceTier = "medium";
    policy = "manual_review";
  }

  const explanations: string[] = [];
  if (sameRoad) explanations.push(`Same road segment (${a.resolution.roadId})`);
  else if (distanceM != null) explanations.push(`${distanceM}m apart`);
  if (exactCategory) explanations.push(`Same category (${a.canonicalCategory})`);
  else if (categoryMatch) explanations.push(`Compatible categories (${a.canonicalCategory} / ${b.canonicalCategory})`);
  else explanations.push(`Incompatible categories (${a.canonicalCategory} vs ${b.canonicalCategory})`);
  explanations.push(`Reported ${timeDeltaHours}h apart`);
  if (semanticSimilarity > 0.4) explanations.push(`Semantic overlap ${(semanticSimilarity * 100).toFixed(0)}%`);

  return {
    complaintAId: a.id,
    complaintBId: b.id,
    score,
    features: {
      sameRoad,
      distanceM,
      categoryMatch,
      timeDeltaHours,
      semanticSimilarity,
      localityMatch,
    },
    confidenceTier,
    policy,
    explanation: explanations.join(", "),
  };
}
