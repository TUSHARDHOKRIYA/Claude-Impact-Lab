import { describe, expect, it } from "vitest";
import { geoPk, locationPk, neighbourGeoPks, reportPk, SEED_VERSION, slugLockPk } from "@/lib/repo/keys";

describe("dynamo keys", () => {
  it("builds single-table keys", () => {
    expect(locationPk("loc_1")).toBe("LOC#loc_1");
    expect(reportPk("rpt_1")).toBe("RPT#rpt_1");
    expect(slugLockPk("dr-ambedkar")).toBe("SLUG#dr-ambedkar");
    expect(geoPk("18.92980:72.83280")).toBe("GEO#18.92980:72.83280");
    expect(SEED_VERSION).toBe("2026-09-27-v5");
  });

  it("maps a 5x5 neighbourhood to GEO partition keys", () => {
    const keys = neighbourGeoPks(18.9298, 72.8324);
    expect(keys).toHaveLength(25);
    expect(keys.every((key) => key.startsWith("GEO#"))).toBe(true);
    expect(new Set(keys).size).toBe(25);
  });
});

