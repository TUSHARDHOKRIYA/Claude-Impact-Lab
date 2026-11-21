"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { PlaceList } from "@/components/map/PlaceList";
import { PlacePreview } from "@/components/map/PlacePreview";
import { CloseIcon, SearchIcon } from "@/components/report/flow-icons";
import { kolkataTodayStamp } from "@/lib/noticed-date";
import {
  ISSUE_TYPE_LABELS,
  ISSUE_TYPES,
  type IssueType,
  type MapReportPoint,
  type PlaceSummary,
} from "@/lib/types";

export type TimeWindow = "all" | "1y" | "5y";
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

const TIME_OPTIONS: { value: TimeWindow; label: string }[] = [
  { value: "all", label: "Any time" },
  { value: "1y", label: "Past year" },
  { value: "5y", label: "Past five years" },
];

type View = "map" | "list";

function matchesQuery(place: PlaceSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const { name, street, ward } = place.location;
  return [name, street, ward].some((field) => field.toLowerCase().includes(q));
}

function ListIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2Z M9 4v14M15 6v14" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function sinceFor(time: TimeWindow, now = new Date()): string | null {
  if (time === "all") return null;
  const today = kolkataTodayStamp(now);
  const year = Number(today.slice(0, 4)) - (time === "1y" ? 1 : 5);
  return `${String(year).padStart(4, "0")}${today.slice(4)}`;
}

export function filterMapPoints(
  points: MapReportPoint[],
  issue: IssueFilter,
  time: TimeWindow,
): MapReportPoint[] {
  const since = sinceFor(time);
  return points.filter((point) => {
    if (issue !== "all" && point.issueType !== issue) return false;
    if (since) {
      if (point.noticedWindow === "over_six_months") return false;
      if (point.noticedAt < since) return false;
    }
    return true;
  });
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
  const [time, setTime] = useState<TimeWindow>("all");
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
      filterMapPoints(points, issue, time).map((point) => point.locationId),
    );
    return places
      .filter(
        (place) => ids.has(place.location.id) && matchesQuery(place, query),
      )
      .sort((a, b) => b.reportCount - a.reportCount);
  }, [points, places, issue, time, query]);

  const filtered = useMemo(() => {
    const ids = new Set(visiblePlaces.map((place) => place.location.id));
    return filterMapPoints(points, issue, time).filter((point) =>
      ids.has(point.locationId),
    );
  }, [points, issue, time, visiblePlaces]);

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
          <label
            className={
              time === "all"
                ? "rb-select-chip"
                : "rb-select-chip rb-select-chip-on"
            }
          >
            <span className="sr-only">Time noticed</span>
            <select
              value={time}
              onChange={(event) => setTime(event.target.value as TimeWindow)}
            >
              {TIME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronIcon />
          </label>
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
              onClose={() => setSelectedId(null)}
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
            {time !== "all" ? (
              <p className="rb-sheet-note ux4g-body-s-default ux4g-text-neutral-secondary">
                Reports marked “More than six months ago” have no exact date, so
                they only show under Any time.
              </p>
            ) : null}
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
