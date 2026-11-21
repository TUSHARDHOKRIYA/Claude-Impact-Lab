// Local demo only: with RASTABAAZ_REPO=memory the store starts empty, so load the
// seed reports once at boot. Never runs against DynamoDB or in production.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getRepository, wantsMemoryRepository } = await import("@/lib/repo/context");
  if (!wantsMemoryRepository()) return;
  const { runSeed } = await import("@/lib/seed/run");
  await runSeed(getRepository());
}
