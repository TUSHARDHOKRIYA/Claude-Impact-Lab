import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ContractorBrief, ContractorBriefLoading } from "@/components/rupee/ContractorBrief";
import { ContractorMethod } from "@/components/rupee/ContractorMethod";
import { MethodTable, WardTable } from "@/components/rupee/ContractorBreakdowns";
import { CONTRACT_FILTERS, ContractList, contractFilterOf } from "@/components/rupee/ContractList";
import { FlagList } from "@/components/rupee/FlagList";
import { RepeatRepairs } from "@/components/rupee/RepeatRepairs";
import { BandBadge, ScoreMeter } from "@/components/rupee/ScoreMeter";
import { ScoreParts } from "@/components/rupee/ScoreParts";
import { formatInr, formatInrShort, getRupee } from "@/lib/rupee";
import { getScorecards, PRIOR_JOBS } from "@/lib/rupee/scorecard";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ show?: string; n?: string }>;
};

function findCard(id: string) {
  return getScorecards().cards.find((card) => card.id.toLowerCase() === id.toLowerCase());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const card = findCard((await params).id);
  if (!card) return { title: "Contractor not found" };
  return {
    title: `${card.name} scorecard`,
    description: `How ${card.name}'s monsoon road repairs held up, what they billed against the rate card, and whether they finished on time.`,
  };
}

