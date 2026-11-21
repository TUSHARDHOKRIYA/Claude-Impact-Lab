import Link from "next/link";

import { formatInrShort } from "@/lib/rupee/format";
import type { ContractorScorecard, ScoreBand } from "@/lib/rupee/scorecard";

const BAND_CLASS: Record<ScoreBand, string> = {
  Strong: "rb-score-good",
  "As expected": "rb-score-fair",
  "Needs attention": "rb-score-poor",
  "Limited data": "rb-score-none",
};

const PARTS = [
  { key: "durability", label: "Lasted", weight: "45%" },
  { key: "cost", label: "Billing", weight: "30%" },
  { key: "speed", label: "On time", weight: "25%" },
] as const;

/**
 * Contractors as a leaderboard: rank, name, what they took on, the three
 * part scores as small bars, and the overall score with its band. Each row
 * opens the full record.
 */
export function ContractorRankList({ cards, flagsById }: { cards: ContractorScorecard[]; flagsById: Map<string, number> }) {
  return (
    <ol className="rb-crank" aria-label="Contractors with their overall score">
      {cards.map((card) => {
        const flagged = flagsById.get(card.id) ?? 0;
        return (
          <li key={card.id}>
            <Link href={`/contractors/${card.id}`} className="rb-crank-row touch-target">
              <span className="rb-rank-no" data-top={card.rank <= 3 ? "true" : undefined}>
                <span className="sr-only">Rank </span>
                {card.rank}
              </span>
              <span className="rb-crank-main">
                <span className="rb-crank-name">{card.name}</span>
                <span className="rb-rank-sub">
                  {card.volume.jobs} jobs in {card.volume.wards} wards, {formatInrShort(card.volume.billedInr)} billed
                  {flagged ? `, ${flagged} ${flagged === 1 ? "bill" : "bills"} flagged` : ""}
                </span>
              </span>
              <span className={`rb-rank-score ${BAND_CLASS[card.band]}`}>
                <span className="rb-rank-score-n">{card.overall.toFixed(0)}</span>
                <span className="rb-crank-band">{card.band}</span>
              </span>
              <span className="rb-crank-parts">
                {PARTS.map((part) => {
                  const score = Math.round(card[part.key].score);
                  // Same cut-offs as the overall band: 60 and up strong, under 40 needs attention.
                  const tone = score >= 60 ? "good" : score >= 40 ? "fair" : "poor";
                  return (
                    <span key={part.key} className="rb-crank-part" data-tone={tone}>
                      <span className="rb-crank-part-label">
                        {part.label} <strong>{score}</strong>
                      </span>
                      <span className="rb-crank-bar" aria-hidden="true">
                        <span style={{ width: `${Math.max(2, Math.min(100, score))}%` }} />
                      </span>
                    </span>
                  );
                })}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
