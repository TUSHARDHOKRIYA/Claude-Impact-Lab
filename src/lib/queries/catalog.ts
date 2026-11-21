import "server-only";
import { cache } from "react";
import { getRepository } from "@/lib/repo/context";
import type { KhabarRepository } from "@/lib/repo/port";
import type { Catalog } from "@/lib/types";

const inFlight = new WeakMap<KhabarRepository, Promise<Catalog>>();

const catalogsForRequest = cache(
  () => new Map<KhabarRepository, Promise<Catalog>>(),
);

function readCatalog(repo: KhabarRepository): Promise<Catalog> {
  const flying = inFlight.get(repo);
  if (flying) return flying;
  const next = repo.loadCatalog().finally(() => {
    inFlight.delete(repo);
  });
  inFlight.set(repo, next);
  return next;
}

export function loadSharedCatalog(repo?: KhabarRepository): Promise<Catalog> {
  const resolved = repo ?? getRepository();
  const requestMap = catalogsForRequest();
  const cached = requestMap.get(resolved);
  if (cached) return cached;
  const pending = readCatalog(resolved);
  requestMap.set(resolved, pending);
  return pending;
}