export default async function ContractorPage({ params, searchParams }: Props) {
  const card = findCard((await params).id);
  if (!card) notFound();
  const query = await searchParams;
  const filter = contractFilterOf(query.show);
  const limit = Math.min(Math.max(Number(query.n) || 10, 10), 500);

  const { flags } = getRupee();
  const ownFlags = flags.filter((flag) => flag.contractorId === card.id);
  const flaggedInr = new Set(ownFlags.map((f) => f.workOrderId));
  const flaggedTotal = card.orders.filter((o) => flaggedInr.has(o.id)).reduce((n, o) => n + o.costInr, 0);
  const test = CONTRACT_FILTERS.find((f) => f.key === filter)!.test;
  const matching = card.orders.filter(test);
  const { cards } = getScorecards();
  const basePath = `/contractors/${card.id}`;

  return (
    <div className="shell-narrow rb-page">
      <nav className="ux4g-breadcrumb ux4g-breadcrumb-divider" aria-label="Breadcrumb">
        <ol className="ux4g-breadcrumb-list flex">
          <li className="ux4g-breadcrumb-item">
            <Link href="/contractors" className="ux4g-breadcrumb-link touch-target">
              Contractors
            </Link>
          </li>
          <li className="ux4g-breadcrumb-item active" aria-current="page">
            {card.name}
          </li>
        </ol>
      </nav>

      <p className="ux4g-body-s-default ux4g-text-neutral-secondary ux4g-mt-xs">
        Rank {card.rank} of {cards.length}. Empanelled {card.empanelledSince}. {card.id}.
      </p>
      <h1 className="ux4g-display-xs-strong">{card.name}</h1>

      <section className="ux4g-card ux4g-card-solid ux4g-card-vertical ux4g-mt-m" aria-labelledby="score-heading">
        <div className="ux4g-card-body rb-hero">
          <div className="rb-hero-score">
            <p className="ux4g-body-s-default ux4g-text-neutral-secondary" id="score-heading">
              Overall score
            </p>
            <p className="rb-hero-number">{card.overall.toFixed(0)}</p>
            <BandBadge band={card.band} />
          </div>
          <div className="rb-hero-copy">
            <ScoreMeter score={card.overall} label={`${card.name} overall score`} large />
            <p className="ux4g-body-s-default ux4g-text-neutral-secondary ux4g-mt-s">
              50 means exactly as expected. 60 and above is Strong, 40 to 60 is As expected, under 40 Needs attention.
              {card.volume.jobs >= PRIOR_JOBS
                ? ` ${card.volume.jobs} jobs counted.`
                : ` Under ${PRIOR_JOBS} jobs, so no band is given.`}
            </p>
          </div>
        </div>
      </section>

      <div className="rb-pdf-actions">
        <a
          href={`${basePath}/scorecard.pdf`}
          download
          className="ux4g-btn ux4g-btn-m ux4g-btn-outline-primary touch-target rb-btn-icon"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
          </svg>
          Download scorecard (PDF)
        </a>
      </div>

      <section className="rb-section" aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="ux4g-title-l-strong">
          In plain words
        </h2>
        <div className="ux4g-mt-xs">
          <Suspense fallback={<ContractorBriefLoading />}>
            <ContractorBrief card={card} />
          </Suspense>
        </div>
      </section>

      <section className="rb-section" aria-labelledby="parts-heading">
        <h2 id="parts-heading" className="ux4g-title-l-strong">
          How the score is made
        </h2>
        <p className="ux4g-body-m-default ux4g-text-neutral-secondary ux4g-mt-2xs rb-measure">
          Each part compares what happened with what is expected for the same kind of work in the same conditions.
          Doing exactly as expected scores 50.
        </p>
        <div className="ux4g-mt-s">
          <ScoreParts card={card} />
        </div>
      </section>

      <section className="rb-section" aria-labelledby="repeat-heading">
        <h2 id="repeat-heading" className="ux4g-title-l-strong">
          Did the same potholes come back?
        </h2>
        <p className="ux4g-body-m-default ux4g-text-neutral-secondary ux4g-mt-2xs rb-measure">
          Shown as evidence. It is not counted in the score.
        </p>
        <div className="ux4g-mt-s">
          <RepeatRepairs repeats={card.repeats} contractorName={card.name} />
        </div>
      </section>

      <section className="rb-section" aria-labelledby="flags-heading">
        <h2 id="flags-heading" className="ux4g-title-l-strong">
          Bills that need an explanation
        </h2>
        <p className="ux4g-body-m-default ux4g-text-neutral-secondary ux4g-mt-2xs rb-measure">
          {formatInr(flaggedTotal)} sits on {ownFlags.length} flagged {ownFlags.length === 1 ? "bill" : "bills"}.{" "}
          {card.volume.paidUnderDlpJobs > 0
            ? `${card.volume.paidUnderDlpJobs} jobs (${formatInrShort(card.volume.paidUnderDlpInr)}) were paid for on roads still under guarantee. `
            : ""}
          A flag is a question for the ward office, not proof of wrongdoing.
        </p>
        <div className="ux4g-mt-s">
          <FlagList flags={ownFlags} emptyText="No audit flags on this contractor's bills." />
        </div>
      </section>

      <section className="rb-section" aria-labelledby="where-heading">
        <h2 id="where-heading" className="ux4g-title-l-strong">
          Where they worked
        </h2>
        <p className="ux4g-body-m-default ux4g-text-neutral-secondary ux4g-mt-2xs rb-measure">
          Red figures are more than 15% worse than expected for that ward&apos;s mix of work.
        </p>
        <div className="ux4g-mt-s">
          <WardTable rows={card.byWard} />
        </div>
        <details className="rb-more ux4g-mt-s">
          <summary className="ux4g-btn-text-primary ux4g-btn-m touch-target">By repair method</summary>
          <div className="ux4g-mt-xs">
            <MethodTable rows={card.byMethod} />
          </div>
        </details>
      </section>

      <section className="rb-section" id="contracts" aria-labelledby="contracts-heading">
        <h2 id="contracts-heading" className="ux4g-title-l-strong">
          Every contract
        </h2>
        <div className="ux4g-mt-s">
          <ContractList
            orders={matching}
            basePath={basePath}
            filter={filter}
            limit={limit}
            total={card.orders.length}
          />
        </div>
      </section>

      <section className="rb-section" aria-labelledby="method-heading">
        <h2 id="method-heading" className="ux4g-title-l-strong">
          How we score
        </h2>
        <div className="ux4g-mt-s">
          <ContractorMethod />
        </div>
      </section>

      <nav className="rb-pager ux4g-mt-2xl" aria-label="Other contractors">
        {cards[card.rank - 2] ? (
          <Link href={`/contractors/${cards[card.rank - 2].id}`} className="ux4g-text-link-m touch-target">
            Ranked above: {cards[card.rank - 2].name}
          </Link>
        ) : (
          <span />
        )}
        {cards[card.rank] ? (
          <Link href={`/contractors/${cards[card.rank].id}`} className="ux4g-text-link-m touch-target">
            Ranked below: {cards[card.rank].name}
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
