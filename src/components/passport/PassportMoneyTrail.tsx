import { OutcomeBar } from "@/components/rupee/OutcomeBar";
import type { RoadPassportData } from "@/lib/passport/types";
import { formatInr } from "@/lib/rupee/format";

export function PassportMoneyTrail({ data }: { data: RoadPassportData }) {
  const { summary, methodBreakdown, contractorBreakdown } = data;

  const outcomeData = {
    heldInr: summary.heldInr,
    failedInr: summary.failedInr,
    flaggedInr: summary.flaggedInr,
  };

  return (
    <section aria-labelledby="money-trail-heading" className="ux4g-card ux4g-card-solid p-6 border border-[var(--rule)] space-y-6">
      <div>
        <h2 id="money-trail-heading" className="ux4g-heading-s-strong text-[var(--ink)]">
          Money Trail & Rate Card Comparison
        </h2>
        <p className="ux4g-body-s-default text-[var(--mist)] mt-1">
          Where money was billed on this road, how it compared with BMC standard rate cards, and what held.
        </p>
      </div>

      <div>
        <OutcomeBar
          outcome={outcomeData}
          spentInr={summary.totalBilledInr}
          budgetInr={summary.expectedCostInr || summary.totalBilledInr}
          label="Road spend classification by repair outcome"
        />
      </div>

      <div className="space-y-3">
        <h3 className="ux4g-body-m-strong text-[var(--ink)]">Spend by Repair Method</h3>
        <div className="rb-table-wrap">
          <table className="rb-data-table">
            <thead>
              <tr>
                <th scope="col">Repair Method</th>
                <th scope="col" className="text-right">Orders</th>
                <th scope="col" className="text-right">Billed INR</th>
                <th scope="col" className="text-right">30d Reopen %</th>
              </tr>
            </thead>
            <tbody>
              {methodBreakdown.map((m) => (
                <tr key={m.method}>
                  <td className="font-medium text-[var(--ink)]">{m.method}</td>
                  <td className="text-right text-[var(--mist)]">{m.orders}</td>
                  <td className="text-right font-mono text-[var(--ink)]">{formatInr(m.billedInr)}</td>
                  <td className="text-right">
                    <span className={m.reopenRate >= 0.25 ? "text-[var(--failed-ink)] font-semibold" : "text-[var(--ink)]"}>
                      {Math.round(m.reopenRate * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="ux4g-body-m-strong text-[var(--ink)]">Spend by Contractor</h3>
        <div className="rb-table-wrap">
          <table className="rb-data-table">
            <thead>
              <tr>
                <th scope="col">Contractor</th>
                <th scope="col" className="text-right">Orders</th>
                <th scope="col" className="text-right">Billed INR</th>
                <th scope="col" className="text-right">30d Reopen %</th>
              </tr>
            </thead>
            <tbody>
              {contractorBreakdown.map((c) => (
                <tr key={c.contractorId}>
                  <td className="font-medium text-[var(--ink)]">{c.contractorName}</td>
                  <td className="text-right text-[var(--mist)]">{c.orders}</td>
                  <td className="text-right font-mono text-[var(--ink)]">{formatInr(c.billedInr)}</td>
                  <td className="text-right">
                    <span className={c.reopenRate >= 0.25 ? "text-[var(--failed-ink)] font-semibold" : "text-[var(--ink)]"}>
                      {Math.round(c.reopenRate * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-3 bg-[var(--sheet)] rounded text-xs text-[var(--mist)] space-y-1">
        <p>
          <strong>Financial Provenance Notice:</strong> Work order cost figures indicate amounts billed on completed repair jobs. BMC bank guarantee withholdings, eMB measurement reconciliation, and approved payments are not contained in the municipal dataset.
        </p>
      </div>
    </section>
  );
}
