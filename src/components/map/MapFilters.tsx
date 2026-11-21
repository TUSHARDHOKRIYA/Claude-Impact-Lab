"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronIcon, ListIcon, MapIcon } from "@/components/map/map-icons";
import { PlaceList } from "@/components/map/PlaceList";
import { PlacePreview } from "@/components/map/PlacePreview";
import { ReportedDateFilter, type DateRange } from "@/components/map/ReportedDateFilter";
import { CloseIcon, SearchIcon } from "@/components/report/flow-icons";
import { filterByReportedDate, reportedDateBounds } from "@/lib/map-date-filter";
import {
  ISSUE_TYPE_LABELS,
  ISSUE_TYPES,
  type IssueType,
  type MapReportPoint,
  type PlaceSummary,
} from "@/lib/types";

export type IssueFilter = IssueType | "all";

/**
 * The map is always on screen, on every width. It used to sit behind a "Show
 * the map" disclosure below the whole place list, which on a phone put it
 * several screens down and made the header's Map link look like it did nothing.
 *
 * Loading it is still deferred: MapLibre is about a megabyte and the static
 * import shipped it to every phone that opened the home page whether or not
 * the disclosure was ever touched. `next/dynamic` keeps it out of the first
 * payload, the same way `LocationStep` already loads `PinMap`.
 */
const CityMap = dynamic(
  () => import("@/components/map/CityMap").then((mod) => mod.CityMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-paper" aria-hidden="true" />
    ),
  },
);

type View = "map" | "list";

function matchesQuery(place: PlaceSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const { name, street, ward } = place.location;
  return [name, street, ward].some((field) => field.toLowerCase().includes(q));
}

export function filterMapPoints(
  points: MapReportPoint[],
  issue: IssueFilter,
  range: DateRange = { from: null, to: null },
): MapReportPoint[] {
  const byIssue = issue === "all" ? points : points.filter((point) => point.issueType === issue);
  return filterByReportedDate(byIssue, range.from, range.to);
}

/**
 * The map fills the screen. Search and two filter chips float on top, and the
 * places sit in a panel that peeks up from the bottom; the list/map switch
 * pulls it up over the map or back down. On a wide screen it is a side panel.
 */
