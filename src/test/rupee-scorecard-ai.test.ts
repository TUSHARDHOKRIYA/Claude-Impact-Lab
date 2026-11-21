import { describe, expect, it } from "vitest";
import { buildScorecards } from "../lib/rupee/scorecard";
import { contractorFacts } from "../lib/rupee/scorecard/ai-facts";
import { loadDataset } from "../lib/rupee/load";

const set = buildScorecards(loadDataset());

describe("contractor facts for the AI summary", () => {
  it("carries the computed figures for each contractor", () => {
    for (const card of set.cards) {
      const facts = contractorFacts(card, set.cards.length);
      expect(facts).toContain(card.name);
      expect(facts).toContain(`Overall score ${card.overall.toFixed(1)}`);
      expect(facts).toContain(`${card.durability.failures} of ${card.volume.jobs} repairs came back`);
      expect(facts).toContain(`${card.speed.misses} of ${card.volume.jobs} jobs missed`);
      expect(facts).toContain(`Band: ${card.band}`);
    }
  });

  it("holds data only, with no pre-written verdict words for the model to echo", () => {
    for (const card of set.cards) {
      const facts = contractorFacts(card, set.cards.length).toLowerCase();
      for (const word of ["better than", "worse than", "weak", "poor", "good", "bad", "excellent"]) {
        expect(facts, `${card.id}: ${word}`).not.toContain(word);
      }
    }
  });

  it("marks repeats and stress as context, not score", () => {
    const facts = contractorFacts(set.cards[0], set.cards.length);
    expect(facts).toContain("Context, never scored");
    expect(facts).toContain("Repeat evidence, not scored");
  });
});
