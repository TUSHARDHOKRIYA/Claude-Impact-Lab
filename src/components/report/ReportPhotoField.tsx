"use client";

import { useRef } from "react";

import { GovAlert } from "@/components/gov/GovAlert";
import { GovBadge } from "@/components/gov/GovBadge";
import { CameraIcon, ImageIcon } from "@/components/report/flow-icons";

const ACCEPT = "image/jpeg,image/jpg,image/png,image/webp";

/**
 * One photo, one short instruction, two ways in: the rear camera
 * (`capture="environment"`) or the gallery. Native file inputs stay in the DOM,
 * visually hidden, so the buttons are the only targets.
 */
export function ReportPhotoField({
  preview,
  status,
  error,
  busy,
  onPhoto,
}: {
  preview: string;
  status: string;
  error: string | null;
  busy?: boolean;
  onPhoto: (file: File | undefined) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <h2 id="report-step-heading" tabIndex={-1} className="rb-step-heading rb-q">
        Photograph the problem
      </h2>
      <p className="ux4g-body-m-default ux4g-text-neutral-secondary rb-measure ux4g-mt-xs">
        A photo is what makes a report hard to ignore. It goes on the ward&apos;s record with your answers.
      </p>

      <section className="rb-photo-block" aria-labelledby="photo-label">
        <p className="rb-photo-label">
          <span id="photo-label" className="ux4g-heading-xs-strong">
            Road photo
          </span>
          <GovBadge tone="neutral" small>
            Required
          </GovBadge>
        </p>
        <p className="ux4g-body-m-default ux4g-text-neutral-secondary">
          Get the road and a shop sign or landmark in the frame. A slipper or bottle beside a pothole shows its size.
        </p>

        {preview ? (
          <figure className="rb-photo-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview of the street photo" />
          </figure>
        ) : null}

        <div className="rb-photo-actions">
          <button
            id="photo-take"
            type="button"
            className="ux4g-btn ux4g-btn-m ux4g-btn-primary touch-target rb-btn-icon"
            aria-describedby={error ? "photo-error" : undefined}
            aria-busy={busy || undefined}
            onClick={() => cameraRef.current?.click()}
          >
            <CameraIcon />
            {busy ? "Preparing photo…" : preview ? "Retake" : "Take a photo"}
          </button>
          <button
            type="button"
            className="ux4g-btn ux4g-btn-m ux4g-btn-outline-primary touch-target rb-btn-icon"
            onClick={() => libraryRef.current?.click()}
          >
            <ImageIcon />
            {preview ? "Pick another" : "From gallery"}
          </button>
        </div>
      </section>

      <input
        id="photo-file"
        ref={cameraRef}
        className="sr-only"
        type="file"
        accept={ACCEPT}
        capture="environment"
        tabIndex={-1}
        aria-labelledby="photo-label"
        aria-invalid={error ? true : undefined}
        onChange={(event) => {
          onPhoto(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        id="photo-library"
        ref={libraryRef}
        className="sr-only"
        type="file"
        accept={ACCEPT}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          onPhoto(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div aria-live="polite">
        {error ? (
          <div className="ux4g-mt-s">
            <GovAlert variant="error">
              <span id="photo-error">{error}</span>
            </GovAlert>
          </div>
        ) : status ? (
          <p className="ux4g-body-s-default ux4g-text-neutral-secondary ux4g-mt-s">{status}</p>
        ) : null}
      </div>
    </div>
  );
}
