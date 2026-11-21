import type { FixtureRun, TargetSummary } from "./run";
import type { SlotVerdict } from "./score";
import { VOICE_SLOTS } from "./slots";

const MARK: Record<SlotVerdict, string> = {
  correct: "Y",
  correct_abstain: "y",
  wrong: "X",
  hallucinated: "H",
  missed: "_",
  not_scored: ".",
};

export const LEGEND =
  "Y right   y rightly silent   X wrong   H invented   _ missed   . not scored   ! call failed";

export function renderTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => (row[index] ?? "").length)),
  );
  const line = (cells: string[]): string =>
    cells.map((cell, index) => (cell ?? "").padEnd(widths[index])).join("  ").trimEnd();
  return [line(headers), line(widths.map((width) => "-".repeat(width))), ...rows.map(line)].join("\n");
}

/**
 * The headline the bake-off exists to produce. Everything else is detail.
 */
export function renderVerdict(summaries: TargetSummary[]): string {
  return summaries
    .map((summary) => {
      const label = `${summary.targetId} (${summary.model})`;
      if (summary.errors === summary.fixtures) {
        return `  ${label}: every call failed. No tool-calling verdict possible.`;
      }
      if (summary.fixturesWithAnyToolCall === 0) {
        return `  ${label}: emitted ZERO tool calls across ${summary.fixtures} fixtures. It cannot tool-call here.`;
      }
      return `  ${label}: emitted tool calls on ${summary.fixturesWithAnyToolCall}/${summary.fixtures} fixtures.`;
    })
    .join("\n");
}

export function renderSummaryTable(summaries: TargetSummary[]): string {
  const headers = [
    "model",
    "fixtures",
    "errors",
    "with_calls",
    "calls",
    "invalid",
    "correct",
    "wrong",
    "missed",
    "median_ms",
  ];
  const rows = summaries.map((summary) => [
    summary.targetId,
    String(summary.fixtures),
    String(summary.errors),
    `${summary.fixturesWithAnyToolCall}/${summary.fixtures}`,
    String(summary.toolCalls),
    String(summary.invalidCalls),
    String(summary.correct),
    String(summary.wrong),
    String(summary.missed),
    String(summary.medianLatencyMs),
  ]);
  return renderTable(headers, rows);
}

/** Per-fixture slot grid for one model. Shows WHERE a model fails, not just how often. */
export function renderSlotGrid(targetId: string, runs: FixtureRun[]): string {
  const headers = ["fixture", ...VOICE_SLOTS, "calls", "ms"];
  const rows = runs.map((run) => {
    if (!run.score) {
      return [run.fixtureId, ...VOICE_SLOTS.map(() => "!"), String(run.toolCalls.length), String(run.latencyMs)];
    }
    const marks = VOICE_SLOTS.map((slot) => {
      const found = run.score?.slots.find((entry) => entry.slot === slot);
      return found ? MARK[found.verdict] : ".";
    });
    return [run.fixtureId, ...marks, String(run.toolCalls.length), String(run.latencyMs)];
  });
  return `${targetId}\n${renderTable(headers, rows)}`;
}

/** Every wrong, invented, missed or rejected slot, spelled out. */
export function renderFailures(targetId: string, runs: FixtureRun[]): string {
  const lines: string[] = [];
  for (const run of runs) {
    if (run.error) {
      lines.push(`  ${run.fixtureId}: request failed — ${run.error}`);
      continue;
    }
    for (const invalid of run.score?.invalidCalls ?? []) {
      lines.push(`  ${run.fixtureId}: ${invalid.name} rejected — ${invalid.reason}`);
    }
    for (const slot of run.score?.slots ?? []) {
      if (slot.verdict === "correct" || slot.verdict === "correct_abstain") continue;
      if (slot.verdict === "not_scored") continue;
      const got = slot.got === null ? "(no call)" : slot.got;
      lines.push(`  ${run.fixtureId}: ${slot.slot} ${slot.verdict} — wanted ${slot.expected}, got ${got}`);
    }
  }
  if (lines.length === 0) return `${targetId}: no failures.`;
  return `${targetId}\n${lines.join("\n")}`;
}

export function renderReport(
  summaries: TargetSummary[],
  byTarget: { targetId: string; runs: FixtureRun[] }[],
): string {
  const blocks = [
    "CAN IT TOOL-CALL?",
    renderVerdict(summaries),
    "",
    "COMPARISON",
    renderSummaryTable(summaries),
    "",
    `SLOT GRID   ${LEGEND}`,
    ...byTarget.map((entry) => renderSlotGrid(entry.targetId, entry.runs)),
    "",
    "FAILURES",
    ...byTarget.map((entry) => renderFailures(entry.targetId, entry.runs)),
  ];
  return blocks.join("\n");
}
