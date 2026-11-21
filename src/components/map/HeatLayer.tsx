"use client";

import { useEffect } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { token } from "@/components/map/map-style";
import type { MapReportPoint } from "@/lib/types";

export const HEAT_SOURCE = "rb-heat";
export const HEAT_LAYER = "rb-heat-layer";
export const REPORT_SOURCE = "rb-reports";
export const CLUSTER_LAYER = "rb-clusters";

export type ReportFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: {
      id: string;
      locationId: string;
      issueType: string;
      noticedAt: string;
    };
  }>;
};

export function pointsToGeoJSON(
  points: MapReportPoint[],
): ReportFeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [point.lng, point.lat] },
      properties: {
        id: point.id,
        locationId: point.locationId,
        issueType: point.issueType,
        noticedAt: point.noticedAt,
      },
    })),
  };
}

export function HeatLayer({
  map,
  points,
}: {
  map: MapLibreMap | null;
  points: MapReportPoint[];
}) {
  useEffect(() => {
    if (!map) return;

    const marking = token("--marking", "#ffab27");
    const oxide = token("--oxide", "#db372d");
    const before = map.getLayer(CLUSTER_LAYER) ? CLUSTER_LAYER : undefined;

    if (!map.getSource(HEAT_SOURCE)) {
      map.addSource(HEAT_SOURCE, {
        type: "geojson",
        data: pointsToGeoJSON([]),
      });
      map.addLayer(
        {
          id: HEAT_LAYER,
          type: "heatmap",
          source: HEAT_SOURCE,
          paint: {
            "heatmap-weight": 1,
            "heatmap-intensity": 0.85,
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              14,
              16,
              17,
              28,
            ],
            "heatmap-opacity": 0.7,
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(255,171,39,0)",
              0.25,
              marking,
              0.55,
              oxide,
              1,
              oxide,
            ],
          },
        },
        before,
      );
    }

    return () => {
      if (!map.getStyle()) return;
      if (map.getLayer(HEAT_LAYER)) map.removeLayer(HEAT_LAYER);
      if (map.getSource(HEAT_SOURCE)) map.removeSource(HEAT_SOURCE);
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const source = map.getSource(HEAT_SOURCE) as GeoJSONSource | undefined;
    source?.setData(pointsToGeoJSON(points));
  }, [map, points]);

  return null;
}
