import { chmodSync, realpathSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_KEYS = ["RASTABAAZ_TABLE_NAME", "ADMIN_KEY"] as const;
const OPTIONAL_KEYS = [
  "SARVAM_API_KEY",
  "VOICE_LLM_BASE_URL",
  "VOICE_LLM_MODEL",
  "VOICE_LLM_KEY_NAME",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "CEREBRAS_API_KEY",
  "ANTHROPIC_API_KEY",
  "RUPEE_BRIEF_MODEL",
] as const;
const KEYS = [...REQUIRED_KEYS, ...OPTIONAL_KEYS] as const;
const FORBIDDEN_CHARS = /[\0\r\n]/;

export type AmplifyServerEnv = Record<
  (typeof REQUIRED_KEYS)[number],
  string
> &
  Partial<Record<(typeof OPTIONAL_KEYS)[number], string>>;
export type EnvMap = Record<string, string | undefined>;

export function collectServerEnv(env: EnvMap = process.env): AmplifyServerEnv {
  const missing = REQUIRED_KEYS.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required Amplify env: ${missing.join(" and ")} must be set.`,
    );
  }
  const values: AmplifyServerEnv = {
    RASTABAAZ_TABLE_NAME: env.RASTABAAZ_TABLE_NAME as string,
    ADMIN_KEY: env.ADMIN_KEY as string,
  };
  for (const key of OPTIONAL_KEYS) {
    const value = env[key];
    if (value?.trim()) values[key] = value;
  }
  for (const [key, value] of Object.entries(values)) {
    if (FORBIDDEN_CHARS.test(value)) {
      throw new Error(`${key} must not contain CR, LF, or NUL.`);
    }
  }
  return values;
}

export function quoteDotEnvValue(value: string): string {
  if (FORBIDDEN_CHARS.test(value)) {
    throw new Error("Env value must not contain CR, LF, or NUL.");
  }
  const escaped = value.replaceAll("$", "\\$");
  if (escaped.includes('"') && escaped.includes("'")) {
    throw new Error("Env value cannot contain both single and double quotes.");
  }
  if (escaped.includes('"')) return `'${escaped}'`;
  return `"${escaped}"`;
}

export function formatDotEnv(values: AmplifyServerEnv): string {
  return `${KEYS.flatMap((key) => {
    const value = values[key];
    return value === undefined ? [] : `${key}=${quoteDotEnvValue(value)}`;
  }).join("\n")}\n`;
}

export function writeAmplifyProductionEnv(
  path = ".env.production",
  env: EnvMap = process.env,
): void {
  writeFileSync(path, formatDotEnv(collectServerEnv(env)), {
    encoding: "utf8",
    mode: 0o600,
  });
  try {
    chmodSync(path, 0o600);
  } catch {
    // Windows cannot honor POSIX 0600; Amplify Linux can.
  }
}

function resolveExisting(path: string): string | null {
  try {
    return realpathSync(path);
  } catch {
    return null;
  }
}

export function isInvokedAsCli(
  argv: string[] = process.argv,
  scriptHref: string = import.meta.url,
): boolean {
  const scriptPath =
    resolveExisting(fileURLToPath(scriptHref)) ?? fileURLToPath(scriptHref);
  return argv.some((arg) => {
    if (!arg || arg.startsWith("-")) return false;
    const candidate = arg.startsWith("file:")
      ? fileURLToPath(arg)
      : resolve(arg);
    const resolved = resolveExisting(candidate) ?? candidate;
    return resolved === scriptPath;
  });
}

if (isInvokedAsCli()) {
  writeAmplifyProductionEnv();
}
