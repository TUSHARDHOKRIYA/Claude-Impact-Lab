"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { GovButton } from "@/components/gov/GovButton";
import { GovField } from "@/components/gov/GovField";
import { LANDMARKS, clampToCity, isInsideCity, searchLocalities } from "@/lib/city";
import { describePlace } from "@/lib/place-name";

const PinMap = dynamic(() => import("@/components/report/PinMap"), {
  ssr: false,
  loading: () => <div className="rb-pinmap h-72" aria-hidden="true" />,
});

export type MapPin = { lat: number; lng: number };

export type LocationStepProps = {
  value: MapPin | null;
  onChange: (pin: MapPin) => void;
  error: string | null;
  confirmed: boolean;
  onConfirm: () => void;
};

const BOUNDS_ERROR = "Put the pin inside a BMC ward in Mumbai.";
const GEO_ERROR = "Could not read your location. Search for the area instead.";
const GEO_ERROR_ID = "use-location-error";
const GEO_STATUS_ID = "use-location-status";

function parseCoord(raw: string): number | null {
  const parsed = Number(raw);
  return raw.trim() === "" || !Number.isFinite(parsed) ? null : parsed;
}

/**
 * Where is it? On a phone the person is usually standing at the spot, so GPS
 * comes first. Search by area name (English or Devanagari) is next, then the
 * map to fine-tune. Typed coordinates are tucked away for the desk.
 */
