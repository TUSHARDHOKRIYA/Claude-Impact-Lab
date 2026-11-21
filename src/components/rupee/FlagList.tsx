import { formatInr } from "@/lib/rupee/format";
import type { AuditFlag, AuditFlagKind } from "@/lib/rupee/types";

export const FLAG_LABELS: Record<AuditFlagKind, string> = {
  over_rate: "Billed above the rate card",
  double_billed: "Billed twice for one stretch",
  paid_under_dlp: "BMC paid while the road was under guarantee",
};

export const FLAG_EXPLAINERS: Record<AuditFlagKind, string> = {
  over_rate: "The bill is more than 35% above what the rate card allows for that work and area.",
  double_billed: "A second bill for the same road and method within seven days, with no complaint linked to it.",
  paid_under_dlp:
    "The road was inside its Defect Liability Period, so the contractor who resurfaced it should have fixed it free.",
};

/** Flags grouped by kind in a UX4G bordered accordion, each row pointing at its work order. */
export function FlagList({ flags, limit = 6 }: { flags: AuditFlag[]; limit?: number }) {
  const groups = (Object.keys(FLAG_LABELS) as AuditFlagKind[])
    .map((kind) => {
      const rows = flags.filter((flag) => flag.kind === kind).sort((a, b) => b.amountAtRiskInr - a.amountAtRiskInr);
      return { kind, rows, total: rows.reduce((sum, row) => sum + row.amountAtRiskInr, 0) };
    })
    .filter((group) => group.rows.length > 0);

  if (groups.length === 0) {
    return <p className="ux4g-body-m-default ux4g-text-neutral-secondary">No audit flags in this ward.</p>;
  }
  return (
    <div className="ux4g-accordion ux4g-accordion-arrow-right ux4g-accordion-bordered rb-accordion">
      {groups.map((group) => (
        <details key={group.kind} className="ux4g-accordion__item">
          <summary className="ux4g-accordion__button touch-target">
            <span className="ux4g-accordion__button-content">
              <span className="ux4g-accordion__title">{FLAG_LABELS[group.kind]}</span>
              <span className="ux4g-body-s-default ux4g-text-neutral-secondary">
                {group.rows.length} {group.rows.length === 1 ? "job" : "jobs"}, {formatInr(group.total)} to explain
              </span>
            </span>
          </summary>
          <div className="ux4g-accordion__body">
            <p className="ux4g-body-s-default ux4g-text-neutral-secondary">{FLAG_EXPLAINERS[group.kind]}</p>
            <ul className="rb-flag-rows">
              {group.rows.slice(0, limit).map((flag) => (
                <li key={`${flag.kind}-${flag.workOrderId}`}>
                  <p className="ux4g-body-m-strong">
                    {flag.workOrderId}, {flag.roadName}
                  </p>
                  <p className="ux4g-body-s-default">{flag.reason}</p>
                  <p className="ux4g-body-s-default ux4g-text-neutral-secondary">
                    {flag.contractorName}. Completed {flag.completedAt.slice(0, 10)}.
                    {flag.evidence.length ? ` Compare with ${flag.evidence.join(", ")}.` : ""}
                  </p>
                </li>
              ))}
            </ul>
            {group.rows.length > limit ? (
              <p className="ux4g-body-s-default ux4g-text-neutral-secondary ux4g-mt-s">
                {group.rows.length - limit} more of this kind are in the work order register.
              </p>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}
