import type { Metadata } from "next";

import { InsightStrip } from "@/components/insights/InsightStrip";
import { MapFilters } from "@/components/map/MapFilters";
import { toLabelLanguage } from "@/lib/chip-labels";
import { isReportId } from "@/lib/id";
import { insightsFromPlaces, listMapPoints, listPlaces, readReportPlace, readReportPoint } from "@/lib/queries";
import { SUBMITTED_BANNER } from "@/lib/review-copy";
import type { MapReportPoint } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Map of reports",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

type MapPageProps = {
  searchParams: Promise<{
    report?: string | string[];
    new?: string | string[];
    lang?: string | string[];
  }>;
};

export default async function MapPage({ searchParams }: MapPageProps) {
  const params = await searchParams;
  // Only a well-formed id reaches the table; a junk one would fail the key check.
  const requested = firstParam(params.report);
  const reportId = requested && isReportId(requested) ? requested : undefined;
  const justSubmitted = firstParam(params.new) === "1";
  const banner = SUBMITTED_BANNER[toLabelLanguage(firstParam(params.lang))];
  const [listed, catalogPlaces] = await Promise.all([listMapPoints(), listPlaces()]);
  let places = catalogPlaces;
  let highlighted: MapReportPoint | undefined = reportId
    ? listed.find((point) => point.id === reportId)
    : undefined;
  let points = listed;
  if (reportId && !highlighted) {
    const fresh = await readReportPoint(reportId);
    if (fresh) {
      highlighted = fresh;
      points = [...listed, fresh];
    }
  }
  if (highlighted && (points !== listed || !places.some((place) => place.location.id === highlighted.locationId))) {
    const rebuilt = await readReportPlace(highlighted.id);
    if (rebuilt) {
      const at = places.findIndex((place) => place.location.id === rebuilt.location.id);
      places = at === -1 ? [...places, rebuilt] : places.map((place, index) => (index === at ? rebuilt : place));
    }
  }
  const placeListed = highlighted
    ? places.some((place) => place.location.id === highlighted.locationId)
    : false;

  return (
    <>
      <h1 className="shell ux4g-heading-l-strong pt-8">Map of reports</h1>
      <InsightStrip insights={insightsFromPlaces(places)} />
      <MapFilters
        points={points}
        places={places}
        initialLocationId={placeListed ? highlighted?.locationId : undefined}
        focusPoint={highlighted ? { lat: highlighted.lat, lng: highlighted.lng } : undefined}
        focusZoom={highlighted ? 18 : undefined}
        highlightReportId={highlighted?.id}
        highlightLocationId={highlighted?.locationId}
        notice={highlighted && justSubmitted ? banner : undefined}
      />
    </>
  );
}
