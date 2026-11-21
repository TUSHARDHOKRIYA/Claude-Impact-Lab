const LINES = {
  ward: [
    "The score is the share of a ward's repair money that held up, from 0 to 100.",
    "Money held up when the job was not re-opened within 30 days and its bill has no audit flag.",
    "65 and over is good, 50 to 64 is fair, under 50 is poor. Wards are ranked by this score.",
  ],
  contractor: [
    "Overall = 45% durability + 30% cost + 25% speed.",
    "Each part compares the contractor's jobs with what similar jobs usually get. Matching the usual scores 50; better scores higher.",
    "Contractors with few jobs are pulled toward 50 until they have about 20 jobs, so one lucky job can't top the table.",
    "How many jobs a contractor did is shown, never scored.",
  ],
} as const;

/** A short, closed-by-default explanation of how a score is calculated. */
export function ScoreHow({ kind, className }: { kind: keyof typeof LINES; className?: string }) {
  return (
    <details className={className ? `rb-how ${className}` : "rb-how"}>
      <summary className="touch-target">How the score works</summary>
      <ul>
        {LINES[kind].map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </details>
  );
}
