import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy — Rastabaaz",
  description: "How Rastabaaz handles road reports, photos, location pins, and cookies.",
};

export default function PrivacyPage() {
  return (
    <div className="shell-narrow rb-page">
      <h1 className="ux4g-display-xs-strong">Privacy policy</h1>
      <p className="ux4g-body-m-default ux4g-text-neutral-secondary ux4g-mt-xs">
        Rastabaaz is built to keep citizen road reporting anonymous and public.
      </p>

      <section className="ux4g-mt-xl">
        <h2 className="ux4g-title-l-strong">What we store when you file a report</h2>
        <p className="ux4g-body-m-default ux4g-mt-xs">
          We store the road photo you upload (compressed in your browser before
          upload), the map pin you confirm, the issue details you select, and any
          optional note you type. We do not ask for your name, phone number, or
          email address. Please avoid including faces, license plates, or personal
          details in photos or notes.
        </p>
      </section>

      <section className="ux4g-mt-l">
        <h2 className="ux4g-title-l-strong">Location input</h2>
        <p className="ux4g-body-m-default ux4g-mt-xs">
          Device geolocation is used only if you tap &ldquo;Use my location&rdquo; to
          place the map pin; your browser&apos;s raw GPS reading is not stored
          separately from the pin you confirm.
        </p>
      </section>

      <section className="ux4g-mt-l">
        <h2 className="ux4g-title-l-strong">Cookies and tracking</h2>
        <p className="ux4g-body-m-default ux4g-mt-xs">
          Public visitors do not receive advertising or tracking cookies. A single
          strictly-necessary, HTTP-only session cookie is set only when an
          administrator signs in at the records desk.
        </p>
      </section>

      <p className="ux4g-body-s-default ux4g-mt-xl">
        <Link href="/" className="ux4g-text-link-m touch-target">
          Back to reporting a road problem
        </Link>
      </p>
    </div>
  );
}
