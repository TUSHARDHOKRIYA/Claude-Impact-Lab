"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { GovChoice } from "@/components/gov/GovChoice";
import { GovField } from "@/components/gov/GovField";
import { PlaceList } from "@/components/map/PlaceList";
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
  { ssr: false, loading: () => <div className="rb-map-placeholder" aria-hidden="true" /> },
);

const TIME_OPTIONS: { value: TimeWindow; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "1y", label: "Past year" },
  { value: "5y", label: "Past five years" },
];

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
  /** A line shown just above the map, such as after a report is recorded. */
  notice?: string;
}) {
  const [issue, setIssue] = useState<IssueFilter>("all");
  const [time, setTime] = useState<TimeWindow>("all");
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
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [notice]);

  const filtered = useMemo(
    () => filterMapPoints(points, issue, time),
    [points, issue, time],
  );

  const visiblePlaces = useMemo(() => {
    const ids = new Set(filtered.map((point) => point.locationId));
    return places.filter((place) => ids.has(place.location.id));
  }, [filtered, places]);

  const selectFromList = (locationId: string, opener: HTMLElement) => {
    openerRef.current = opener;
    setSelectedId(locationId);
  };

  return (
    <section aria-labelledby="map-heading" className="bg-paper">
      <div className="shell py-12 sm:py-14">
        <h2 id="map-heading" className="ux4g-heading-l-strong">
          Reported road problems
        </h2>
        <p className="ux4g-text mt-3 max-w-3xl">
          Filter by what people recorded and when they noticed it. The list
          always works without the map.
        </p>

        <p
          className="mt-6 flex flex-none items-baseline gap-3"
          aria-live="polite"
        >
          <span className="ux4g-heading-xl-strong">{filtered.length}</span>
          <span className="ux4g-text ux4g-text-neutral-secondary">
            {filtered.length === 1 ? "report" : "reports"} in this filter
          </span>
        </p>

        <div className="ux4g-card ux4g-card-outline mt-8 flex flex-col gap-6 p-4 sm:p-5 lg:flex-row lg:items-start lg:gap-10">
          <GovField
            label="Issue type"
            as="select"
            value={issue}
            onChange={(event) => setIssue(event.target.value as IssueFilter)}
            className="w-full lg:max-w-72"
          >
            <option value="all">All issue types</option>
            {ISSUE_TYPES.map((type) => (
              <option key={type} value={type}>
                {ISSUE_TYPE_LABELS[type]}
              </option>
            ))}
          </GovField>

          <fieldset className="ux4g-form-group min-w-0">
            <legend className="ux4g-heading-xs-strong mb-2">Time noticed</legend>
            <div className="flex flex-wrap gap-2">
              {TIME_OPTIONS.map((option) => (
                <GovChoice
                  key={option.value}
                  type="radio"
                  name="map-time"
                  value={option.value}
                  checked={time === option.value}
                  onChange={() => setTime(option.value)}
                  label={option.label}
                />
              ))}
            </div>
            {time !== "all" ? (
              <p className="ux4g-text ux4g-text-neutral-secondary mt-2">
                Reports marked “More than six months ago” have no exact date.
                Choose All time to include them.
              </p>
            ) : null}
          </fieldset>
        </div>

        {notice ? (
          <p className="ux4g-text mt-6" role="status">
            {notice}
          </p>
        ) : null}

        <div className="rb-map-split">
          <div className="rb-map-panel">
            <CityMap
              points={filtered}
              places={visiblePlaces}
              initialLocationId={initialLocationId}
              focusPoint={focusPoint}
              focusZoom={focusZoom}
              highlightReportId={highlightReportId}
              highlightLocationId={highlightLocationId}
              selectedId={selectedId}
              onSelect={setSelectedId}
              openerRef={openerRef}
            />
          </div>
          <PlaceList
            places={visiblePlaces}
            selectedId={selectedId}
            onSelect={selectFromList}
          />
        </div>
      </div>
    </section>
  );
}
