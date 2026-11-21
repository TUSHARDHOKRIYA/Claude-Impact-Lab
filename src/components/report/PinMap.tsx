"use client";

import { useEffect, useRef } from "react";
import { maplibregl } from "@/components/map/maplibre";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { goTo } from "@/components/map/map-camera";
import { osmStyle } from "@/components/map/map-style";
import { CITY, clampToCity } from "@/lib/city";

export type MapPin = { lat: number; lng: number };

type PinMapProps = {
  value: MapPin | null;
  onChange: (pin: MapPin) => void;
  /** A shorter map with no hint line, for the card inside the voice chat. */
  compact?: boolean;
};

const EMPTY_HINT = "Or zoom in and tap the spot on the map.";
const PLACED_HINT = "Drag the pin or tap the map to move it onto the exact spot.";

export function PinMap({ value, onChange, compact = false }: PinMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const openAtRef = useRef(value);
  const latestRef = useRef(value);
  latestRef.current = value;
  /** Set when the move started on this map, so the camera does not chase a drag or tap. */
  const selfMoveRef = useRef(false);
  /** The map opens centred on the pin, or on the precinct when there is none yet. */
  const cameraReadyRef = useRef(false);
  const placeMarkerRef = useRef<(pin: MapPin) => void>(() => {});

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const { bounds, defaultZoom, center } = CITY;
    const opening = openAtRef.current;
    const start = clampToCity(opening?.lat ?? center.lat, opening?.lng ?? center.lng);
    const map = new maplibregl.Map({
      container: node,
      style: osmStyle(),
      center: [start.lng, start.lat],
      zoom: opening ? CITY.pinZoom : defaultZoom,
      minZoom: 10,
      maxZoom: 19,
      maxBounds: [
        [bounds.west, bounds.south],
        [bounds.east, bounds.north],
      ],
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const emit = (lng: number, lat: number) => {
      const pin = clampToCity(lat, lng);
      const current = latestRef.current;
      selfMoveRef.current = !current || pin.lat !== current.lat || pin.lng !== current.lng;
      placeMarkerRef.current(pin);
      onChangeRef.current(pin);
    };

    const placeMarker = (pin: MapPin) => {
      const clamped = clampToCity(pin.lat, pin.lng);
      const marker = markerRef.current;
      if (marker) {
        marker.setLngLat([clamped.lng, clamped.lat]);
        return;
      }
      const created = new maplibregl.Marker({ color: "#c4271d", draggable: true })
        .setLngLat([clamped.lng, clamped.lat])
        .addTo(map);
      created.on("dragend", () => {
        const next = created.getLngLat();
        emit(next.lng, next.lat);
      });
      markerRef.current = created;
    };
    placeMarkerRef.current = placeMarker;
    if (opening) placeMarker(opening);

    map.on("click", (event) => emit(event.lngLat.lng, event.lngLat.lat));
    let cancelled = false;
    map.on("load", () => {
      if (!cancelled) map.resize();
    });

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (!cancelled) map.resize();
          })
        : null;
    observer?.observe(node);

    return () => {
      cancelled = true;
      observer?.disconnect();
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  const pinLat = value?.lat;
  const pinLng = value?.lng;
  useEffect(() => {
    if (pinLat == null || pinLng == null) {
      cameraReadyRef.current = true;
      return;
    }
    const pin = clampToCity(pinLat, pinLng);
    placeMarkerRef.current(pin);
    if (!cameraReadyRef.current) {
      cameraReadyRef.current = true;
      return;
    }
    if (selfMoveRef.current) {
      selfMoveRef.current = false;
      return;
    }
    const map = mapRef.current;
    if (map) goTo(map, [pin.lng, pin.lat], Math.max(map.getZoom(), CITY.pinZoom));
  }, [pinLat, pinLng]);

  const hint = value ? PLACED_HINT : EMPTY_HINT;
  return (
    <div>
      {compact ? null : (
        <p id="pin-map-hint" className="ux4g-body-s-default ux4g-text-neutral-secondary mb-2">
          {hint}
        </p>
      )}
      <div
        ref={containerRef}
        className={`rb-map rb-pinmap w-full ${compact ? "h-56" : "h-72"}`}
        role="region"
        aria-label={
          value
            ? "Mumbai map. Drag the pin or tap the map to mark the problem."
            : "Mumbai map. Tap the map where the problem is."
        }
        aria-describedby={compact ? undefined : "pin-map-hint"}
      />
    </div>
  );
}

export default PinMap;
