import type { SeedItem } from "@/lib/repo/port";
import { seedRoads } from "@/lib/seed-roads";

export function buildSeedItems(): SeedItem[] {
  return seedRoads();
}
