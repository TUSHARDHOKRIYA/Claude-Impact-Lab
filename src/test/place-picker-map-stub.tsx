import { useEffect, useRef } from "react";

import type { FlyTarget, MapPin } from "@/components/report/PlacePickerMap";

/**
 * Test double for the full-bleed PlacePickerMap. The real map reports its
 * centre on `moveend`; here, flying to a target settles immediately and calls
 * `onCenter` once per request. `seq` guards against a repeated fly to the same
 * spot being swallowed by React's dependency check.
 */
export function PlacePickerMapStub({
  target,
  onCenter,
}: {
  initial: MapPin | null;
  target: FlyTarget | null;
  onCenter: (pin: MapPin | null) => void;
}) {
  const seen = useRef<number | null>(null);
  useEffect(() => {
    if (target && seen.current !== target.seq) {
      seen.current = target.seq;
      onCenter({ lat: target.lat, lng: target.lng });
    }
  }, [target, onCenter]);
  return <div data-testid="place-picker-map" />;
}
