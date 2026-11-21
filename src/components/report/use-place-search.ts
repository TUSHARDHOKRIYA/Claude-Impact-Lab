"use client";

import { useEffect, useState } from "react";

import { searchLocalities } from "@/lib/city";
import type { PlaceHit } from "@/lib/places-search";

export type PlaceRow = { id: string; name: string; detail: string; lat: number; lng: number };

const DEBOUNCE_MS = 280;

/**
 * Search as you type. Known areas and stations answer instantly from the
 * local list; buildings, societies and shops (Powai Plaza, Riddhi Gardens)
 * come from the map search behind /api/places a moment later.
 */
export function usePlaceSearch(query: string): { rows: PlaceRow[]; loading: boolean } {
  const q = query.trim();
  const [remote, setRemote] = useState<{ q: string; hits: PlaceHit[] }>({ q: "", hits: [] });

  useEffect(() => {
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = res.ok ? ((await res.json()) as { results?: PlaceHit[] }) : null;
        setRemote({ q, hits: data?.results ?? [] });
      } catch {
        if (!controller.signal.aborted) setRemote({ q, hits: [] });
      }
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [q]);

  const local: PlaceRow[] = searchLocalities(q, 4).map((row) => ({
    id: row.id,
    name: row.name,
    detail: `${row.ward} ward`,
    lat: row.lat,
    lng: row.lng,
  }));
  const fresh = remote.q === q ? remote.hits : [];
  const seen = new Set(local.map((row) => row.name.toLowerCase()));
  const places: PlaceRow[] = fresh
    .filter((hit) => !seen.has(hit.name.toLowerCase()))
    .map((hit) => ({
      id: hit.id,
      name: hit.name,
      detail: [
        ...hit.detail.split(", ").filter((part) => part && !/\bward$/i.test(part)),
        hit.ward ? `${hit.ward} ward` : "",
      ]
        .filter(Boolean)
        .join(", "),
      lat: hit.lat,
      lng: hit.lng,
    }));

  return { rows: [...local, ...places].slice(0, 7), loading: q.length >= 2 && remote.q !== q };
}
