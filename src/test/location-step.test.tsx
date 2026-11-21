import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/report/PinMap", () => ({
  default: function PinMapStub() {
    return <div data-testid="pin-map">pin</div>;
  },
}));

import { LocationStep } from "@/components/report/LocationStep";
import { CITY, LANDMARKS } from "@/lib/city";

const CENTER = { lat: 18.9298, lng: 72.8324 };
const horse = LANDMARKS.find((item) => item.id === "black-horse");
if (!horse) throw new Error("black-horse landmark missing");

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

function coords(lat: number, lng: number): GeolocationPosition {
  return { coords: { latitude: lat, longitude: lng } } as GeolocationPosition;
}

afterEach(() => {
  cleanup();
});

describe("LocationStep", () => {
  it("lets a keyboard user set the pin from a landmark", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <LocationStep
        value={CENTER}
        onChange={onChange}
        error={null}
        confirmed={false}
        onConfirm={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: horse.name }));
    expect(onChange).toHaveBeenCalledWith({ lat: horse.lat, lng: horse.lng });
    expect(screen.getByLabelText("Latitude")).toBeInTheDocument();
    expect(screen.getByLabelText("Longitude")).toBeInTheDocument();
  });

  it("mounts the map straight away with nothing to open", async () => {
    render(
      <LocationStep
        value={CENTER}
        onChange={vi.fn()}
        error={null}
        confirmed={false}
        onConfirm={vi.fn()}
      />,
    );
    expect(await screen.findByTestId("pin-map")).toBeInTheDocument();
    expect(screen.queryByText("Show map")).not.toBeInTheDocument();
    expect(document.querySelector("details")).toBeNull();
  });

  it("associates geolocation-outside with Use my location, not Latitude", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (ok: PositionCallback) => ok(coords(19.1, 72.8)),
      },
    });
    render(
      <LocationStep
        value={CENTER}
        onChange={onChange}
        error={null}
        confirmed={false}
        onConfirm={vi.fn()}
      />,
    );
    const locate = screen.getByRole("button", { name: "Use my location" });
    await user.click(locate);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Place the pin inside Kala Ghoda.");
    expect(locate).toHaveAttribute("aria-describedby", "use-location-error");
    expect(screen.getByLabelText("Latitude")).not.toHaveAttribute("aria-invalid");
  });

  it("surfaces geolocation failure on the locate control", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_ok: PositionCallback, err?: PositionErrorCallback) => {
          err?.({
            code: 1,
            message: "denied",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        },
      },
    });
    render(
      <LocationStep
        value={CENTER}
        onChange={vi.fn()}
        error={null}
        confirmed={false}
        onConfirm={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Use my location" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Could not read your location.");
    expect(screen.getByRole("button", { name: "Use my location" })).toHaveAttribute(
      "aria-describedby",
      "use-location-error",
    );
    expect(screen.getByLabelText("Latitude")).not.toHaveAttribute("aria-invalid");
  });

  it("marks latitude invalid only while the displayed value is out of bounds", () => {
    const onChange = vi.fn();
    render(
      <LocationStep
        value={CENTER}
        onChange={onChange}
        error={null}
        confirmed={false}
        onConfirm={vi.fn()}
      />,
    );
    const lat = screen.getByLabelText("Latitude");
    fireEvent.change(lat, { target: { value: "19.9" } });
    expect(lat).toHaveAttribute("aria-invalid", "true");
    fireEvent.blur(lat);
    expect(onChange).toHaveBeenCalledWith({
      lat: CITY.bounds.north,
      lng: CENTER.lng,
    });
  });

  it("clamps longitude to precinct bounds on blur", () => {
    const onChange = vi.fn();
    render(
      <LocationStep
        value={CENTER}
        onChange={onChange}
        error={null}
        confirmed={false}
        onConfirm={vi.fn()}
      />,
    );
    const lng = screen.getByLabelText("Longitude");
    fireEvent.change(lng, { target: { value: "72.8" } });
    fireEvent.blur(lng);
    expect(onChange).toHaveBeenCalledWith({
      lat: CENTER.lat,
      lng: CITY.bounds.west,
    });
  });

  it("rejects a non-numeric latitude and restores the current pin", () => {
    const onChange = vi.fn();
    render(
      <LocationStep
        value={CENTER}
        onChange={onChange}
        error={null}
        confirmed={false}
        onConfirm={vi.fn()}
      />,
    );
    const lat = screen.getByLabelText("Latitude");
    fireEvent.change(lat, { target: { value: "not-a-number" } });
    fireEvent.blur(lat);
    expect(onChange).not.toHaveBeenCalled();
    expect(lat).toHaveValue(String(CENTER.lat));
  });

  it("lets a later locate win and ignores a stale success", () => {
    const onChange = vi.fn();
    const pending = stubGeoQueue();
    render(
      <LocationStep
        value={CENTER}
        onChange={onChange}
        error={null}
        confirmed={false}
        onConfirm={vi.fn()}
      />,
    );
    const locate = screen.getByRole("button", { name: "Use my location" });
    act(() => {
      locate.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      locate.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(locate).toBeDisabled();
    expect(pending).toHaveLength(2);
    pending[0]?.ok(coords(horse.lat, horse.lng));
    expect(onChange).not.toHaveBeenCalled();
    pending[1]?.ok(coords(18.9277, 72.83185));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ lat: 18.9277, lng: 72.83185 });
  });

  it("ignores a late locate after a landmark override", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const pending = stubGeoQueue();
    render(
      <LocationStep
        value={CENTER}
        onChange={onChange}
        error={null}
        confirmed={false}
        onConfirm={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Use my location" }));
    await user.click(screen.getByRole("button", { name: horse.name }));
    expect(onChange).toHaveBeenCalledTimes(1);
    pending[0]?.ok(coords(18.9277, 72.83185));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ lat: horse.lat, lng: horse.lng });
  });

  it("does not apply a locate callback after unmount", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const pending = stubGeoQueue();
    const view = render(
      <LocationStep
        value={CENTER}
        onChange={onChange}
        error={null}
        confirmed={false}
        onConfirm={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Use my location" }));
    view.unmount();
    pending[0]?.ok(coords(horse.lat, horse.lng));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("requires a separate confirmation and lets a later pin change invalidate it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <LocationStep
        value={CENTER}
        onChange={onChange}
        error={null}
        confirmed={false}
        onConfirm={onConfirm}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Confirm this pin" }));
    expect(onConfirm).toHaveBeenCalledOnce();

    rerender(
      <LocationStep
        value={CENTER}
        onChange={onChange}
        error={null}
        confirmed
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByText("Pin confirmed")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Jehangir Art Gallery/i }));
    expect(onChange).toHaveBeenCalled();
  });
});