export function MapFilters({
  points,
  places,
  initialLocationId,
  focusPoint,
  focusZoom,
  highlightReportId,
  highlightLocationId,
  notice,
}: {
  points: MapReportPoint[];
  places: PlaceSummary[];
  initialLocationId?: string;
  focusPoint?: { lat: number; lng: number };
  /** Zoom used when the map opens on `initialLocationId`. */
  focusZoom?: number;
  highlightReportId?: string;
  highlightLocationId?: string;
  /** A line shown over the map, such as after a report is recorded. */
  notice?: string;
}) {
  const [issue, setIssue] = useState<IssueFilter>("all");
  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  const bounds = useMemo(() => reportedDateBounds(points), [points]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("map");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialLocationId ?? null,
  );
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!notice) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("new") && !url.searchParams.has("lang")) return;
    url.searchParams.delete("new");
    url.searchParams.delete("lang");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [notice]);

  const visiblePlaces = useMemo(() => {
    const ids = new Set(
      filterMapPoints(points, issue, range).map((point) => point.locationId),
    );
    return places
      .filter(
        (place) => ids.has(place.location.id) && matchesQuery(place, query),
      )
      .sort((a, b) => b.reportCount - a.reportCount);
  }, [points, places, issue, range, query]);

  const filtered = useMemo(() => {
    const ids = new Set(visiblePlaces.map((place) => place.location.id));
    return filterMapPoints(points, issue, range).filter((point) =>
      ids.has(point.locationId),
    );
  }, [points, issue, range, visiblePlaces]);

  const selected = visiblePlaces.find(
    (place) => place.location.id === selectedId,
  );

  const selectFromList = (locationId: string, opener: HTMLElement) => {
    openerRef.current = opener;
    setSelectedId(locationId);
    setView("map");
  };

  return (
    <section aria-labelledby="map-heading" className="rb-explore">
      <h2 id="map-heading" className="sr-only">
        Reported road problems
      </h2>
      <div className="rb-explore-map">
        <CityMap
          bare
          points={filtered}
          places={visiblePlaces}
          initialLocationId={initialLocationId}
          focusPoint={focusPoint}
          focusZoom={focusZoom}
          highlightReportId={highlightReportId}
          highlightLocationId={highlightLocationId}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            if (id) setView("map");
          }}
          openerRef={openerRef}
        />
      </div>

      <div className="rb-explore-top">
        <div className="rb-search">
          <SearchIcon className="rb-search-icon" />
          <input
            type="search"
            autoComplete="off"
            aria-label="Search a road, area or ward"
            placeholder="Search a road, area or ward"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="rb-search-clear"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <CloseIcon size={18} />
            </button>
          ) : null}
        </div>
        <div className="rb-explore-filters">
          <label
            className={
              issue === "all"
                ? "rb-select-chip"
                : "rb-select-chip rb-select-chip-on"
            }
          >
            <span className="sr-only">Problem type</span>
            <select
              value={issue}
              onChange={(event) => setIssue(event.target.value as IssueFilter)}
            >
              <option value="all">All problems</option>
              {ISSUE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ISSUE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <ChevronIcon />
          </label>
          <ReportedDateFilter bounds={bounds} value={range} onChange={setRange} />
          <div className="rb-view-toggle" role="group" aria-label="Show">
            <button
              type="button"
              aria-pressed={view === "list"}
              aria-label="List"
              onClick={() => setView("list")}
            >
              <ListIcon />
            </button>
            <button
              type="button"
              aria-pressed={view === "map"}
              aria-label="Map"
              onClick={() => setView("map")}
            >
              <MapIcon />
            </button>
          </div>
        </div>
        {notice ? (
          <p className="rb-explore-notice" role="status">
            {notice}
          </p>
        ) : null}
      </div>

      <div
        className="rb-sheet"
        data-view={view}
        data-selected={selected ? "true" : undefined}
      >
        <button
          type="button"
          className="rb-sheet-handle"
          aria-label={
            view === "list" ? "Show more of the map" : "Show the full list"
          }
          onClick={() => setView(view === "list" ? "map" : "list")}
        >
          <span aria-hidden="true" />
        </button>
        {selected ? (
          <div className="rb-sheet-selected">
            <PlacePreview
              inline
              place={selected}
              onClose={() => {
                const id = selected.location.id;
                setSelectedId(null);
                // Opened from the list, the opener row unmounted with it: focus its replacement.
                if (openerRef.current?.isConnected) return;
                requestAnimationFrame(() => {
                  const rows = document.querySelectorAll<HTMLElement>(".rb-sheet [data-location-id]");
                  const row = [...rows].find((el) => el.dataset.locationId === id);
                  (row ?? document.querySelector<HTMLElement>(".rb-sheet-handle"))?.focus();
                });
              }}
              openerRef={openerRef}
              yourReportId={
                highlightReportId &&
                selected.location.id === highlightLocationId
                  ? highlightReportId
                  : undefined
              }
            />
          </div>
        ) : null}
        {selected ? null : (
          <>
            <div className="rb-sheet-head" aria-live="polite">
              <h3 className="ux4g-heading-xs-strong">Most reported first</h3>
              <p className="ux4g-body-s-default ux4g-text-neutral-secondary">
                {visiblePlaces.length}{" "}
                {visiblePlaces.length === 1 ? "place" : "places"},{" "}
                {filtered.length} {filtered.length === 1 ? "report" : "reports"}
              </p>
            </div>
            <div className="rb-sheet-body">
              <PlaceList
                places={visiblePlaces}
                selectedId={selectedId}
                onSelect={selectFromList}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
