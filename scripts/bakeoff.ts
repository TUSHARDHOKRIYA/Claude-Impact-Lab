import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { VOICE_FIXTURES } from "../src/lib/voice/fixtures";
import { buildSystemPrompt, buildUserPrompt } from "../src/lib/voice/prompt";
import {
  DEFAULT_MAX_TURNS,
  runFixture,
  summarize,
  type FixtureRun,
  type TargetSummary,
} from "../src/lib/voice/run";
import { scoreFixture } from "../src/lib/voice/score";
import { groundTruthCalls, sloppyModelCalls } from "../src/lib/voice/self-check";
import {
  TARGET_PRESETS,
  missingKeyNames,
  resolveAppTarget,
  resolveTargets,
} from "../src/lib/voice/targets";
import { renderReport } from "../src/lib/voice/table";
import { VOICE_TOOLS, VOICE_TOOL_NAMES } from "../src/lib/voice/tools";

const OUT_DIR = "bakeoff-runs";

type Args = {
  dryRun: boolean;
  models: string[];
  fixtures: string[];
  turns: number;
  out: string | null;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false,
    models: [],
    fixtures: [],
    turns: DEFAULT_MAX_TURNS,
    out: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--dry-run") args.dryRun = true;
    else if (flag === "--models" && value) {
      args.models = value.split(",").map((item) => item.trim());
    } else if (flag === "--fixtures" && value) {
      args.fixtures = value.split(",").map((item) => item.trim());
    } else if (flag === "--turns" && value) {
      args.turns = parseTurns(value);
    } else if (flag === "--out" && value) {
      args.out = value;
    }
  }
  return args;
}

/**
 * A bad --turns value used to sail through as NaN or 0, which makes the turn
 * loop exit before it sends a single request. The run then reports a clean
 * zero-call result and the model takes the blame for a typo. Reject it instead.
 */
function parseTurns(value: string): number {
  const turns = Number(value);
  if (!Number.isInteger(turns) || turns < 1) {
    fail(`--turns must be a positive whole number, got ${JSON.stringify(value)}`);
  }
  return turns;
}

function fail(message: string): never {
  console.error(`bakeoff: ${message}`);
  process.exit(1);
}

/**
 * resolveTargets only filters, so a typo'd model id yields an empty target list
 * that looks exactly like a missing key. Reject it by name instead.
 * (Unknown --fixtures are already rejected by pickFixtures.)
 */
function rejectUnknownModels(asked: string[]): void {
  const known = TARGET_PRESETS.map((preset) => preset.id);
  const unknown = asked.filter((name) => !known.includes(name));
  if (unknown.length > 0) {
    fail(`unknown model: ${unknown.join(", ")}. Known models: ${known.join(", ")}`);
  }
}

/** Next loads .env files; a bare tsx script does not. No dependency needed. */
function loadEnvFiles(): void {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(resolve(process.cwd(), file));
    } catch {
      /* absent is fine — the missing-key message below explains what to set */
    }
  }
}

function pickFixtures(ids: string[]): typeof VOICE_FIXTURES {
  if (ids.length === 0) return VOICE_FIXTURES;
  const chosen = VOICE_FIXTURES.filter((fixture) => ids.includes(fixture.id));
  if (chosen.length !== ids.length) {
    const known = VOICE_FIXTURES.map((fixture) => fixture.id).join(", ");
    throw new Error(`Unknown fixture id. Known ids: ${known}`);
  }
  return chosen;
}

/**
 * Everything that can be checked without a network call: the fixtures are
 * well-formed, the scorer grades a perfect run as perfect and a rubbish run as
 * rubbish, and the prompt maps speech onto the five noticed windows.
 */
