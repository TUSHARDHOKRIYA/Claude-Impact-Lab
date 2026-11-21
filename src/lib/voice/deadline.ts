/** One app voice turn, from the start of the action through speech synthesis. */
export const VOICE_TURN_BUDGET_MS = 20_000;

/** App extraction loop. The bake-off keeps `DEFAULT_MAX_TURNS`. */
export const APP_VOICE_MAX_TURNS = 3;

/** Per-call caps on the app path. Each call also stops when the turn budget runs out. */
export const STT_CALL_CAP_MS = 12_000;
export const CHAT_CALL_CAP_MS = 8_000;
export const TTS_CALL_CAP_MS = 6_000;

export const VOICE_TOO_LONG =
  "Voice took too long. Your draft is safe; try again or continue by typing.";

export type VoiceBudget = {
  signal: AbortSignal;
  /** Smaller of this call's cap and the time still left on the turn. */
  limit(capMs: number): number;
  stop(): void;
};

export function deadlineError(): Error {
  const error = new Error("Voice deadline exceeded");
  error.name = "TimeoutError";
  return error;
}

export function isDeadlineError(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

export function startVoiceBudget(budgetMs = VOICE_TURN_BUDGET_MS): VoiceBudget {
  const controller = new AbortController();
  const endsAt = Date.now() + budgetMs;
  const timer = setTimeout(() => controller.abort(), budgetMs);
  return {
    signal: controller.signal,
    limit(capMs: number) {
      return Math.min(capMs, Math.max(0, endsAt - Date.now()));
    },
    stop() {
      clearTimeout(timer);
    },
  };
}

export function cappedCall(
  budget: VoiceBudget,
  capMs: number,
): { signal: AbortSignal; timeoutMs: number } {
  return { signal: budget.signal, timeoutMs: budget.limit(capMs) };
}

/**
 * Await `run` until `ms` passes or `parent` aborts.
 *
 * Rejects even when `run` ignores the signal. A fetch that never settles
 * otherwise keeps the turn open after the deadline.
 */
export function runWithin<T>(
  run: (signal: AbortSignal) => Promise<T>,
  ms: number,
  parent?: AbortSignal,
): Promise<T> {
  if (parent?.aborted || !Number.isFinite(ms) || ms <= 0) return Promise.reject(deadlineError());

  const controller = new AbortController();
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  return new Promise<T>((resolve, reject) => {
    const close = () => {
      clearTimeout(timer);
      parent?.removeEventListener("abort", fail);
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      close();
      controller.abort();
      reject(deadlineError());
    };
    timer = setTimeout(fail, ms);
    parent?.addEventListener("abort", fail, { once: true });

    run(controller.signal).then(
      (value) => {
        if (settled) return;
        settled = true;
        close();
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        close();
        if (controller.signal.aborted || parent?.aborted) reject(deadlineError());
        else reject(error);
      },
    );
  });
}
