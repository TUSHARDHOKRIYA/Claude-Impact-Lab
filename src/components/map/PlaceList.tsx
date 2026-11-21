"use client";

import Link from "next/link";
import { GovBadge } from "@/components/gov/GovBadge";
import { ISSUE_TYPE_LABELS, type PlaceSummary } from "@/lib/types";

export function PlaceList({
  places,
  selectedId,
  onSelect,
}: {
  places: PlaceSummary[];
  selectedId: string | null;
  onSelect: (locationId: string, opener: HTMLElement) => void;
}) {
  return (
    <nav aria-label="Places in this filter">
      <ul className="ux4g-list ux4g-list-default ux4g-list-l">
        {places.map((place) => {
          const selected = place.location.id === selectedId;
          const countLabel = place.reportCount === 1 ? "1 report" : `${place.reportCount} reports`;
          const issue = ISSUE_TYPE_LABELS[place.location.issueType];
          return (
            <li key={place.location.id} className="ux4g-list-item">
              <Link
                href={`/places/${place.location.slug}`}
                aria-current={selected ? "true" : undefined}
                onClick={(event) => onSelect(place.location.id, event.currentTarget)}
                className="ux4g-list-item-row touch-target"
                style={{ minHeight: 48, gap: 8 }}
              >
                <span className="ux4g-list-item-start">
                  <span className="flex flex-col items-start gap-1">
                    <span className="ux4g-heading-xs-strong">{place.location.name}</span>
                    <span className="ux4g-text ux4g-text-neutral-secondary">{place.location.street}</span>
                  </span>
                </span>
                <span className="ux4g-list-item-end">
                  <span className="ux4g-text">{countLabel}</span>
                  <GovBadge tone="info">{issue}</GovBadge>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