export function LocationStep({ value, onChange, error, confirmed, onConfirm }: LocationStepProps) {
  const [query, setQuery] = useState("");
  const [latText, setLatText] = useState(value ? String(value.lat) : "");
  const [lngText, setLngText] = useState(value ? String(value.lng) : "");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const locateGen = useRef(0);
  const matches = searchLocalities(query);

  const pinLat = value?.lat;
  const pinLng = value?.lng;
  useEffect(() => {
    setLatText(pinLat == null ? "" : String(pinLat));
    setLngText(pinLng == null ? "" : String(pinLng));
  }, [pinLat, pinLng]);
  useEffect(() => () => void (locateGen.current += 1), []);

  const pinInvalid = Boolean(error) && value !== null && !isInsideCity(value.lat, value.lng);
  const describedBy = geoError ? GEO_ERROR_ID : locating ? GEO_STATUS_ID : undefined;

  function applyPin(pin: MapPin, fromGps = false) {
    locateGen.current += 1;
    setLocating(false);
    setGeoError(null);
    if (!fromGps) setAccuracy(null);
    onChange(pin);
  }

  function commitCoords() {
    const lat = parseCoord(latText);
    const lng = parseCoord(lngText);
    if (lat == null || lng == null) {
      setLatText(value ? String(value.lat) : "");
      setLngText(value ? String(value.lng) : "");
      return;
    }
    const next = clampToCity(lat, lng);
    if (!value || next.lat !== value.lat || next.lng !== value.lng) applyPin(next);
  }

  function useMyLocation() {
    const generation = locateGen.current + 1;
    locateGen.current = generation;
    setGeoError(null);
    setLocating(true);
    if (!navigator.geolocation) {
      setLocating(false);
      setGeoError(GEO_ERROR);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (generation !== locateGen.current) return;
        setLocating(false);
        const { latitude: lat, longitude: lng, accuracy: metres } = position.coords;
        if (!isInsideCity(lat, lng)) {
          setGeoError("You seem to be outside Mumbai's wards. Search for the area instead.");
          return;
        }
        setAccuracy(Math.round(metres));
        applyPin({ lat, lng }, true);
      },
      () => {
        if (generation !== locateGen.current) return;
        setLocating(false);
        setGeoError(GEO_ERROR);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  return (
    <div>
      <h2 id="report-step-heading" tabIndex={-1} className="rb-step-heading ux4g-title-l-strong">
        Where is it?
      </h2>
      <p className="ux4g-body-m-default ux4g-text-neutral-secondary rb-measure">If you are standing at the spot, use your location.</p>

      <div className="ux4g-mt-l">
        <GovButton
          type="button"
          id="use-location"
          className="w-full"
          variant={value ? "secondary" : "primary"}
          disabled={locating}
          aria-busy={locating}
          aria-describedby={describedBy}
          onClick={useMyLocation}
        >
          {locating ? "Finding you…" : "Use my location"}
        </GovButton>
        {geoError ? (
          <span id={GEO_ERROR_ID} className="ux4g-body-s-strong ux4g-text-error-default mt-2 block" role="alert">
            {geoError}
          </span>
        ) : locating ? (
          <span id={GEO_STATUS_ID} className="ux4g-body-s-default ux4g-text-neutral-secondary mt-2 block" role="status">
            This can take a few seconds outdoors.
          </span>
        ) : null}
      </div>

      <div className="ux4g-mt-l">
        <GovField
          id="place-search"
          label="Or search for the area"
          type="search"
          autoComplete="off"
          placeholder="Parel, Kings Circle, हिंदमाता…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {matches.length ? (
          <ul className="ux4g-list ux4g-list-default ux4g-list-m rb-suggest" aria-label="Matching areas">
            {matches.map((row) => (
              <li key={row.id} className="ux4g-list-item">
                <button
                  type="button"
                  className="ux4g-list-item-row touch-target"
                  onClick={() => {
                    applyPin({ lat: row.lat, lng: row.lng });
                    setQuery("");
                  }}
                >
                  <span className="ux4g-list-item-start ux4g-body-m-strong">{row.name}</span>
                  <span className="ux4g-list-item-end ux4g-body-s-default">{row.ward} ward</span>
                </button>
              </li>
            ))}
          </ul>
        ) : query.trim() ? (
          <p className="ux4g-body-s-default ux4g-text-neutral-secondary mt-2">No area by that name. Try a nearby station or junction.</p>
        ) : (
          <div className="rb-quickpicks" aria-label="Common monsoon trouble spots">
            {LANDMARKS.map((landmark) => (
              <button
                key={landmark.id}
                type="button"
                className="ux4g-filter-chip-m touch-target"
                onClick={() => applyPin({ lat: landmark.lat, lng: landmark.lng })}
              >
                {landmark.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ux4g-mt-l">
        <PinMap value={value} onChange={applyPin} />
      </div>

      {value ? (
        <div className="ux4g-card ux4g-card-solid ux4g-card-vertical rb-pin-readout" aria-live="polite">
          <div className="ux4g-card-body">
          <p className="ux4g-card-title">{describePlace(value.lat, value.lng)}</p>
          <p className="ux4g-body-s-default ux4g-text-neutral-secondary ux4g-mt-2xs">
            {accuracy != null ? `Your phone puts you within about ${accuracy} m. ` : null}
            Search and area picks drop the pin at the area centre, so drag it onto the exact spot.
          </p>
          </div>
        </div>
      ) : null}
      {pinInvalid ? (
        <span className="ux4g-body-s-strong ux4g-text-error-default mt-2 block" role="alert">
          {BOUNDS_ERROR}
        </span>
      ) : null}

      <details className="rb-details">
        <summary className="ux4g-btn-text-primary ux4g-btn-m touch-target">Enter coordinates instead</summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <GovField
            id="report-lat"
            label="Latitude"
            inputMode="decimal"
            autoComplete="off"
            value={latText}
            onChange={(event) => setLatText(event.target.value)}
            onBlur={commitCoords}
          />
          <GovField
            id="report-lng"
            label="Longitude"
            inputMode="decimal"
            autoComplete="off"
            value={lngText}
            onChange={(event) => setLngText(event.target.value)}
            onBlur={commitCoords}
          />
        </div>
      </details>

      <div className="ux4g-mt-l">
        <GovButton
          id="confirm-report-pin"
          type="button"
          className="w-full"
          variant={confirmed ? "secondary" : "primary"}
          disabled={!value}
          onClick={onConfirm}
        >
          {confirmed ? "Pin confirmed" : "Confirm this spot"}
        </GovButton>
      </div>
    </div>
  );
}
