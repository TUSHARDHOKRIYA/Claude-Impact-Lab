import { describe, expect, it } from "vitest";
import { noticedLead, noticedWhen } from "@/lib/noticed-label";
import {
  estimateNoticedAt,
  isNoticedDate,
  kolkataTodayStamp,
  NOTICED_WINDOW_MIDPOINT_DAYS,
} from "@/lib/noticed-date";

describe("kolkata civil dates", () => {
  it("crosses to the next IST day at 18:30 UTC", () => {
    const justAfter = new Date("2026-09-07T18:30:00.000Z");
    const justBefore = new Date("2026-09-07T18:29:59.000Z");
    expect(kolkataTodayStamp(justAfter)).toBe("2026-09-08");
    expect(kolkataTodayStamp(justBefore)).toBe("2026-09-07");
    expect(isNoticedDate("2026-09-08", justAfter)).toBe(true);
    expect(isNoticedDate("2026-09-08", justBefore)).toBe(false);
    expect(isNoticedDate("2026-09-09", justAfter)).toBe(false);
  });

  it("rejects February 31 and a non-leap 29 February", () => {
    const now = new Date("2026-09-07T19:00:00.000Z");
    expect(isNoticedDate("2026-02-31", now)).toBe(false);
    expect(isNoticedDate("2025-02-29", now)).toBe(false);
    expect(isNoticedDate("", now)).toBe(false);
  });

  it("accepts a past leap day and rejects a future civil date", () => {
    const now = new Date("2026-09-07T19:00:00.000Z");
    expect(isNoticedDate("2024-02-29", now)).toBe(true);
    expect(isNoticedDate("2099-01-01", now)).toBe(false);
  });

  it("estimates noticedAt from the recorded day minus the window midpoint", () => {
    expect(NOTICED_WINDOW_MIDPOINT_DAYS).toEqual({
      today: 0,
      this_week: 3,
      this_month: 15,
      one_to_six_months: 105,
      over_six_months: 270,
    });
    expect(estimateNoticedAt("2026-09-08", "today")).toBe("2026-09-08");
    expect(estimateNoticedAt("2026-09-07", "this_week")).toBe("2026-09-04");
    expect(estimateNoticedAt("2026-03-01", "this_month")).toBe("2026-02-14");
    expect(estimateNoticedAt("2026-01-10", "one_to_six_months")).toBe("2025-09-27");
    expect(estimateNoticedAt("2026-01-01", "over_six_months")).toBe("2025-04-06");
  });
});

describe("noticed labels", () => {
  const recorded = "2026-09-07T19:00:00.000Z";

  it("anchors a window to the recorded Kolkata date, not the sort estimate", () => {
    const report = { noticedAt: "2026-01-01", noticedWindow: "this_week" as const, createdAt: recorded };
    expect(noticedWhen(report)).toBe("Noticed in the week up to 8 September 2026");
    expect(noticedLead(report)).toBe(noticedWhen(report));
    expect(noticedWhen(report)).not.toContain("January");
  });

  it("keeps the stored date when the row has no window", () => {
    expect(noticedWhen({ noticedAt: "2023-02-04", noticedWindow: null, createdAt: "2026-09-27T10:00:00.000Z" })).toBe("Noticed on 4 February 2023");
  });
});
