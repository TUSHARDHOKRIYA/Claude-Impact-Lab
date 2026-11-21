import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MAX_PLACE_RESULTS,
  clearPlaceSearchCache,
  mapPhotonCollection,
  normalizePlaceQuery,
  searchPlaces,
} from "@/lib/places-search";

/** Inside the Powai ward S polygon (the Powai locality centre). */
const POWAI = [72.925854, 19.147357] as const;
/** Riddhi Gardens, near Kandivali. */
const RIDDHI = [72.8722, 19.1784] as const;
/** Pune: well outside the city box. */
const PUNE = [73.8567, 18.5204] as const;

function feature(
  coords: readonly [number, number] | null,
  properties: Record<string, unknown>,
): Record<string, unknown> {
  return {
    type: "Feature",
    geometry: coords ? { type: "Point", coordinates: [...coords] } : null,
    properties,
  };
}

function collection(...features: unknown[]) {
  return { type: "FeatureCollection", features };
}

describe("mapPhotonCollection", () => {
  it("maps a named city feature to the PlaceHit shape", () => {
    const hits = mapPhotonCollection(
      collection(
        feature(POWAI, {
          name: "Powai Plaza",
          street: "Hiranandani Gardens",
          locality: "Powai",
          district: "S Ward",
          osm_id: 123456,
          osm_type: "W",
        }),
      ),
    );
    expect(hits).toEqual([
      {
        id: "W123456",
        name: "Powai Plaza",
        detail: "Hiranandani Gardens, Powai, S Ward",
        ward: "S",
        lat: POWAI[1],
        lng: POWAI[0],
      },
    ]);
  });

  it("builds detail from non-empty, deduplicated parts and drops the name itself", () => {
    const [hit] = mapPhotonCollection(
      collection(
        feature(RIDDHI, {
          name: "Riddhi Gardens",
          street: "  ",
          locality: "Powai",
          district: "powai",
          osm_id: 9,
          osm_type: "N",
        }),
      ),
    );
    expect(hit.detail).toBe("Powai");
    expect(hit.id).toBe("N9");
  });

  it("drops features without a name", () => {
    const hits = mapPhotonCollection(
      collection(feature(POWAI, { street: "No name street", osm_id: 1, osm_type: "N" })),
    );
    expect(hits).toEqual([]);
  });

  it("drops features outside the city, including the Pune point", () => {
    const hits = mapPhotonCollection(
      collection(
        feature(PUNE, { name: "Pune Station", osm_id: 2, osm_type: "N" }),
        feature(POWAI, { name: "Inside", osm_id: 3, osm_type: "N" }),
      ),
    );
    expect(hits.map((hit) => hit.name)).toEqual(["Inside"]);
  });

  it("drops features with no usable coordinates", () => {
    const hits = mapPhotonCollection(
      collection(
        feature(null, { name: "Nowhere", osm_id: 4, osm_type: "N" }),
        { type: "Feature", geometry: { type: "Point", coordinates: ["x", 19.1] }, properties: { name: "Bad" } },
      ),
    );
    expect(hits).toEqual([]);
  });

  it("merges the same name at the same spot, but keeps same-name places far apart", () => {
    const hits = mapPhotonCollection(
      collection(
        feature(POWAI, { name: "Powai Plaza", osm_id: 1, osm_type: "W" }),
        feature([POWAI[0] + 0.0001, POWAI[1] + 0.0001], { name: "powai plaza", osm_id: 2, osm_type: "N" }),
        feature(RIDDHI, { name: "Powai Plaza", osm_id: 3, osm_type: "W" }),
      ),
    );
    expect(hits.map((hit) => hit.id)).toEqual(["W1", "W3"]);
  });

  it("keeps at most six results", () => {
    const features = Array.from({ length: 10 }, (_, i) =>
      feature([POWAI[0] + i * 0.0005, POWAI[1]], { name: `Garden ${i}`, osm_id: i, osm_type: "W" }),
    );
    const hits = mapPhotonCollection(collection(...features));
    expect(MAX_PLACE_RESULTS).toBe(6);
    expect(hits).toHaveLength(6);
    expect(hits[0].name).toBe("Garden 0");
  });

  it("falls back to a coordinate id when the OSM fields are missing", () => {
    const [hit] = mapPhotonCollection(collection(feature(POWAI, { name: "Plain" })));
    expect(hit.id).toBe(`pt:${POWAI[1].toFixed(5)},${POWAI[0].toFixed(5)}`);
    expect(hit.detail).toBe("");
  });

  it("returns an empty list for anything that is not a FeatureCollection", () => {
    expect(mapPhotonCollection(null)).toEqual([]);
    expect(mapPhotonCollection("oops")).toEqual([]);
    expect(mapPhotonCollection({ features: "nope" })).toEqual([]);
  });
});

describe("normalizePlaceQuery", () => {
  it("trims and enforces the 2 to 80 character range", () => {
    expect(normalizePlaceQuery("  pa  ")).toBe("pa");
    expect(normalizePlaceQuery("p")).toBeNull();
    expect(normalizePlaceQuery("   ")).toBeNull();
    expect(normalizePlaceQuery("x".repeat(80))).toHaveLength(80);
    expect(normalizePlaceQuery("x".repeat(81))).toBeNull();
  });
});

describe("searchPlaces", () => {
  beforeEach(() => {
    clearPlaceSearchCache();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function okFetch(body: unknown) {
    return vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
  }

  it("does not call upstream for a short query", async () => {
    const fetchMock = okFetch(collection());
    await expect(searchPlaces("p", { fetch: fetchMock })).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the encoded query, the Mumbai bbox and the generic user agent", async () => {
    const fetchMock = okFetch(collection(feature(POWAI, { name: "Powai Plaza", osm_id: 1, osm_type: "W" })));
    const hits = await searchPlaces("powai plaza", { fetch: fetchMock });
    expect(hits.map((hit) => hit.name)).toEqual(["Powai Plaza"]);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://photon.komoot.io/api/?q=powai%20plaza&bbox=72.77,18.89,73.05,19.28&limit=8&lang=en",
    );
    expect(new Headers(init.headers).get("User-Agent")).toBe("rastabaaz-place-search");
  });

  it("serves a repeat query from the cache until the TTL passes", async () => {
    const fetchMock = okFetch(collection(feature(POWAI, { name: "Powai Plaza", osm_id: 1, osm_type: "W" })));
    await searchPlaces("Powai Plaza", { fetch: fetchMock, now: () => 0 });
    await searchPlaces("  powai plaza ", { fetch: fetchMock, now: () => 9 * 60_000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await searchPlaces("powai plaza", { fetch: fetchMock, now: () => 10 * 60_000 + 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns an empty list on a non-OK status and does not cache it", async () => {
    const fetchMock = vi.fn(async () => new Response("down", { status: 503 }));
    await expect(searchPlaces("powai", { fetch: fetchMock })).resolves.toEqual([]);
    await expect(searchPlaces("powai", { fetch: fetchMock })).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns an empty list when fetch rejects", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("network down");
    });
    await expect(searchPlaces("powai", { fetch: fetchMock })).resolves.toEqual([]);
  });

  it("aborts a slow upstream after four seconds and returns an empty list", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_url: unknown, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    const pending = searchPlaces("powai", { fetch: fetchMock as unknown as typeof fetch });
    await vi.advanceTimersByTimeAsync(4000);
    await expect(pending).resolves.toEqual([]);
  });
});
