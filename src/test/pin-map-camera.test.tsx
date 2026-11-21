import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CITY } from "@/lib/city";

type Handler = (event?: unknown) => void;

const mapHandlers = new Map<string, Handler>();
const markerHandlers = new Map<string, Handler>();
const flyTo = vi.fn();
const jumpTo = vi.fn();
let markerAt = { lng: 0, lat: 0 };
let openedAt: { center?: [number, number] } | null = null;
let markersMade = 0;

vi.mock("maplibre-gl", () => {
  class FakeMap {
    constructor(options: { center?: [number, number] }) {
      openedAt = options;
    }
    on(name: string, handler: Handler) {
      mapHandlers.set(name, handler);
      return this;
    }
    addControl() {
      return this;
    }
    resize() {}
    remove() {}
    getZoom() {
      return 16.4;
    }
    flyTo(camera: unknown) {
      flyTo(camera);
    }
    jumpTo(camera: unknown) {
      jumpTo(camera);
    }
  }
  class FakeMarker {
    constructor() {
      markersMade += 1;
    }
    setLngLat(position: [number, number]) {
      markerAt = { lng: position[0], lat: position[1] };
      return this;
    }
    addTo() {
      return this;
    }
    on(name: string, handler: Handler) {
      markerHandlers.set(name, handler);
      return this;
    }
    getLngLat() {
      return markerAt;
    }
    remove() {}
  }
  class FakeNavigationControl {}
  return {
    Map: FakeMap,
    Marker: FakeMarker,
    NavigationControl: FakeNavigationControl,
    setWorkerUrl: () => {},
  };
});

import { PinMap } from "@/components/report/PinMap";

const CENTRE = { lat: CITY.center.lat, lng: CITY.center.lng };
const ELSEWHERE = { lat: 18.9277, lng: 72.83185 };

beforeEach(() => {
  mapHandlers.clear();
  markerHandlers.clear();
  flyTo.mockClear();
  jumpTo.mockClear();
  markerAt = { lng: CENTRE.lng, lat: CENTRE.lat };
  openedAt = null;
  markersMade = 0;
});

afterEach(cleanup);

function camera(): unknown[] {
  return [...flyTo.mock.calls, ...jumpTo.mock.calls].flat();
}

describe("PinMap camera", () => {
  it("does not chase a drag that moved the pin", () => {
    const onChange = vi.fn();
    const view = render(<PinMap value={CENTRE} onChange={onChange} />);
    markerAt = { lng: ELSEWHERE.lng, lat: ELSEWHERE.lat };
    markerHandlers.get("dragend")?.();
    expect(onChange).toHaveBeenCalledWith(ELSEWHERE);
    view.rerender(<PinMap value={ELSEWHERE} onChange={onChange} />);
    expect(camera()).toEqual([]);
  });

  it("follows a pin moved from outside the map", () => {
    const onChange = vi.fn();
    const view = render(<PinMap value={CENTRE} onChange={onChange} />);
    view.rerender(<PinMap value={ELSEWHERE} onChange={onChange} />);
    expect(flyTo).toHaveBeenCalledTimes(1);
    expect(flyTo.mock.calls[0][0]).toMatchObject({
      center: [ELSEWHERE.lng, ELSEWHERE.lat],
    });
  });

  it("still follows the next outside move after a drag that changed nothing", () => {
    const onChange = vi.fn();
    const view = render(<PinMap value={CENTRE} onChange={onChange} />);
    // Dropped exactly where it started: neither coordinate changes, so the
    // coordinate effect never runs and must not be left owed a skip.
    markerHandlers.get("dragend")?.();
    expect(onChange).toHaveBeenCalledWith(CENTRE);
    view.rerender(<PinMap value={CENTRE} onChange={onChange} />);
    view.rerender(<PinMap value={ELSEWHERE} onChange={onChange} />);
    expect(flyTo).toHaveBeenCalledTimes(1);
    expect(flyTo.mock.calls[0][0]).toMatchObject({
      center: [ELSEWHERE.lng, ELSEWHERE.lat],
    });
  });

  it("still follows after a tap that clamps back onto the current pin", () => {
    const onChange = vi.fn();
    const view = render(<PinMap value={CENTRE} onChange={onChange} />);
    mapHandlers.get("click")?.({ lngLat: { lng: CENTRE.lng, lat: CENTRE.lat } });
    view.rerender(<PinMap value={CENTRE} onChange={onChange} />);
    view.rerender(<PinMap value={ELSEWHERE} onChange={onChange} />);
    expect(flyTo).toHaveBeenCalledTimes(1);
  });

  it("opens on the pin the form already holds, not the precinct centre", () => {
    render(<PinMap value={ELSEWHERE} onChange={vi.fn()} />);
    expect(openedAt?.center).toEqual([ELSEWHERE.lng, ELSEWHERE.lat]);
    expect(markerAt).toEqual({ lng: ELSEWHERE.lng, lat: ELSEWHERE.lat });
    expect(markersMade).toBe(1);
    expect(flyTo).not.toHaveBeenCalled();
  });

  it("flies to the first pin placed from an empty map", () => {
    const onChange = vi.fn();
    const view = render(<PinMap value={null} onChange={onChange} />);
    expect(markersMade).toBe(0);
    expect(openedAt?.center).toEqual([CENTRE.lng, CENTRE.lat]);
    view.rerender(<PinMap value={ELSEWHERE} onChange={onChange} />);
    expect(flyTo).toHaveBeenCalledTimes(1);
    expect(flyTo.mock.calls[0][0]).toMatchObject({
      center: [ELSEWHERE.lng, ELSEWHERE.lat],
    });
  });

  it("flies to a landmark the voice proposed", () => {
    const onChange = vi.fn();
    const view = render(<PinMap value={null} onChange={onChange} />);
    view.rerender(<PinMap value={CENTRE} onChange={onChange} />);
    flyTo.mockClear();
    view.rerender(<PinMap value={ELSEWHERE} onChange={onChange} />);
    expect(flyTo).toHaveBeenCalledTimes(1);
    expect(flyTo.mock.calls[0][0]).toMatchObject({
      center: [ELSEWHERE.lng, ELSEWHERE.lat],
    });
  });
});
