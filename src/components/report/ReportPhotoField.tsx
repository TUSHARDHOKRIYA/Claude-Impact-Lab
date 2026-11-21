"use client";

import { useRef } from "react";

import { GovAlert } from "@/components/gov/GovAlert";

const ACCEPT = "image/jpeg,image/jpg,image/png,image/webp";

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M9.4 4h5.2l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2.9l1.5-2Zm2.6 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"
      />
    </svg>
  );
}

/**
 * The camera is the first thing on the page: one large target that opens the
 * rear camera (`capture="environment"`). The gallery is a second, quieter way
 * in. Native file inputs stay in the DOM, visually hidden.
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
  const openCamera = () => cameraRef.current?.click();

  return (
    <div>
      <h2 id="report-step-heading" tabIndex={-1} className="rb-step-heading ux4g-title-l-strong">
        Photograph the problem
      </h2>
      <p className="ux4g-body-m-default ux4g-text-neutral-secondary rb-measure">Get the road and a shop sign or landmark in the frame.</p>

      {preview ? (
        <figure className="rb-viewfinder rb-viewfinder-filled">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview of the street photo" />
        </figure>
      ) : (
        <button
          id="photo-take"
          type="button"
          className="rb-viewfinder"
          aria-describedby={error ? "photo-error" : undefined}
          aria-busy={busy || undefined}
          onClick={openCamera}
        >
          <CameraIcon />
          <span className="ux4g-title-l-strong">{busy ? "Preparing photo…" : "Take a photo"}</span>
          <span className="ux4g-body-s-default rb-viewfinder-sub" aria-hidden="true">Opens your camera</span>
        </button>
      )}

      <div className="rb-photo-actions">
        {preview ? (
          <button
            id="photo-take"
            type="button"
            className="ux4g-btn-outline-primary ux4g-btn-l touch-target"
            onClick={openCamera}
          >
            Retake
          </button>
        ) : null}
        <button
          type="button"
          className="ux4g-btn-text-primary ux4g-btn-l touch-target"
          onClick={() => libraryRef.current?.click()}
        >
          {preview ? "Choose a different photo" : "Choose from library"}
        </button>
      </div>

      <input
        id="photo-file"
        ref={cameraRef}
        className="sr-only"
        type="file"
        accept={ACCEPT}
        capture="environment"
        tabIndex={-1}
        aria-label="A photo of what you can see"
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
          <div className="mt-3">
            <GovAlert variant="error">
              <span id="photo-error">{error}</span>
            </GovAlert>
          </div>
        ) : status ? (
          <p className="ux4g-body-s-default ux4g-text-neutral-secondary ux4g-mt-s">{status}</p>
        ) : null}
      </div>
      <p className="ux4g-body-s-default ux4g-text-neutral-secondary ux4g-mt-m">
        A slipper or bottle beside a pothole shows how big it is.
      </p>
    </div>
  );
}
