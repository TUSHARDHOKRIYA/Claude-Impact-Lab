import "server-only";
import type { KhabarRepository } from "@/lib/repo/port";
import { DynamoKhabarRepository } from "@/lib/repo/dynamo";
import { MemoryKhabarRepository } from "@/lib/repo/memory";
import { runSeed } from "@/lib/seed/run";

let override: KhabarRepository | null = null;
let singleton: KhabarRepository | null = null;

/**
 * `KHABAR_REPO=memory npm run dev` keeps records in the dev server's memory, so
 * the app can be tried on a laptop with no AWS account, no table, and no
 * Docker. Records vanish when the server stops. It is ignored whenever
 * NODE_ENV is production (`next build`, `next start`, Amplify), so a deployed
 * app can never fall back to it.
 */
export function wantsMemoryRepository(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.KHABAR_REPO === "memory" && env.NODE_ENV !== "production";
}

// On globalThis because Next dev can load this module more than once (pages,
// actions, hot reloads), and each copy must see the same records.
const holder = globalThis as { __khabarMemoryRepository?: KhabarRepository };

export function setRepositoryForTests(repo: KhabarRepository | null): void {
  override = repo;
}

export function getRepository(): KhabarRepository {
  if (override) return override;
  if (wantsMemoryRepository()) {
    if (!holder.__khabarMemoryRepository) {
      const repo = new MemoryKhabarRepository({ strictPhoto: true });
      // Memory mode starts with the seeded road reports so the map is not empty.
      void runSeed(repo);
      holder.__khabarMemoryRepository = repo;
    }
    return holder.__khabarMemoryRepository;
  }
  if (!singleton) singleton = new DynamoKhabarRepository();
  return singleton;
}
