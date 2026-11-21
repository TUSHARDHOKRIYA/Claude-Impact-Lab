import { cleanup, render } from "@testing-library/react";
import type { MapOptions } from "maplibre-gl";
import { afterEach, expect, it, vi } from "vitest";
import { CityMap } from "@/components/map/CityMap";
import { CITY } from "@/lib/city";

const { openMap } = vi.hoisted(() => ({ openMap: vi.fn<(options: MapOptions) => void>() }));

vi.mock("maplibre-gl", () => ({
  Map: class {
    touchZoomRotate = { disableRotation() {} };

    constructor(options: MapOptions) {
      openMap(options);
    }

    on() {}
    remove() {}
  },
  setWorkerUrl() {},
}));

afterEach(cleanup);

it("fits Mumbai on open and lets the report map zoom out to the region", () => {
  render(<CityMap bare points={[]} places={[]} />);

  expect(openMap).toHaveBeenCalledWith(expect.objectContaining({
    bounds: [
      [CITY.bounds.west, CITY.bounds.south],
      [CITY.bounds.east, CITY.bounds.north],
    ],
    minZoom: 7,
  }));
  expect(openMap.mock.calls[0]?.[0].maxBounds).toBeUndefined();
});
