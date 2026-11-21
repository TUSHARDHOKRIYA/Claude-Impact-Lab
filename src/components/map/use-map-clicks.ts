"use client";

import { useEffect, useRef } from "react";
import type {
  GeoJSONSource,
  MapGeoJSONFeature,
  MapLayerMouseEvent,
  Map as MapLibreMap,
} from "maplibre-gl";
import { CLUSTER_LAYER, REPORT_SOURCE } from "@/components/map/HeatLayer";
import { goTo } from "@/components/map/map-camera";
import { POINT_LAYER } from "@/components/map/map-layers";

function openCluster(
  map: MapLibreMap,
  feature: MapGeoJSONFeature,
  onPlace: (locationId: string) => void,
) {
  const source = map.getSource(REPORT_SOURCE) as GeoJSONSource | undefined;
  if (!source || feature.geometry.type !== "Point") return;
  const clusterId = Number(feature.properties?.cluster_id);
  const coords = feature.geometry.coordinates as [number, number];

  void source
    .getClusterLeaves(clusterId, 1000, 0)
    .then((leaves) => {
      const ids = new Set(
        leaves
          .map((leaf) => String(leaf.properties?.locationId ?? ""))
          .filter(Boolean),
      );
      if (ids.size === 1) {
        onPlace([...ids][0]);
        return;
      }
      return source.getClusterExpansionZoom(clusterId).then((zoom) => {
        goTo(map, coords, zoom);
      });
    })
    .catch(() => {
      void source.getClusterExpansionZoom(clusterId).then((zoom) => {
        goTo(map, coords, zoom);
      });
    });
}

export function useMapClicks(
  map: MapLibreMap | null,
  onPlace: (locationId: string | null) => void,
) {
  const onPlaceRef = useRef(onPlace);
  onPlaceRef.current = onPlace;

  useEffect(() => {
    if (!map) return;

    const onClick = (event: MapLayerMouseEvent) => {
      const layers = [CLUSTER_LAYER, POINT_LAYER].filter((id) => map.getLayer(id));
      const hits = map.queryRenderedFeatures(event.point, { layers });
      if (hits.length === 0) {
        onPlaceRef.current(null);
        return;
      }
      const feature = hits[0];
      if (feature.properties?.cluster) {
        openCluster(map, feature, (id) => onPlaceRef.current(id));
        return;
      }
      const locationId = feature.properties?.locationId;
      if (locationId) onPlaceRef.current(String(locationId));
    };

    const pointer = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const clear = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", onClick);
    map.on("mouseenter", CLUSTER_LAYER, pointer);
    map.on("mouseenter", POINT_LAYER, pointer);
    map.on("mouseleave", CLUSTER_LAYER, clear);
    map.on("mouseleave", POINT_LAYER, clear);

    return () => {
      map.off("click", onClick);
      map.off("mouseenter", CLUSTER_LAYER, pointer);
      map.off("mouseenter", POINT_LAYER, pointer);
      map.off("mouseleave", CLUSTER_LAYER, clear);
      map.off("mouseleave", POINT_LAYER, clear);
    };
  }, [map]);
}
