import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & conditions — Rastabaaz",
  description: "Terms of use and data disclaimers for Rastabaaz.",
};

export default function TermsPage() {
  return (
    <div className="shell-narrow rb-page">
      <h1 className="ux4g-display-xs-strong">Terms &amp; conditions</h1>
      <p className="ux4g-body-m-default ux4g-text-neutral-secondary ux4g-mt-xs">
        By using Rastabaaz, you agree to the terms below.
      </p>

      <section className="ux4g-mt-xl">
        <h2 className="ux4g-title-l-strong">Not an official BMC portal</h2>
        <p className="ux4g-body-m-default ux4g-mt-xs">
          Rastabaaz is an independent civic prototype. Reports filed here are
          displayed in the public record on this site and are not forwarded to the
          Brihanmumbai Municipal Corporation (BMC) complaint system. For urgent
          road hazards or emergencies, contact local civic or emergency services
          directly.
        </p>
      </section>

      <section className="ux4g-mt-l">
        <h2 className="ux4g-title-l-strong">Synthetic financial dataset</h2>
        <p className="ux4g-body-m-default ux4g-mt-xs">
          Mumbai ward codes and road names are real, while repair budgets, work
          orders, contractor scores, and audit flags come from the synthetic
          Claude Impact Lab dataset. Do not cite these figures as official audit
          findings or allegations against real individuals or firms.
        </p>
      </section>

      <section className="ux4g-mt-l">
        <h2 className="ux4g-title-l-strong">Public submissions</h2>
        <p className="ux4g-body-m-default ux4g-mt-xs">
          Only submit photos and descriptions of genuine street conditions that
          you have the right to share. Automated spam, abusive content, or
          unrelated uploads may be edited or removed by the records desk.
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
