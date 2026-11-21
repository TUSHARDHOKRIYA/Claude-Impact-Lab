import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/components/map/KalaGhodaMap", () => ({
  KalaGhodaMap: () => <div data-testid="kg-map-enhancement">map</div>,
}));

import MapPage from "@/app/map/page";
import { setRepositoryForTests } from "@/lib/repo/context";
import { MemoryKhabarRepository } from "@/lib/repo/memory";
import {
  createReport,
  getMapInsights,
  listMapPoints,
  listPlaces,
} from "@/lib/queries";

const PHOTO = "data:image/jpeg;base64,/9j/4AAQ";

afterEach(() => {
  cleanup();
  setRepositoryForTests(null);
});

describe("shared catalog memoization", () => {
  it("loads the catalog once across concurrent public list helpers", async () => {
    const repo = new MemoryKhabarRepository({ strictPhoto: false });
    const spy = vi.spyOn(repo, "loadCatalog");
    setRepositoryForTests(repo);
    await Promise.all([listMapPoints(), listPlaces(), getMapInsights()]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("honors an explicit repo override instead of the test singleton", async () => {
    const scoped = new MemoryKhabarRepository({ strictPhoto: false });
    const fallback = new MemoryKhabarRepository({ strictPhoto: false });
    const scopedSpy = vi.spyOn(scoped, "loadCatalog");
    const fallbackSpy = vi.spyOn(fallback, "loadCatalog");
    setRepositoryForTests(fallback);
    await listPlaces(scoped);
    expect(scopedSpy).toHaveBeenCalledTimes(1);
    expect(fallbackSpy).not.toHaveBeenCalled();
  });

  it("loads the catalog once for one map page render", async () => {
    const repo = new MemoryKhabarRepository({ strictPhoto: false });
    const spy = vi.spyOn(repo, "loadCatalog");
    setRepositoryForTests(repo);
    render(await MapPage({ searchParams: Promise.resolve({}) }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("does not keep a settled snapshot on the same repo", async () => {
    const repo = new MemoryKhabarRepository({ strictPhoto: false });
    const spy = vi.spyOn(repo, "loadCatalog");
    setRepositoryForTests(repo);
    await Promise.all([listPlaces(), listMapPoints()]);
    expect(spy).toHaveBeenCalledTimes(1);
    await listPlaces();
    expect(spy).toHaveBeenCalledTimes(2);
    await listPlaces();
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("evicts a rejected load so the same repo can retry", async () => {
    const repo = new MemoryKhabarRepository({ strictPhoto: false });
    const spy = vi.spyOn(repo, "loadCatalog");
    spy.mockRejectedValueOnce(new Error("catalog unavailable"));
    setRepositoryForTests(repo);
    await expect(listPlaces()).rejects.toThrow("catalog unavailable");
    expect(spy).toHaveBeenCalledTimes(1);
    await expect(listPlaces()).resolves.toEqual([]);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("sees a later write on the next catalog read of the same repo", async () => {
    const repo = new MemoryKhabarRepository({ strictPhoto: false });
    setRepositoryForTests(repo);
    expect(await listPlaces()).toEqual([]);
    await createReport({
      issueType: "road",
      lat: 18.92855,
      lng: 72.83135,
      photo: PHOTO,
      noticedAt: "2026-09-01",
      recurs: false,
      affects: ["driving"],
      description: null,
    });
    const places = await listPlaces();
    expect(places).toHaveLength(1);
    expect(places[0]?.location.id).toBeTruthy();
  });
});
