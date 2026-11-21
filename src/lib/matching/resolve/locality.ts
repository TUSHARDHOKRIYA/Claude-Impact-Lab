import { LOCALITIES, type Locality } from "@/lib/city";

export type LocalityMatchResult = {
  locality: Locality;
  confidence: number;
  matchType: "exact" | "fuzzy";
  explanation: string;
};

function normaliseLocalityText(text: string): string {
  return text.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, "");
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}

function stringSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

// Precomputed mapping for O(1) exact lookups
const EXACT_LOOKUP = new Map<string, Locality>();
for (const loc of LOCALITIES) {
  EXACT_LOOKUP.set(normaliseLocalityText(loc.name), loc);
  for (const alias of loc.aliases) {
    EXACT_LOOKUP.set(normaliseLocalityText(alias), loc);
  }
}

/** Resolves raw locality text to a standard locality via exact or fuzzy matching. */
export function resolveLocality(rawText: string | null | undefined): LocalityMatchResult | null {
  if (!rawText || rawText.trim() === "") return null;
  const clean = normaliseLocalityText(rawText);

  // 1. Exact match on name or known alias
  const exact = EXACT_LOOKUP.get(clean);
  if (exact) {
    return {
      locality: exact,
      confidence: 1.0,
      matchType: "exact",
      explanation: `Exact match for locality "${exact.name}" (${exact.ward} ward).`,
    };
  }

  // 2. Fuzzy match against all localities and aliases
  let bestMatch: Locality | null = null;
  let bestSim = 0;
  let bestCandidate = "";

  for (const loc of LOCALITIES) {
    const candidates = [loc.name, ...loc.aliases];
    for (const cand of candidates) {
      const candClean = normaliseLocalityText(cand);

      // Substring and word containment check
      const isWord =
        candClean.length >= 4 &&
        (clean === candClean ||
          clean.startsWith(candClean + " ") ||
          clean.endsWith(" " + candClean) ||
          clean.includes(" " + candClean + " "));

      if (isWord) {
        const coverage = candClean.length / clean.length;
        const sim = 0.65 + 0.3 * coverage;
        if (sim > bestSim) {
          bestSim = sim;
          bestMatch = loc;
          bestCandidate = cand;
        }
      } else if (clean.includes(candClean) || candClean.includes(clean)) {
        const sim = Math.min(clean.length, candClean.length) / Math.max(clean.length, candClean.length);
        if (sim > bestSim && sim >= 0.6) {
          bestSim = sim;
          bestMatch = loc;
          bestCandidate = cand;
        }
      }

      // Levenshtein similarity
      const sim = stringSimilarity(clean, candClean);
      if (sim > bestSim && sim >= 0.7) {
        bestSim = sim;
        bestMatch = loc;
        bestCandidate = cand;
      }
    }
  }

  if (bestMatch && bestSim >= 0.65) {
    return {
      locality: bestMatch,
      confidence: Number(bestSim.toFixed(2)),
      matchType: "fuzzy",
      explanation: `Fuzzy matched "${rawText}" to "${bestMatch.name}" via "${bestCandidate}" (similarity ${Math.round(bestSim * 100)}%).`,
    };
  }

  return null;
}
