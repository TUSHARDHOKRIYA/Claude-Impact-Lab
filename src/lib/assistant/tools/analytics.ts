import { getRupee, nextRupee } from "@/lib/rupee";
import { getScorecards } from "@/lib/rupee/scorecard";
import type { AuditFlagKind } from "@/lib/rupee/types";

export type AnalyticsToolResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

/** Executes citywide, ward, contractor-scorecard, audit-flag, and next-rupee tools. */
export function executeAnalyticsTool(
  toolName: string,
  args: Record<string, unknown>,
): AnalyticsToolResult | null {
  switch (toolName) {
    case "get_contractor_rankings": {
      const { cards, city } = getScorecards();
      const { flags } = getRupee();
      return {
        success: true,
        data: {
          cityBaseline: {
            totalJobs: city.jobs,
            reopenRatePct: Math.round(city.reopenRate * 100),
            slaMissRatePct: Math.round(city.slaMissRate * 100),
          },
          note: "50 = as expected for the same repair method and monsoon stress. Higher is better; contractors with <20 jobs are marked Limited data.",
          contractors: cards.map((c) => ({
            rank: c.rank,
            id: c.id,
            name: c.name,
            overallScore: Number(c.overall.toFixed(1)),
            band: c.band,
            jobs: c.volume.jobs,
            wardsWorked: c.volume.wards,
            billedInr: c.volume.billedInr,
            actualReopenRatePct: Math.round(c.durability.actualRate * 100),
            expectedReopenRatePct: Math.round(c.durability.expectedRate * 100),
            avgCostRatioVsRateCard: Number(c.cost.avgCostRatio.toFixed(2)),
            slaMissRatePct: Math.round(c.speed.actualRate * 100),
            highStressSharePct: Math.round(c.volume.highStressShare * 100),
            repeatRepairsSameRoad: c.repeats.repeatJobs,
            auditFlagCount: flags.filter((f) => f.contractorId === c.id).length,
          })),
        },
      };
    }

    case "get_ward_summary": {
      const wardCode = args.ward_code ? String(args.ward_code).trim().toUpperCase() : null;
      const rupee = getRupee();
      if (!wardCode) {
        const sorted = [...rupee.overview.wards].sort(
          (a, b) =>
            (b.outcome.flaggedInr + b.outcome.failedInr) / Math.max(1, b.spentInr) -
            (a.outcome.flaggedInr + a.outcome.failedInr) / Math.max(1, a.spentInr),
        );
        return {
          success: true,
          data: {
            cityTotalBudgetInr: rupee.overview.budgetInr,
            cityTotalSpentInr: rupee.overview.spentInr,
            cityTotalOrders: rupee.overview.orders,
            cityOutcome: rupee.overview.outcome,
            wardsByMostToExplain: sorted.slice(0, 10).map((w) => ({
              code: w.code,
              name: w.name,
              budgetInr: w.budgetInr,
              spentInr: w.spentInr,
              heldInr: w.outcome.heldInr,
              failedInr: w.outcome.failedInr,
              flaggedInr: w.outcome.flaggedInr,
              flagCount: w.flagCount,
              reopenRatePct: Math.round(w.reopenRate * 100),
            })),
          },
        };
      }
      const ledger = rupee.ledgers.find((l) => l.ward.code.toUpperCase() === wardCode);
      if (!ledger) return { success: false, error: `Ward "${wardCode}" not found. Try codes like F/S, K/W, A, G/N.` };
      return {
        success: true,
        data: {
          ward: ledger.ward.code,
          name: ledger.ward.name,
          lowLyingIndex: ledger.ward.lowLyingIndex,
          budgetInr: ledger.budgetInr,
          spentInr: ledger.spentInr,
          orders: ledger.orders,
          outcome: ledger.outcome,
          reopenRatePct: Math.round(ledger.reopenRate * 100),
          slaRatePct: Math.round(ledger.slaRate * 100),
          complaints: ledger.complaints,
          context: ledger.context,
          topContractors: ledger.byContractor.slice(0, 5),
          flagCount: ledger.flags.length,
        },
      };
    }

    case "get_audit_flags": {
      const wardCode = args.ward_code ? String(args.ward_code).trim().toUpperCase() : null;
      const contractorId = args.contractor_id ? String(args.contractor_id).trim().toUpperCase() : null;
      const kind = args.kind ? (String(args.kind).trim() as AuditFlagKind) : null;
      const limit = Math.min(15, Math.max(1, Number(args.limit) || 8));

      let rows = getRupee().flags;
      if (wardCode) rows = rows.filter((f) => f.ward.toUpperCase() === wardCode);
      if (contractorId) rows = rows.filter((f) => f.contractorId.toUpperCase() === contractorId);
      if (kind) rows = rows.filter((f) => f.kind === kind);

      const sorted = [...rows].sort((a, b) => b.amountAtRiskInr - a.amountAtRiskInr);
      return {
        success: true,
        data: {
          totalMatchingFlags: sorted.length,
          totalAmountAtRiskInr: sorted.reduce((s, f) => s + f.amountAtRiskInr, 0),
          topFlags: sorted.slice(0, limit).map((f) => ({
            workOrderId: f.workOrderId,
            kind: f.kind,
            ward: f.ward,
            roadName: f.roadName,
            contractorName: f.contractorName.replace(" (synthetic)", ""),
            costInr: f.costInr,
            amountAtRiskInr: f.amountAtRiskInr,
            reason: f.reason,
            evidence: f.evidence,
          })),
        },
      };
    }

    case "get_next_rupee_plan": {
      const wardCode = String(args.ward_code ?? "").trim().toUpperCase();
      if (!wardCode) return { success: false, error: "ward_code is required (e.g. F/S, K/W, G/N)." };
      const rupee = getRupee();
      const items = nextRupee(rupee.ds, rupee.flags, wardCode, 6);
      if (items.length === 0) return { success: false, error: `No roads found for ward "${wardCode}".` };
      return {
        success: true,
        data: {
          ward: wardCode,
          priorityRoads: items.map((item) => ({
            rank: item.rank,
            roadId: item.roadId,
            roadName: item.roadName,
            riskScore: item.score,
            underDlpFreeFix: item.underDlp,
            suggestedMethod: item.suggestedMethod,
            estCostInr: item.underDlp ? 0 : item.estCostInr,
            reasons: item.reasons,
          })),
        },
      };
    }

    default:
      return null;
  }
}
