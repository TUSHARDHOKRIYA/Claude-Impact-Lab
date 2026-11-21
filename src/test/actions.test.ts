import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("next/headers", () => ({
  headers: async () => {
    throw new Error("no request");
  },
  cookies: async () => ({
    get() {
      return undefined;
    },
  }),
}));

import { kolkataTodayStamp } from "@/lib/noticed-date";
import { ItemTooLargeError, ReportValidationError } from "@/lib/repo/errors";
import { MemoryRastabaazRepository } from "@/lib/repo/memory";
import { setRepositoryForTests } from "@/lib/repo/context";
import { createReportAction } from "@/lib/actions";
import { sampleJpegDataUrl } from "./sample-jpeg";

function jpegDataUrl(): string {
  return sampleJpegDataUrl();
}

function form(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  const fields = {
    issueType: "pothole",
    lat: "18.9298",
    lng: "72.8324",
    locationConfirmed: "true",
    photo: jpegDataUrl(),
    noticedWindow: "this_month",
    recurs: "false",
    accident: "none",
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const PHOTO_ERROR = { ok: false, error: "Upload a JPEG, PNG, or WebP photo." };

describe("createReportAction", () => {
  let repo: MemoryRastabaazRepository;

  beforeEach(() => {
    repo = new MemoryRastabaazRepository({ strictPhoto: false });
    setRepositoryForTests(repo);
  });

  afterEach(() => {
    setRepositoryForTests(null);
  });

  it("rejects an invalid issue type", async () => {
    await expect(createReportAction(form({ issueType: "invalid_type" }))).resolves.toEqual({
      ok: false, error: "Choose an issue type.",
    });
  });

  it("rejects a missing issue type", async () => {
    await expect(createReportAction(form({ issueType: "" }))).resolves.toEqual({
      ok: false, error: "Choose an issue type.",
    });
  });

  it("rejects a pin outside Mumbai's wards", async () => {
    await expect(createReportAction(form({ lat: "19.1", lng: "72.8" }))).resolves.toEqual({
      ok: false, error: "Place the pin inside a BMC ward in Mumbai.",
    });
  });

  it("refuses a valid pin that the human did not confirm", async () => {
    await expect(
      createReportAction(form({ locationConfirmed: "false" })),
    ).resolves.toEqual({
      ok: false, error: "Confirm the map pin before recording.",
    });
    await expect(repo.loadCatalog()).resolves.toHaveProperty("reports", []);
  });

  it("rejects a missing photo", async () => {
    await expect(createReportAction(form({ photo: "" }))).resolves.toEqual(PHOTO_ERROR);
  });

  it("rejects an invalid photo string", async () => {
    await expect(createReportAction(form({ photo: "not-a-photo" }))).resolves.toEqual(PHOTO_ERROR);
  });

  it("rejects a citizen sample path", async () => {
    await expect(createReportAction(form({ photo: "/samples/paving.svg" }))).resolves.toEqual(
      PHOTO_ERROR,
    );
  });

  it("rejects a missing noticed window", async () => {
    await expect(createReportAction(form({ noticedWindow: "" }))).resolves.toEqual({
      ok: false, error: "Say when you noticed it.",
    });
  });

  it("rejects an unknown noticed window", async () => {
    await expect(createReportAction(form({ noticedWindow: "yesterday" }))).resolves.toEqual({
      ok: false, error: "Say when you noticed it.",
    });
  });

  describe("Kolkata day stored for sorting", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("stores the Kolkata civil day when the UTC clock is still on the previous date", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-09-07T19:00:00.000Z"));
      const result = await createReportAction(form({ noticedWindow: "today" }));
      expect(result.ok).toBe(true);
      const catalog = await repo.loadCatalog();
      expect(catalog.reports[0]?.noticedAt).toBe("2026-09-08");
      expect(catalog.reports[0]?.noticedWindow).toBe("today");
      expect(catalog.reports[0]?.noticedAt).toBe(kolkataTodayStamp());
    });

    it("stores the previous Kolkata day at 23:59 IST", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-09-07T18:29:59.000Z"));
      const result = await createReportAction(form({ noticedWindow: "this_week" }));
      expect(result.ok).toBe(true);
      const catalog = await repo.loadCatalog();
      expect(catalog.reports[0]?.noticedAt).toBe("2026-09-04");
      expect(catalog.reports[0]?.noticedWindow).toBe("this_week");
    });
  });

  it("rejects an invalid recurs value", async () => {
    await expect(createReportAction(form({ recurs: "yes" }))).resolves.toEqual({
      ok: false, error: "Say whether it has been fixed before and come back.",
    });
  });

  it("rejects a missing accident value", async () => {
    await expect(createReportAction(form({ accident: "" }))).resolves.toEqual({
      ok: false, error: "Say whether you have seen an accident here.",
    });
  });

  it("rejects an unknown accident value", async () => {
    await expect(createReportAction(form({ accident: "flying" }))).resolves.toEqual({
      ok: false, error: "Say whether you have seen an accident here.",
    });
  });

  it("surfaces typed repository validation errors", async () => {
    repo.createReport = async () => {
      throw new ReportValidationError("Place the pin inside a BMC ward in Mumbai.");
    };
    await expect(createReportAction(form())).resolves.toEqual({
      ok: false, error: "Place the pin inside a BMC ward in Mumbai.",
    });
  });

  it("surfaces typed item-too-large errors", async () => {
    repo.createReport = async () => {
      throw new ItemTooLargeError("This record is too large to store.");
    };
    await expect(createReportAction(form())).resolves.toEqual({
      ok: false, error: "This record is too large to store.",
    });
  });

  it("masks unexpected repository errors", async () => {
    repo.createReport = async () => {
      throw new Error("The security token included in the request is invalid.");
    };
    await expect(createReportAction(form())).resolves.toEqual({
      ok: false, error: "Could not record this report.",
    });
  });

  it("returns the new report and writes it through the repository", async () => {
    const photo = jpegDataUrl();
    const result = await createReportAction(form({ photo }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const catalog = await repo.loadCatalog();
    expect(catalog.reports).toHaveLength(1);
    expect(result.reportId).toBe(catalog.reports[0].id);
    expect(result).not.toHaveProperty("placeSlug");
    const stored = await repo.getReport(catalog.reports[0].id);
    expect(await repo.getReportPhoto(catalog.reports[0].id)).toBe(photo);
    expect(stored).not.toHaveProperty("photo");
    expect(stored?.issueType).toBe("pothole");
    expect(stored?.noticedWindow).toBe("this_month");
    expect(stored?.isSample).toBe(false);
  });
});
