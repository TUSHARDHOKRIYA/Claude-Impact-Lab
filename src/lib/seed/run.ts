import { SEED_VERSION } from "@/lib/repo/keys";
import type { RastabaazRepository } from "@/lib/repo/port";
import { buildSeedItems } from "@/lib/seed/items";

export { buildSeedItems };

export async function runSeed(repo: RastabaazRepository): Promise<"seeded" | "already"> {
  if ((await repo.getSeedMarker()) === SEED_VERSION) return "already";
  await repo.putSeedItems(buildSeedItems());
  const wrote = await repo.putSeedMarker(SEED_VERSION);
  return wrote || (await repo.getSeedMarker()) === SEED_VERSION ? "seeded" : "already";
}