function dryRun(fixtures: typeof VOICE_FIXTURES): number {
  const now = new Date();
  console.log(`Tools (${VOICE_TOOLS.length}): ${VOICE_TOOL_NAMES.join(", ")}`);
  console.log("No submit tool. There is no seventh tool.\n");
  console.log("--- system prompt ---");
  console.log(buildSystemPrompt());
  console.log("\n--- first user prompt ---");
  console.log(buildUserPrompt(fixtures[0].transcript));

  let failures = 0;
  console.log("\n--- scorer self-check ---");
  for (const fixture of fixtures) {
    const perfect = scoreFixture(fixture, groundTruthCalls(fixture, now), now);
    const sloppy = scoreFixture(fixture, sloppyModelCalls(fixture, now), now);
    const silent = scoreFixture(fixture, [], now);
    const perfectOk =
      perfect.wrong === 0 && perfect.missed === 0 && perfect.invalidCalls.length === 0;
    const sloppyOk = sloppy.wrong > 0 && sloppy.invalidCalls.length > 0;
    const silentOk = silent.missed > 0;
    if (!perfectOk || !sloppyOk || !silentOk) failures += 1;
    console.log(
      `  ${fixture.id.padEnd(30)} ground-truth ${perfectOk ? "pass" : "FAIL"}  ` +
        `sloppy-detected ${sloppyOk ? "pass" : "FAIL"}  silent-detected ${silentOk ? "pass" : "FAIL"}`,
    );
  }
  console.log(
    failures === 0
      ? "\nHarness is sound offline. It has NOT called any model. No verdict on any model yet."
      : `\n${failures} fixture(s) failed the self-check. Fix the harness before trusting a live run.`,
  );
  return failures === 0 ? 0 : 1;
}

function reportMissingKeys(): void {
  const missing = missingKeyNames(process.env);
  console.error("No model can be reached: no API key is set.\n");
  console.error(`Missing: ${missing.join(", ")}`);
  console.error(
    [
      "",
      "Set at least one in .env.local (gitignored) and re-run:",
      "  SARVAM_API_KEY=...    # sarvam-105b-conversations, the model this exists to test",
      "  OPENAI_API_KEY=...    # gpt-5.6-luna",
      "  GEMINI_API_KEY=...    # gemini-3.8-flash",
      "  CEREBRAS_API_KEY=...  # qwen-3.8-27b",
      "",
      "Optional per-provider overrides: SARVAM_BASE_URL, SARVAM_MODEL, OPENAI_BASE_URL,",
      "OPENAI_MODEL, GEMINI_BASE_URL, GEMINI_MODEL, CEREBRAS_BASE_URL, CEREBRAS_MODEL.",
      "",
      "Run `npm run bakeoff -- --dry-run` to verify the harness without any key.",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  loadEnvFiles();
  const args = parseArgs(process.argv.slice(2));
  const fixtures = pickFixtures(args.fixtures);

  if (args.dryRun) {
    process.exitCode = dryRun(fixtures);
    return;
  }

  rejectUnknownModels(args.models);
  const targets = resolveTargets(process.env, args.models);
  if (targets.length === 0) {
    const app = resolveAppTarget(process.env);
    if (!app) {
      reportMissingKeys();
      process.exitCode = 1;
      return;
    }
    targets.push(app);
  }

  console.log(
    `Running ${fixtures.length} fixtures against ${targets.length} model(s): ` +
      targets.map((target) => `${target.id}=${target.model}`).join(", "),
  );

  const byTarget: { targetId: string; runs: FixtureRun[] }[] = [];
  const summaries: TargetSummary[] = [];
  for (const target of targets) {
    const runs: FixtureRun[] = [];
    for (const fixture of fixtures) {
      const run = await runFixture(target, fixture, { maxTurns: args.turns });
      const detail = run.ok
        ? `${run.toolCalls.length} calls, ${run.latencyMs}ms`
        : `FAILED — ${run.error}`;
      console.log(`  ${target.id} / ${fixture.id}: ${detail}`);
      runs.push(run);
    }
    byTarget.push({ targetId: target.id, runs });
    summaries.push(summarize(target.id, target.model, runs));
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = args.out ?? resolve(process.cwd(), OUT_DIR, `${stamp}.json`);
  mkdirSync(resolve(outPath, ".."), { recursive: true });
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        startedAt: new Date().toISOString(),
        targets: targets.map(({ id, baseURL, model }) => ({ id, baseURL, model })),
        summaries,
        runs: byTarget,
      },
      null,
      2,
    ),
  );

  console.log(`\n${renderReport(summaries, byTarget)}`);
  console.log(`\nRun log: ${outPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
