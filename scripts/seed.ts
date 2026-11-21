import { getRepository } from "../src/lib/repo/context";
import { runSeed } from "../src/lib/seed/run";

async function main(): Promise<void> {
  const result = await runSeed(getRepository());
  console.log(result === "already" ? "Seed already applied." : "Seed applied.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
