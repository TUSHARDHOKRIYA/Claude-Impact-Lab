"use client";

import { GovButton } from "@/components/gov/GovButton";
import "./globals.css";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col antialiased">
        <main id="main" tabIndex={-1} className="flex-1">
          <div className="shell max-w-[46rem] py-20 sm:py-28">
            <h1 className="ux4g-heading-xl-strong">This page could not be loaded</h1>
            <p className="ux4g-text mt-5">
              The ward records could not be read just now. Try again in a moment.
            </p>
            <p className="mt-9">
              <GovButton type="button" onClick={reset}>
                Try again
              </GovButton>
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
