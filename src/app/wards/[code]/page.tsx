import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { FlagList } from "@/components/rupee/FlagList";
import { NextRupeeList } from "@/components/rupee/NextRupeeList";
import { OutcomeBar } from "@/components/rupee/OutcomeBar";
import { WardBrief, WardBriefLoading } from "@/components/rupee/WardBrief";
import { getRepository } from "@/lib/repo/context";
import { formatInr, formatInrShort, getRupee, nextRupee } from "@/lib/rupee";
import { pct, wardFromSlug, wardSlug } from "@/lib/rupee/slug";
import type { SpendSlice } from "@/lib/rupee/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  const ledger = wardFromSlug(getRupee().ledgers, code);
  if (!ledger) return { title: "Ward not found" };
  return {
    title: `${ledger.ward.code} ward money trail`,
    description: `Where ${ledger.ward.code} ward (${ledger.ward.name}) spent its monsoon road money, what held up, and where the next rupee should go.`,
  };
}

function SliceTable({ caption, rows, firstColumn }: { caption: string; rows: SpendSlice[]; firstColumn: string }) {
  return (
    <div className="ux4g-table-responsive">
      <table className="ux4g-table ux4g-table-s rh-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{firstColumn}</th>
            <th scope="col" className="rh-num">Spent</th>
            <th scope="col" className="rh-num">Jobs</th>
            <th scope="col" className="rh-num">Re-opened</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              <td className="rh-num">{formatInrShort(row.spentInr)}</td>
              <td className="rh-num">{row.orders}</td>
              <td className="rh-num">{pct(row.reopenRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function citizenReportCount(code: string): Promise<{ places: number; reports: number }> {
  try {
    const catalog = await getRepository().loadCatalog();
    const ids = new Set(catalog.locations.filter((loc) => loc.ward === code).map((loc) => loc.id));
    return { places: ids.size, reports: catalog.reports.filter((r) => ids.has(r.locationId)).length };
  } catch {
    return { places: 0, reports: 0 };
  }
}

export default async function WardPage({ params }: Params) {
  const { code } = await params;
  const rupee = getRupee();
  const ledger = wardFromSlug(rupee.ledgers, code);
  if (!ledger) notFound();

  const { ward, outcome, complaints, context } = ledger;
  const next = nextRupee(rupee.ds, rupee.flags, ward.code, 5);
  const scoreById = new Map(rupee.scores.map((score) => [score.contractor.id, score]));
  const citizen = await citizenReportCount(ward.code);
  const index = rupee.ledgers.findIndex((row) => row.ward.code === ward.code);
  const prev = rupee.ledgers[index - 1];
  const after = rupee.ledgers[index + 1];

  return (
    <div className="shell-narrow rh-page">
      <nav className="ux4g-breadcrumb ux4g-breadcrumb-divider" aria-label="Breadcrumb">
        <ol className="ux4g-breadcrumb-list flex">
          <li className="ux4g-breadcrumb-item">
            <Link href="/wards" className="ux4g-breadcrumb-link touch-target">
              Wards
            </Link>
          </li>
          <li className="ux4g-breadcrumb-item active" aria-current="page">
            {ward.code}
          </li>
        </ol>
      </nav>

      <h1 className="ux4g-display-xs-strong ux4g-mt-xs">{ward.code} ward</h1>
      <p className="ux4g-body-l-default ux4g-text-neutral-secondary">{ward.name}</p>

      <div className="ux4g-mt-m">
        <Suspense fallback={<WardBriefLoading />}>
          <WardBrief ledger={ledger} scores={rupee.scores} next={next} />
        </Suspense>
      </div>

      <section className="ux4g-card ux4g-card-solid ux4g-card-vertical ux4g-mt-l" aria-labelledby="money-heading">
        <div className="ux4g-card-header">
          <h2 id="money-heading" className="ux4g-heading-xs-strong">
            {formatInrShort(ledger.spentInr)} spent on {ledger.orders} jobs
          </h2>
        </div>
        <div className="ux4g-card-body">
          <OutcomeBar
            outcome={outcome}
            spentInr={ledger.spentInr}
            budgetInr={ledger.budgetInr}
            label={`${ward.code} ward monsoon road spend by outcome`}
          />
        </div>
      </section>

      <section className="rh-section" aria-labelledby="held-heading">
        <h2 id="held-heading" className="ux4g-title-l-strong">
          Did the fix last?
        </h2>
        <p className="ux4g-body-m-default ux4g-text-neutral-secondary ux4g-mt-2xs rh-measure">
          {pct(ledger.reopenRate)} of jobs were re-opened within 30 days. {pct(ledger.slaRate)} were finished on
          time.
        </p>
        <div className="ux4g-mt-s">
          <SliceTable caption="Durability by type of problem" rows={ledger.byWorkType} firstColumn="Problem" />
        </div>
        <details className="rh-more ux4g-mt-s">
          <summary className="ux4g-btn-text-primary ux4g-btn-m touch-target">By repair method</summary>
          <div className="ux4g-mt-xs">
            <SliceTable caption="Durability by repair method" rows={ledger.byMethod} firstColumn="Method" />
          </div>
        </details>
      </section>

      <section className="rh-section" aria-labelledby="who-heading">
        <h2 id="who-heading" className="ux4g-title-l-strong">
          Who did the work
        </h2>
        <p className="ux4g-body-m-default ux4g-text-neutral-secondary ux4g-mt-2xs rh-measure">
          Fair is the re-open rate expected for the same work in equally flood-prone wards
          ({context.floodHotspots} flood {context.floodHotspots === 1 ? "hotspot" : "hotspots"} here, low-lying
          index {ward.lowLyingIndex.toFixed(2)}).
        </p>
        <div className="ux4g-table-responsive ux4g-mt-s">
          <table className="ux4g-table ux4g-table-s rh-table">
            <caption className="sr-only">Contractors working in {ward.code} ward</caption>
            <thead>
              <tr>
                <th scope="col">Contractor</th>
                <th scope="col" className="rh-num">Spent</th>
                <th scope="col" className="rh-num">Re-opened</th>
                <th scope="col" className="rh-num">Fair</th>
              </tr>
            </thead>
            <tbody>
              {ledger.byContractor.map((row) => {
                const fair = scoreById.get(row.key)?.expectedReopenRate ?? 0;
                return (
                  <tr key={row.key}>
                    <th scope="row">{row.label.replace(" (synthetic)", "")}</th>
                    <td className="rh-num">{formatInrShort(row.spentInr)}</td>
                    <td className={row.reopenRate > fair + 0.05 ? "rh-num rh-worse" : "rh-num"}>{pct(row.reopenRate)}</td>
                    <td className="rh-num">{pct(fair)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="ux4g-body-s-default ux4g-mt-s">
          <Link href="/contractors" className="ux4g-text-link-s">
            All contractor scorecards
          </Link>
        </p>
      </section>

      <section className="rh-section" aria-labelledby="flags-heading">
        <h2 id="flags-heading" className="ux4g-title-l-strong">
          Bills that need an explanation
        </h2>
        <p className="ux4g-body-m-default ux4g-text-neutral-secondary ux4g-mt-2xs rh-measure">
          {formatInr(outcome.flaggedInr)} sits on {ledger.flags.length} flagged{" "}
          {ledger.flags.length === 1 ? "bill" : "bills"}. A flag is a question for the ward office, not proof of wrongdoing.
        </p>
        <div className="ux4g-mt-s">
          <FlagList flags={ledger.flags} />
        </div>
      </section>

      <section className="rh-section" aria-labelledby="next-heading">
        <h2 id="next-heading" className="ux4g-title-l-strong">
          Where the next rupee should go
        </h2>
        <p className="ux4g-body-m-default ux4g-text-neutral-secondary ux4g-mt-2xs rh-measure">
          Ranked by open complaints, accidents, flooding, traffic, and schools or hospitals on the road.
        </p>
        <div className="ux4g-mt-s">
          <NextRupeeList items={next} />
        </div>
      </section>

      <section className="rh-section" aria-labelledby="people-heading">
        <h2 id="people-heading" className="ux4g-title-l-strong">
          What people reported
        </h2>
        <p className="ux4g-body-m-default ux4g-mt-2xs rh-measure">
          {complaints.total} complaints this season. {complaints.linked} led to a work order;{" "}
          <strong>{complaints.stillOpen} are still open with none</strong>.{" "}
          {citizen.reports > 0
            ? `${citizen.reports} photo ${citizen.reports === 1 ? "report has" : "reports have"} been filed here.`
            : "No photo reports filed here yet."}
        </p>
        <div className="rh-actions ux4g-mt-m">
          <Link href="/" className="ux4g-btn-primary ux4g-btn-m touch-target">
            Report a road problem
          </Link>
          <Link href="/map" className="ux4g-btn-outline-primary ux4g-btn-m touch-target">
            See reports on the map
          </Link>
        </div>
      </section>

      <nav className="rh-pager ux4g-mt-2xl" aria-label="Other wards">
        {prev ? (
          <Link href={`/wards/${wardSlug(prev.ward.code)}`} className="ux4g-text-link-m touch-target">
            Previous: {prev.ward.code} ward
          </Link>
        ) : (
          <span />
        )}
        {after ? (
          <Link href={`/wards/${wardSlug(after.ward.code)}`} className="ux4g-text-link-m touch-target">
            Next: {after.ward.code} ward
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
