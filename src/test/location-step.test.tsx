import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/report/PlacePickerMap", async () => {
  const { useEffect, useRef } = await import("react");
  return {
    MIN_PIN_ZOOM: 14,
    default: function PlacePickerMapStub({
      target,
      onCenter,
    }: {
      target: { lat: number; lng: number; seq: number } | null;
      onCenter: (pin: { lat: number; lng: number } | null) => void;
    }) {
      const seen = useRef<number | null>(null);
      useEffect(() => {
        if (target && seen.current !== target.seq) {
          seen.current = target.seq;
          onCenter({ lat: target.lat, lng: target.lng });
        }
      }, [target, onCenter]);
      return <div data-testid="place-picker-map" />;
    },
  };
});

import { LocationStep } from "@/components/report/LocationStep";
import { LANDMARKS } from "@/lib/city";

const CENTER = { lat: 18.9298, lng: 72.8324 };
const hindmata = LANDMARKS.find((item) => item.id === "loc-hindmata");
if (!hindmata) throw new Error("Hindmata area missing");

type PendingGeo = { ok: PositionCallback; err?: PositionErrorCallback };

function stubGeoQueue() {
  const pending: PendingGeo[] = [];
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (ok: PositionCallback, err?: PositionErrorCallback) => {
        pending.push({ ok, err });
      },
    },
  });
  return pending;
}

function stubGeo(handler: (ok: PositionCallback, err?: PositionErrorCallback) => void) {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: handler } });
}

function coords(lat: number, lng: number): GeolocationPosition {
  return { coords: { latitude: lat, longitude: lng, accuracy: 12 } } as GeolocationPosition;
}

const denied = {
  code: 1,
  message: "denied",
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
} as GeolocationPositionError;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LocationStep", () => {
  it("lets a keyboard user set the pin from a landmark", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LocationStep value={CENTER} onChange={onChange} error={null} />);
    await user.tab();
    await user.tab();
    await user.click(screen.getByRole("button", { name: hindmata.name }));
    expect(onChange).toHaveBeenCalledWith({ lat: hindmata.lat, lng: hindmata.lng });
    expect(screen.getByLabelText("Search for a building, road, area or station")).toBeInTheDocument();
  });

  it("mounts the full-bleed map straight away with nothing to open", async () => {
    render(<LocationStep value={CENTER} onChange={vi.fn()} error={null} />);
    expect(await screen.findByTestId("place-picker-map")).toBeInTheDocument();
    expect(screen.queryByText("Show map")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Where is it?" })).toBeInTheDocument();
  });

  it("shows matching places from /api/places and flies to a picked hit", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          results: [{ id: "p1", name: "Powai Plaza", detail: "Powai", ward: "K Ward", lat: 19.1, lng: 72.9 }],
        }),
      })),
    );
    render(<LocationStep value={null} onChange={onChange} error={null} />);
    await user.type(screen.getByLabelText("Search for a building, road, area or station"), "Powai Plaza");
    const hit = await screen.findByRole("button", { name: /Powai Plaza/ }, { timeout: 1500 });
    await user.click(hit);
    expect(onChange).toHaveBeenCalledWith({ lat: 19.1, lng: 72.9 });
  });

  it("associates geolocation-outside with Use my location", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    stubGeo((ok) => ok(coords(18.52, 73.85)));
    render(<LocationStep value={CENTER} onChange={onChange} error={null} />);
    const locate = screen.getByRole("button", { name: "Use my location" });
    await user.click(locate);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "You seem to be outside Mumbai's wards. Search for the area instead.",
    );
    expect(screen.getByRole("button", { name: "Use my location" })).toBeInTheDocument();
  });

  it("surfaces geolocation failure on the locate control", async () => {
    const user = userEvent.setup();
    stubGeo((_ok, err) => err?.(denied));
    render(<LocationStep value={CENTER} onChange={vi.fn()} error={null} />);
    await user.click(screen.getByRole("button", { name: "Use my location" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Could not read your location.");
    expect(screen.getByRole("button", { name: "Use my location" })).not.toBeDisabled();
  });

  it("lets a later locate win and ignores a stale success", async () => {
    const onChange = vi.fn();
    const pending = stubGeoQueue();
    render(<LocationStep value={CENTER} onChange={onChange} error={null} />);
    const locate = screen.getByRole("button", { name: "Use my location" });
    act(() => {
      locate.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      locate.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(pending).toHaveLength(2);
    pending[0]?.ok(coords(hindmata.lat, hindmata.lng));
    expect(onChange).not.toHaveBeenCalled();
    pending[1]?.ok(coords(18.9277, 72.83185));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith({ lat: 18.9277, lng: 72.83185 });
  });

  it("ignores a late locate after a landmark override", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const pending = stubGeoQueue();
    render(<LocationStep value={CENTER} onChange={onChange} error={null} />);
    await user.click(screen.getByRole("button", { name: "Use my location" }));
    await user.click(screen.getByRole("button", { name: hindmata.name }));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    pending[0]?.ok(coords(18.9277, 72.83185));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ lat: hindmata.lat, lng: hindmata.lng });
  });

  it("does not apply a locate callback after unmount", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const pending = stubGeoQueue();
    const view = render(<LocationStep value={CENTER} onChange={onChange} error={null} />);
    await user.click(screen.getByRole("button", { name: "Use my location" }));
    view.unmount();
    pending[0]?.ok(coords(hindmata.lat, hindmata.lng));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows the picked spot on the card and refocuses search from Change", async () => {
    const user = userEvent.setup();
    render(<LocationStep value={CENTER} onChange={vi.fn()} error={null} />);
    expect(screen.getByText("Reporting this spot")).toBeInTheDocument();
    expect(screen.getByText("Your report goes here")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Change" }));
    expect(screen.getByLabelText("Search for a building, road, area or station")).toHaveFocus();
  });

  it("shows the form's location error alongside the map", () => {
    render(<LocationStep value={null} onChange={vi.fn()} error="Pick a spot on the map." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Pick a spot on the map.");
    expect(screen.getByText("No spot picked yet")).toBeInTheDocument();
  });
});
