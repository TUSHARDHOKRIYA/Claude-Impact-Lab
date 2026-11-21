import "server-only";
import type { RastabaazRepository } from "@/lib/repo/port";
import { DynamoRastabaazRepository } from "@/lib/repo/dynamo";
import { MemoryRastabaazRepository } from "@/lib/repo/memory";
import { runSeed } from "@/lib/seed/run";

let override: RastabaazRepository | null = null;
let singleton: RastabaazRepository | null = null;

/**
 * `RASTABAAZ_REPO=memory npm run dev` keeps records in the dev server's memory, so
 * the app can be tried on a laptop with no AWS account, no table, and no
 * Docker. Records vanish when the server stops. It is ignored whenever
 * NODE_ENV is production (`next build`, `next start`, Amplify), so a deployed
 * app can never fall back to it.
 */
export function wantsMemoryRepository(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.RASTABAAZ_REPO === "memory" && env.NODE_ENV !== "production";
}

// On globalThis because Next dev can load this module more than once (pages,
// actions, hot reloads), and each copy must see the same records.
const holder = globalThis as { __rastabaazMemoryRepository?: RastabaazRepository };

export function setRepositoryForTests(repo: RastabaazRepository | null): void {
  override = repo;
}

export function getRepository(): RastabaazRepository {
  if (override) return override;
  if (wantsMemoryRepository()) {
    if (!holder.__rastabaazMemoryRepository) {
      const repo = new MemoryRastabaazRepository({ strictPhoto: true });
      // Memory mode starts with the seeded road reports so the map is not empty.
      void runSeed(repo);
      holder.__rastabaazMemoryRepository = repo;
    }
    return holder.__rastabaazMemoryRepository;
  }
  if (!singleton) singleton = new DynamoRastabaazRepository();
  return singleton;
}
