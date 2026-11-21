import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import {
  collectServerEnv,
  formatDotEnv,
  isInvokedAsCli,
  quoteDotEnvValue,
  writeAmplifyProductionEnv,
} from "../../scripts/write-amplify-env";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const temps: string[] = [];

afterEach(() => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function parseNextDotEnv(
  src: string,
  env: Record<string, string> = {},
): Record<string, string> {
  const line =
    /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;
  const parsed: Record<string, string> = {};
  const text = src.replace(/\r\n?/gm, "\n");
  let match: RegExpExecArray | null;
  while ((match = line.exec(text)) != null) {
    let value = (match[2] || "").trim();
    const quote = value[0];
    value = value.replace(/^(['"`])([\s\S]*)\1$/gm, "$2");
    if (quote === '"') {
      value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    }
    parsed[match[1]] = value;
  }
  function interpolate(value: string): string {
    const matches = Array.from(value.matchAll(/(?!(?<=\\))\$/g));
    const index = matches.length > 0 ? matches.slice(-1)[0].index : -1;
    if (index === -1) return value;
    const rest = value.slice(index);
    const hit = rest.match(/((?!(?<=\\))\${?([\w]+)(?::-([^}\\]*))?}?)/);
    if (!hit) return value;
    const replacement = env[hit[2]] || hit[3] || parsed[hit[2]] || "";
    return interpolate(value.replace(hit[1], replacement));
  }
  for (const key of Object.keys(parsed)) {
    parsed[key] = interpolate(parsed[key]).replace(/\\\$/g, "$");
  }
  return parsed;
}

describe("amplify SSR env wiring", () => {
  it("fails the Amplify build when required server env is missing", () => {
    const yaml = read("amplify.yml");
    expect(yaml).toMatch(/nvm use 20/);
    expect(yaml).toMatch(/npm ci/);
    expect(yaml).toMatch(/npm run typecheck/);
    expect(yaml).toMatch(/npm run test/);
    expect(yaml).toMatch(/npm run amplify:env/);
    expect(yaml).toMatch(/npm run build/);
    expect(yaml.indexOf("npm run amplify:env")).toBeLessThan(
      yaml.indexOf("npm run build"),
    );
    expect(yaml).toMatch(/process\.env\.RASTABAAZ_TABLE_NAME/);
    expect(yaml).toMatch(/process\.env\.ADMIN_KEY/);
    expect(yaml).toMatch(/Missing required Amplify env/);
    expect(yaml).toMatch(/process\.exit\(1\)/);
    expect(yaml).not.toMatch(/printenv|echo "\$ADMIN_KEY"|echo \$ADMIN_KEY/);
    expect(yaml).not.toMatch(/AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN/);
    expect(yaml).not.toMatch(/NEXT_PUBLIC_/);
    expect(yaml).not.toMatch(/appsync|cognito-|amplify auth|amplify data|amplify storage/i);
  });

  it("detects relative and absolute CLI paths without import side effects", () => {
    const relative = "scripts/write-amplify-env.ts";
    const absolute = resolve(relative);
    const href = pathToFileURL(absolute).href;
    expect(isInvokedAsCli(["node", relative], href)).toBe(true);
    expect(isInvokedAsCli(["node", "tsx", relative], href)).toBe(true);
    expect(isInvokedAsCli(["node", absolute], href)).toBe(true);
    expect(isInvokedAsCli(["node", href], href)).toBe(true);
    expect(isInvokedAsCli(["node", "/usr/bin/vitest"], href)).toBe(false);
    expect(isInvokedAsCli(process.argv)).toBe(false);
  });

  it("writes required and configured voice server env into .env.production", () => {
    expect(() => collectServerEnv({})).toThrow(/RASTABAAZ_TABLE_NAME/);
    expect(() => collectServerEnv({ RASTABAAZ_TABLE_NAME: "rastabaaz-test" })).toThrow(
      /ADMIN_KEY/,
    );
    const values = collectServerEnv({
      RASTABAAZ_TABLE_NAME: "rastabaaz-test",
      ADMIN_KEY: "dev-admin-key",
      SARVAM_API_KEY: "sarvam-key",
      VOICE_LLM_BASE_URL: "https://api.sarvam.ai/v1",
      VOICE_LLM_MODEL: "sarvam-105b-conversations",
      VOICE_LLM_KEY_NAME: "SARVAM_API_KEY",
      OPENAI_API_KEY: "openai-key",
      GEMINI_API_KEY: "gemini-key",
      CEREBRAS_API_KEY: "cerebras-key",
      ANTHROPIC_API_KEY: "anthropic-key",
      RUPEE_BRIEF_MODEL: "claude-opus-5-5",
      AWS_REGION: "ap-south-1",
      AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
      AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG",
      NEXT_PUBLIC_FLAG: "no",
    });
    expect(values).toEqual({
      RASTABAAZ_TABLE_NAME: "rastabaaz-test",
      ADMIN_KEY: "dev-admin-key",
      SARVAM_API_KEY: "sarvam-key",
      VOICE_LLM_BASE_URL: "https://api.sarvam.ai/v1",
      VOICE_LLM_MODEL: "sarvam-105b-conversations",
      VOICE_LLM_KEY_NAME: "SARVAM_API_KEY",
      OPENAI_API_KEY: "openai-key",
      GEMINI_API_KEY: "gemini-key",
      CEREBRAS_API_KEY: "cerebras-key",
      ANTHROPIC_API_KEY: "anthropic-key",
      RUPEE_BRIEF_MODEL: "claude-opus-5-5",
    });
    const body = formatDotEnv(values);
    expect(body).toBe(
      [
        `RASTABAAZ_TABLE_NAME=${quoteDotEnvValue("rastabaaz-test")}`,
        `ADMIN_KEY=${quoteDotEnvValue("dev-admin-key")}`,
        `SARVAM_API_KEY=${quoteDotEnvValue("sarvam-key")}`,
        `VOICE_LLM_BASE_URL=${quoteDotEnvValue("https://api.sarvam.ai/v1")}`,
        `VOICE_LLM_MODEL=${quoteDotEnvValue("sarvam-105b-conversations")}`,
        `VOICE_LLM_KEY_NAME=${quoteDotEnvValue("SARVAM_API_KEY")}`,
        `OPENAI_API_KEY=${quoteDotEnvValue("openai-key")}`,
        `GEMINI_API_KEY=${quoteDotEnvValue("gemini-key")}`,
        `CEREBRAS_API_KEY=${quoteDotEnvValue("cerebras-key")}`,
        `ANTHROPIC_API_KEY=${quoteDotEnvValue("anthropic-key")}`,
        `RUPEE_BRIEF_MODEL=${quoteDotEnvValue("claude-opus-5-5")}`,
        "",
      ].join("\n"),
    );
    expect(body).not.toMatch(/AWS_|NEXT_PUBLIC_/);

    const dir = mkdtempSync(join(tmpdir(), "amplify-env-"));
    temps.push(dir);
    const dest = join(dir, ".env.production");
    writeAmplifyProductionEnv(dest, {
      RASTABAAZ_TABLE_NAME: "rastabaaz-test",
      ADMIN_KEY: "dev-admin-key",
      SARVAM_API_KEY: "sarvam-key",
      VOICE_LLM_BASE_URL: "https://api.sarvam.ai/v1",
      VOICE_LLM_MODEL: "sarvam-105b-conversations",
      VOICE_LLM_KEY_NAME: "SARVAM_API_KEY",
      OPENAI_API_KEY: "openai-key",
      GEMINI_API_KEY: "gemini-key",
      CEREBRAS_API_KEY: "cerebras-key",
      ANTHROPIC_API_KEY: "anthropic-key",
      RUPEE_BRIEF_MODEL: "claude-opus-5-5",
      AWS_REGION: "ap-south-1",
    });
    expect(read(dest)).toBe(body);
    if (process.platform !== "win32") {
      expect(statSync(dest).mode & 0o777).toBe(0o600);
    }
  });

  it("omits empty optional voice configuration", () => {
    const values = collectServerEnv({
      RASTABAAZ_TABLE_NAME: "rastabaaz-test",
      ADMIN_KEY: "dev-admin-key",
      SARVAM_API_KEY: "",
      VOICE_LLM_BASE_URL: "   ",
      VOICE_LLM_MODEL: undefined,
      OPENAI_API_KEY: "configured",
    });
    expect(values).toEqual({
      RASTABAAZ_TABLE_NAME: "rastabaaz-test",
      ADMIN_KEY: "dev-admin-key",
      OPENAI_API_KEY: "configured",
    });
    expect(formatDotEnv(values)).not.toMatch(
      /SARVAM_API_KEY|VOICE_LLM_BASE_URL|VOICE_LLM_MODEL/,
    );
  });

  it("round-trips #, spaces, quotes, and $ without expansion", () => {
    const env = { HOME: "/not-home", bar: "EXPANDED", USER: "expanded-user" };
    const cases = [
      { RASTABAAZ_TABLE_NAME: "rastabaaz-test", ADMIN_KEY: "hash#not-a-comment" },
      { RASTABAAZ_TABLE_NAME: "rastabaaz-test", ADMIN_KEY: "spaced secret key" },
      { RASTABAAZ_TABLE_NAME: "rastabaaz-test", ADMIN_KEY: 'say "quoted"' },
      { RASTABAAZ_TABLE_NAME: "rastabaaz-test", ADMIN_KEY: "token$bar$HOME" },
      { RASTABAAZ_TABLE_NAME: "rastabaaz-test", ADMIN_KEY: "it's secret $USER" },
    ];
    for (const values of cases) {
      const parsed = parseNextDotEnv(formatDotEnv(values), env);
      expect(parsed.ADMIN_KEY).toBe(values.ADMIN_KEY);
      expect(parsed.RASTABAAZ_TABLE_NAME).toBe(values.RASTABAAZ_TABLE_NAME);
    }
    expect(() =>
      collectServerEnv({ RASTABAAZ_TABLE_NAME: "rastabaaz-test", ADMIN_KEY: "a\nb" }),
    ).toThrow(/CR, LF, or NUL/);
    expect(() =>
      collectServerEnv({ RASTABAAZ_TABLE_NAME: "rastabaaz-test", ADMIN_KEY: "a\rb" }),
    ).toThrow(/CR, LF, or NUL/);
    expect(() =>
      collectServerEnv({ RASTABAAZ_TABLE_NAME: "rastabaaz-test", ADMIN_KEY: "a\0b" }),
    ).toThrow(/CR, LF, or NUL/);
  });
});
