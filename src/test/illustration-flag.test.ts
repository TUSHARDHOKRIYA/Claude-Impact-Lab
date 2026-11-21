import { describe, expect, it } from "vitest";

import { MemoryKhabarRepository } from "@/lib/repo/memory";
import { toListItem } from "@/lib/repo/port";
import { buildSeedItems } from "@/lib/seed/run";
import { sampleJpegDataUrl } from "@/test/sample-jpeg";

describe("illustration caption flag", () => {
  it("stops captioning a seeded report once the desk gives it a real photo", async () => {
    const repo = new MemoryKhabarRepository();
    await repo.putSeedItems(buildSeedItems());
    const seeded = buildSeedItems().find((item) => item.entity === "report");
    if (!seeded || seeded.entity !== "report") throw new Error("seed has no report");

    const before = await repo.getReport(seeded.record.id);
    expect(before && toListItem(before).photoIsIllustration).toBe(true);

    const after = await repo.updateReport({ id: seeded.record.id, photo: sampleJpegDataUrl() });
    expect(after && toListItem(after).photoIsIllustration).toBe(false);
    const reread = await repo.getReport(seeded.record.id);
    expect(reread && toListItem(reread).photoIsIllustration).toBe(false);
  });
});
