import { GovBadge } from "@/components/gov/GovBadge";
import { ISSUE_TYPE_LABELS, type LocationRecord } from "@/lib/types";

function formatCoords(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(5)}° ${ns} · ${Math.abs(lng).toFixed(5)}° ${ew}`;
}

export function PlaceHeader({ location }: { location: LocationRecord }) {
  const issue = ISSUE_TYPE_LABELS[location.issueType];
  const streetLine = location.name.includes(location.street)
    ? location.ward
    : `${location.street}, ${location.ward}`;

  return (
    <header className="ux4g-card ux4g-card-solid ux4g-card-vertical min-w-0">
      <div className="ux4g-card-header">
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <p className="ux4g-card-sub-title">{location.ward}</p>
          <p className="ux4g-text ux4g-text-neutral-tertiary min-w-0 break-all">{location.slug}</p>
        </div>
        <h1 className="ux4g-heading-xl-strong mt-3 break-words">{location.name}</h1>
        <p className="ux4g-text ux4g-text-neutral-secondary mt-1">{streetLine}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="ux4g-text ux4g-text-neutral-secondary">
            <span className="sr-only">Coordinates: </span>
            {formatCoords(location.lat, location.lng)}
          </p>
          <GovBadge tone="info">{issue}</GovBadge>
        </div>
      </div>
    </header>
  );
}
