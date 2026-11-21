"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { maplibregl } from "@/components/map/maplibre";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { HeatLayer, REPORT_SOURCE, pointsToGeoJSON } from "@/components/map/HeatLayer";
import { MapLegend } from "@/components/map/MapLegend";
import { PlacePreview } from "@/components/map/PlacePreview";
import { goTo } from "@/components/map/map-camera";
import { ensureReportLayers, paintSelectedLocation } from "@/components/map/map-layers";
import { osmStyle } from "@/components/map/map-style";
import { useMapClicks } from "@/components/map/use-map-clicks";
import { CITY } from "@/lib/city";
import type { MapReportPoint, PlaceSummary } from "@/lib/types";

const MAP_HINT_ID = "rb-map-list-hint";

export function CityMap({
  points,
  places,
  initialLocationId,
  focusPoint,
  focusZoom = 17.2,
  highlightReportId,
  highlightLocationId,
  selectedId: selectedIdProp,
  onSelect,
  openerRef,
}: {
  points: MapReportPoint[];
  places: PlaceSummary[];
  initialLocationId?: string;
  /** Fly here even when the place is not in the list yet. */
  focusPoint?: { lat: number; lng: number };
  focusZoom?: number;
  highlightReportId?: string;
  highlightLocationId?: string;
  selectedId?: string | null;
  onSelect?: (locationId: string | null) => void;
  openerRef?: RefObject<HTMLElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const focusedRef = useRef(false);
  const localOpenerRef = useRef<HTMLElement | null>(null);
  const previewOpenerRef = openerRef ?? localOpenerRef;
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [internalId, setInternalId] = useState<string | null>(
    initialLocationId ?? null,
  );
  const selectedId = selectedIdProp !== undefined ? selectedIdProp : internalId;
  const setSelectedId = onSelect ?? setInternalId;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const instance = new maplibregl.Map({
      container: node,
      style: osmStyle(),
      center: [CITY.center.lng, CITY.center.lat],
      zoom: CITY.defaultZoom,
      minZoom: 14,
      maxZoom: 19,
      maxBounds: [
        [CITY.bounds.west, CITY.bounds.south],
        [CITY.bounds.east, CITY.bounds.north],
      ],
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });

    instance.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    let cancelled = false;
    instance.on("load", () => {
      if (cancelled) return;
      ensureReportLayers(instance);
      setMap(instance);
    });

    return () => {
      cancelled = true;
      setMap(null);
      instance.remove();
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    ensureReportLayers(map);
    const source = map.getSource(REPORT_SOURCE) as GeoJSONSource | undefined;
    source?.setData(pointsToGeoJSON(points));
  }, [map, points]);

  useMapClicks(map, (locationId) => {
    if (locationId && containerRef.current) {
      previewOpenerRef.current = containerRef.current;
    }
    setSelectedId(locationId);
  });

  useEffect(() => {
    if (!map || !containerRef.current || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => {
      map.resize();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    if (!map || focusedRef.current) return;
    if (focusPoint) {
      focusedRef.current = true;
      if (initialLocationId && places.some((item) => item.location.id === initialLocationId)) {
        setSelectedId(initialLocationId);
      }
      goTo(map, [focusPoint.lng, focusPoint.lat], focusZoom);
      return;
    }
    if (!initialLocationId) return;
    const place = places.find((item) => item.location.id === initialLocationId);
    if (!place) return;
    focusedRef.current = true;
    setSelectedId(place.location.id);
    goTo(map, [place.location.lng, place.location.lat], focusZoom);
  }, [map, focusPoint, initialLocationId, places, setSelectedId, focusZoom]);

  useEffect(() => {
    if (selectedId && !points.some((point) => point.locationId === selectedId)) {
      setSelectedId(null);
    }
  }, [points, selectedId, setSelectedId]);

  useEffect(() => {
    if (!map) return;
    // The submitted report's own dot stands out only while its place is the
    // selected one; picking another place highlights that place as usual.
    const ownDot = selectedId !== null && selectedId === highlightLocationId ? (highlightReportId ?? null) : null;
    paintSelectedLocation(map, selectedId, ownDot);
  }, [map, selectedId, highlightReportId, highlightLocationId]);

  const selected = places.find((place) => place.location.id === selectedId);

  return (
    <div className="ux4g-card ux4g-card-outline ux4g-card-vertical">
      <p id={MAP_HINT_ID} className="ux4g-text ux4g-text-neutral-secondary px-4 pt-3">
        A list of the same places sits next to this map.
      </p>
      <div className="relative">
        <div
          ref={containerRef}
          className="rb-map h-[min(70dvh,36rem)] min-h-[22rem] w-full bg-paper"
          role="region"
          aria-label="Map of road reports in Mumbai"
          aria-describedby={MAP_HINT_ID}
        />
        <HeatLayer map={map} points={points} />
        {selected ? (
          <PlacePreview
            place={selected}
            onClose={() => setSelectedId(null)}
            openerRef={previewOpenerRef}
            yourReportId={
              highlightReportId && selected.location.id === highlightLocationId
                ? highlightReportId
                : undefined
            }
          />
        ) : null}
      </div>
      <MapLegend />
    </div>
  );
}
