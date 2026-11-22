import Link from "next/link";
import type { PassportWorkOrder } from "@/lib/passport/types";
import { formatInr } from "@/lib/rupee/format";

export function PassportTimeline({ workOrders }: { workOrders: PassportWorkOrder[] }) {
  if (workOrders.length === 0) {
    return (
      <div className="ux4g-card ux4g-card-solid p-6 text-center text-[var(--mist)]">
        No work orders recorded for this road segment in municipal records.
      </div>
    );
  }

  return (
    <section aria-labelledby="work-order-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="work-order-heading" className="ux4g-heading-s-strong text-[var(--ink)]">
          Work Orders & Contractor Timeline
        </h2>
        <span className="text-xs text-[var(--mist)]">{workOrders.length} records</span>
      </div>

      <div className="space-y-4">
        {workOrders.map((wo) => (
          <article
            key={wo.id}
            className="ux4g-card ux4g-card-solid p-5 border border-[var(--rule)] hover:border-[var(--enamel)] transition-colors"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--sheet)] text-[var(--ink)]">
                    {wo.id}
                  </span>
                  <Link
                    href={`/contractors/${wo.contractorId}`}
                    className="text-xs font-medium text-[var(--enamel)] hover:underline touch-target"
                  >
                    {wo.contractorName}
                  </Link>
                </div>
                <h3 className="ux4g-body-m-strong text-[var(--ink)]">
                  {wo.workType}: {wo.method}
                </h3>
              </div>

              <div className="text-right">
                <div className="text-sm font-bold text-[var(--ink)]">{formatInr(wo.costInr)}</div>
                <div className="text-[0.6875rem] text-[var(--mist)]">
                  Billed ({wo.areaSqm} sqm)
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[var(--rule)] text-xs">
              <span className="text-[var(--mist)]">
                Assigned: {wo.assignedAt} — Completed: {wo.completedAt}
              </span>
              {wo.slaMet ? (
                <span className="rb-chip rb-chip-held text-[0.6875rem]">SLA Met ({wo.slaHours}h)</span>
              ) : (
                <span className="rb-chip rb-chip-failed text-[0.6875rem]">SLA Missed ({wo.slaHours}h target)</span>
              )}

              {wo.reopened ? (
                <span className="rb-chip rb-chip-failed text-[0.6875rem]">Reopened in 30d</span>
              ) : (
                <span className="rb-chip rb-chip-held text-[0.6875rem]">No 30d Reopening</span>
              )}
            </div>

            {wo.varianceInr > 0 && (
              <div className="mt-2 text-xs bg-[var(--flagged-bg)] text-[var(--flagged-ink)] border border-[var(--flagged-border)] p-2 rounded">
                Rate variance: +{formatInr(wo.varianceInr)} (+{wo.variancePct}%) above standard rate card expectation ({formatInr(wo.expectedCostInr)}).
              </div>
            )}

            {wo.flags.length > 0 && (
              <div className="mt-2 text-xs text-[var(--failed-ink)] font-medium space-y-1">
                {wo.flags.map((flag, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span aria-hidden="true">⚠️</span>
                    <span>{flag}</span>
                  </div>
                ))}
              </div>
            )}

            {wo.remark && (
              <p className="mt-2 text-xs text-[var(--mist)] italic">
                Engineer note: &ldquo;{wo.remark}&rdquo;
              </p>
            )}

            {wo.complaintIds.length > 0 && (
              <div className="mt-3 pt-2 text-[0.6875rem] text-[var(--mist)] flex flex-wrap items-center gap-1.5">
                <span>Linked citizen complaints:</span>
                {wo.complaintIds.map((cid) => (
                  <Link
                    key={cid}
                    href={`/receipt/${cid}`}
                    className="font-mono text-[var(--enamel)] hover:underline"
                  >
                    {cid}
                  </Link>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
