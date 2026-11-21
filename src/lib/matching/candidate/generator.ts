import type { MatchCandidatePair, NormalizedComplaintRecord } from "../types";
import { buildCandidateIndex } from "./indexer";
import { scoreCandidatePair } from "./scorer";

export type CandidateGeneratorOptions = {
  minScoreThreshold?: number;
  maxPairsPerComplaint?: number;
};

/**
 * Generates candidate matching pairs by evaluating only spatially and
 * temporally proximal complaints, avoiding combinatorial O(N^2) scans.
 */
export function generateCandidatePairs(
  complaints: NormalizedComplaintRecord[],
  options: CandidateGeneratorOptions = {},
): MatchCandidatePair[] {
  const minScore = options.minScoreThreshold ?? 0.55;
  const index = buildCandidateIndex(complaints);
  const seenPairs = new Set<string>();
  const candidates: MatchCandidatePair[] = [];

  function evaluateBucket(bucket: NormalizedComplaintRecord[]) {
    if (bucket.length < 2) return;
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const a = bucket[i];
        const b = bucket[j];
        const pairKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);

        const candidate = scoreCandidatePair(a, b);
        if (candidate.score >= minScore) {
          candidates.push(candidate);
        }
      }
    }
  }

  // 1. Evaluate road segment clusters
  for (const bucket of index.byRoadId.values()) {
    evaluateBucket(bucket);
  }

  // 2. Evaluate spatial grid clusters
  for (const bucket of index.bySpatialGrid.values()) {
    evaluateBucket(bucket);
  }

  // 3. Evaluate ward-locality text clusters
  for (const bucket of index.byWardLocality.values()) {
    evaluateBucket(bucket);
  }

  // Sort candidates by score descending
  return candidates.sort((a, b) => b.score - a.score);
}
