import type { ExpressionSpecification, Map as MapLibreMap } from "maplibre-gl";
import {
  CLUSTER_LAYER,
  REPORT_SOURCE,
  pointsToGeoJSON,
} from "@/components/map/HeatLayer";
import { readMarkerColors } from "@/components/map/map-style";

export const POINT_LAYER = "kg-points";
export const COUNT_LAYER = "kg-cluster-count";

/**
 * Draw one dot larger. A report id marks that report; otherwise every dot at
 * the selected place.
 */
export function paintSelectedLocation(
  map: MapLibreMap,
  locationId: string | null,
  reportId: string | null = null,
) {
  if (!map.getLayer(POINT_LAYER)) return;
  const marked = (
    reportId
      ? ["==", ["get", "id"], reportId]
      : ["==", ["get", "locationId"], locationId ?? ""]
  ) as ExpressionSpecification;
  map.setPaintProperty(POINT_LAYER, "circle-radius", ["case", marked, 12, 7] as ExpressionSpecification);
  map.setPaintProperty(POINT_LAYER, "circle-stroke-width", ["case", marked, 4, 2] as ExpressionSpecification);
}

export function ensureReportLayers(map: MapLibreMap) {
  if (map.getSource(REPORT_SOURCE)) return;

  const mark = readMarkerColors();

  map.addSource(REPORT_SOURCE, {
    type: "geojson",
    data: pointsToGeoJSON([]),
    cluster: true,
    clusterMaxZoom: 17,
    clusterRadius: 36,
  });

  map.addLayer({
    id: CLUSTER_LAYER,
    type: "circle",
    source: REPORT_SOURCE,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        mark.enamel,
        4,
        mark.horse,
        8,
        mark.oxide,
      ],
      "circle-radius": ["step", ["get", "point_count"], 14, 4, 18, 8, 22],
      "circle-stroke-width": 2,
      "circle-stroke-color": mark.marking,
    },
  });

  map.addLayer({
    id: COUNT_LAYER,
    type: "symbol",
    source: REPORT_SOURCE,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": 12,
      "text-font": ["Open Sans Regular"],
    },
    paint: { "text-color": mark.card },
  });

  map.addLayer({
    id: POINT_LAYER,
    type: "circle",
    source: REPORT_SOURCE,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": [
        "match",
        ["get", "issueType"],
        "pothole",
        mark.oxide,
        "road_cave_in",
        mark.oxide,
        "open_manhole",
        mark.horse,
        "waterlogging",
        mark.enamel,
        "choked_drain",
        mark.enamel,
        mark.enamel,
      ],
      "circle-radius": 7,
      "circle-stroke-width": 2,
      "circle-stroke-color": mark.marking,
    },
  });
}
