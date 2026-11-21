"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { maplibregl } from "@/components/map/maplibre";
import { goTo } from "@/components/map/map-camera";
import { osmStyle } from "@/components/map/map-style";
import { CITY, clampToCity } from "@/lib/city";

export type MapPin = { lat: number; lng: number };
/** A place to fly to. `seq` changes on every request, so picking the same place twice still moves the map. */
export type FlyTarget = MapPin & { seq: number };

/** Below this zoom the centre is a neighbourhood, not a spot, so there is no pin yet. */
export const MIN_PIN_ZOOM = 14;

/**
 * The pin is fixed at the centre and the map moves under it, the way delivery
 * apps confirm an address. Every time the map settles, the centre is the pin.
 */
export default function PlacePickerMap({
  initial,
  target,
  onCenter,
}: {
  initial: MapPin | null;
  target: FlyTarget | null;
  onCenter: (pin: MapPin | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onCenterRef = useRef(onCenter);
  onCenterRef.current = onCenter;
  const initialRef = useRef(initial);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const { bounds } = CITY;
    const box: [[number, number], [number, number]] = [
      [bounds.west, bounds.south],
      [bounds.east, bounds.north],
    ];
    const opening = initialRef.current;
    const map = new maplibregl.Map({
      container: node,
      style: osmStyle(),
      ...(opening
        ? { center: [opening.lng, opening.lat] as [number, number], zoom: CITY.pinZoom }
        : { bounds: box, fitBoundsOptions: { padding: 8 } }),
      minZoom: 9,
      maxZoom: 19,
      maxBounds: box,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

    const settle = () => {
      if (map.getZoom() < MIN_PIN_ZOOM) {
        onCenterRef.current(null);
        return;
      }
      const centre = map.getCenter();
      onCenterRef.current(clampToCity(centre.lat, centre.lng));
    };
    map.on("moveend", settle);
    let cancelled = false;
    map.on("load", () => {
      if (!cancelled) map.resize();
    });

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !target) return;
    goTo(map, [target.lng, target.lat], Math.max(map.getZoom(), CITY.pinZoom));
  }, [target]);

  return (
    <div className="rb-place-canvas">
      <div ref={containerRef} className="rb-map h-full w-full" role="region" aria-label="Map. Move it so the pin sits on the problem." />
    </div>
  );
}
