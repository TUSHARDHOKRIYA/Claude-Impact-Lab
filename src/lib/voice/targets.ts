export type ModelTarget = {
  /** Short label used in the comparison table and the run log. */
  id: string;
  baseURL: string;
  model: string;
  apiKey: string;
  /**
   * Sarvam's chat endpoint wants the key twice: as a bearer token AND as an
   * `api-subscription-key` header. OpenAI, Gemini, and Cerebras want the bearer only.
   * This is a header quirk, not an adapter layer.
   */
  subscriptionHeader: boolean;
};

export type TargetPreset = {
  id: string;
  baseURL: string;
  model: string;
  keyEnv: string;
  subscriptionHeader: boolean;
};

/**
 * Model choice is three values — baseURL, model, apiKey — read from env.
 * These presets are defaults for those three, nothing more. Any of them can be
 * overridden per-provider from the environment.
 */
export const TARGET_PRESETS: TargetPreset[] = [
  {
    id: "sarvam",
    baseURL: "https://api.sarvam.ai/v1",
    model: "sarvam-105b-conversations",
    keyEnv: "SARVAM_API_KEY",
    subscriptionHeader: true,
  },
  {
    id: "openai",
    baseURL: "https://api.openai.com/v1",
    model: "gpt-5.6-luna",
    keyEnv: "OPENAI_API_KEY",
    subscriptionHeader: false,
  },
  {
    id: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-3.8-flash",
    keyEnv: "GEMINI_API_KEY",
    subscriptionHeader: false,
  },
  {
    id: "cerebras",
    baseURL: "https://api.cerebras.ai/v1",
    model: "qwen-3.8-27b",
    keyEnv: "CEREBRAS_API_KEY",
    subscriptionHeader: false,
  },
];

export type EnvMap = Record<string, string | undefined>;

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Per-provider overrides: SARVAM_BASE_URL / SARVAM_MODEL, OPENAI_BASE_URL /
 * OPENAI_MODEL, GEMINI_BASE_URL / GEMINI_MODEL, CEREBRAS_BASE_URL /
 * CEREBRAS_MODEL. A provider is included only when its key is present, so the
 * bake-off runs the moment any key exists.
 */
export function resolveTargets(env: EnvMap, only?: string[]): ModelTarget[] {
  const wanted = only && only.length > 0 ? new Set(only) : null;
  const targets: ModelTarget[] = [];
  for (const preset of TARGET_PRESETS) {
    if (wanted && !wanted.has(preset.id)) continue;
    const apiKey = clean(env[preset.keyEnv]);
    if (!apiKey) continue;
    const prefix = preset.id.toUpperCase();
    targets.push({
      id: preset.id,
      baseURL: clean(env[`${prefix}_BASE_URL`]) ?? preset.baseURL,
      model: clean(env[`${prefix}_MODEL`]) ?? preset.model,
      apiKey,
      subscriptionHeader: preset.subscriptionHeader,
    });
  }
  return targets;
}

/**
 * The single target the app itself will use, from the trio in .env.example:
 * VOICE_LLM_BASE_URL, VOICE_LLM_MODEL, VOICE_LLM_KEY_NAME. Returns null when
 * the trio is incomplete or the named key env is empty.
 */
export function resolveAppTarget(env: EnvMap): ModelTarget | null {
  const baseURL = clean(env.VOICE_LLM_BASE_URL);
  const model = clean(env.VOICE_LLM_MODEL);
  const keyName = clean(env.VOICE_LLM_KEY_NAME);
  if (!baseURL || !model || !keyName) return null;
  const apiKey = clean(env[keyName]);
  if (!apiKey) return null;
  return {
    id: "voice_llm",
    baseURL,
    model,
    apiKey,
    subscriptionHeader: /(^|\.)sarvam\.ai/i.test(new URL(baseURL).hostname),
  };
}

/** Which env vars are missing, for the message printed when nothing can run. */
export function missingKeyNames(env: EnvMap): string[] {
  return TARGET_PRESETS.filter((preset) => !clean(env[preset.keyEnv])).map(
    (preset) => preset.keyEnv,
  );
}
