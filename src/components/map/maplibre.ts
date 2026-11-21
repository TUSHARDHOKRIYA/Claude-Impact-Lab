import * as maplibregl from "maplibre-gl";

/** Copied there by `scripts/copy-maplibre-worker.mjs` on install, dev and build. */
export const MAPLIBRE_WORKER_URL = "/maplibre/maplibre-gl-worker.mjs";

// Must run before the first Map is built; the worker pool reads it once.
if (typeof window !== "undefined") maplibregl.setWorkerUrl(MAPLIBRE_WORKER_URL);

export { maplibregl };
