"use client";

import { GovButton } from "@/components/gov/GovButton";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="shell max-w-[46rem] py-20 sm:py-28">
      <h1 className="ux4g-heading-xl-strong">This page could not be loaded</h1>
      <p className="ux4g-text mt-5">
        The Kala Ghoda record is temporarily unavailable. Try again in a moment.
      </p>
      <p className="mt-9">
        <GovButton type="button" onClick={reset}>
          Try again
        </GovButton>
      </p>
    </div>
  );
}
