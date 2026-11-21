import type { Map as MapLibreMap } from "maplibre-gl";

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function goTo(map: MapLibreMap, center: [number, number], zoom: number) {
  const camera = { center, zoom };
  if (prefersReducedMotion()) map.jumpTo(camera);
  else map.flyTo({ ...camera, duration: 700, essential: true });
}
