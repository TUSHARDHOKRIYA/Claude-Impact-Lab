import type { WorkOrder } from "@/lib/rupee/types";
import { areCategoriesCompatible, normaliseCategory } from "../normalise/categories";
import type {
  CanonicalIssue,
  LinkDecisionStatus,
  WorkOrderLinkRecord,
  WorkOrderLinkType,
} from "../types";

export type InferredCandidateOptions = {
  maxTemporalGapDays?: number;
  minConfidenceThreshold?: number;
};

/**
 * Generates inferred candidate matches between canonical issues and work orders
 * where no explicit complaint linkage exists.
 *
 * Enforces strict distinction between probabilistic associations and official links.
 */
export function generateInferredWorkOrderCandidates(
  unlinkedIssues: CanonicalIssue[],
  candidateWorkOrders: WorkOrder[],
  options: InferredCandidateOptions = {},
  matchingVersion = "v1.0.0",
): WorkOrderLinkRecord[] {
  const maxGapDays = options.maxTemporalGapDays ?? 30;
  const minConfidence = options.minConfidenceThreshold ?? 0.5;
  const candidates: WorkOrderLinkRecord[] = [];

  // Index work orders by road ID for fast filtering
  const wosByRoad = new Map<string, WorkOrder[]>();
  for (const wo of candidateWorkOrders) {
    const list = wosByRoad.get(wo.roadId) ?? [];
    list.push(wo);
    wosByRoad.set(wo.roadId, list);
  }

  for (const issue of unlinkedIssues) {
    // Invariant: Do not invent a work order for an unresolved complaint / issue without road
    if (!issue.primaryRoadId) continue;

    const roadWos = wosByRoad.get(issue.primaryRoadId) ?? [];
    if (roadWos.length === 0) continue;

    const issueFirstTime = new Date(issue.firstReportedAt).getTime();
    const issueLastTime = new Date(issue.latestReportedAt).getTime();

    for (const wo of roadWos) {
      const woCategory = normaliseCategory(wo.workType);
      const categoryCompatible = areCategoriesCompatible(issue.category, woCategory);

      // Incompatible work types are rejected
      if (!categoryCompatible) continue;

      const woAssignedTime = new Date(wo.assignedAt || wo.startedAt).getTime();
      const deltaDays = Math.round((woAssignedTime - issueFirstTime) / (1000 * 60 * 60 * 24));

      // Work order must be within temporal window (e.g. from 2 days before first complaint to maxGapDays after latest)
      if (deltaDays < -2 || deltaDays > maxGapDays) continue;

      // Scoring factors
      const sameCategory = issue.category === woCategory;
      const categoryScore = sameCategory ? 1.0 : 0.65;
      const temporalScore = Math.max(0, 1.0 - Math.abs(deltaDays) / maxGapDays);

      const totalConfidence = Number((0.5 * 1.0 + 0.3 * categoryScore + 0.2 * temporalScore).toFixed(2));

      if (totalConfidence >= minConfidence) {
        let linkType: WorkOrderLinkType = "geo_temporal_candidate";
        let decisionStatus: LinkDecisionStatus = "candidate";

        if (totalConfidence >= 0.75) {
          linkType = "geo_temporal_candidate";
          decisionStatus = "candidate";
        } else if (totalConfidence >= 0.6) {
          linkType = "semantic_candidate";
          decisionStatus = "pending_review";
        } else {
          linkType = "manual_review";
          decisionStatus = "pending_review";
        }

        candidates.push({
          id: `LINK-INF-${wo.id}-${issue.id}`,
          workOrderId: wo.id,
          complaintId: null,
          issueId: issue.id,
          linkType,
          confidence: totalConfidence,
          evidenceRecordIds: [wo.id, ...issue.complaintIds],
          matchingVersion,
          decisionStatus,
          reviewerDecision: null,
          explanation: `Probabilistic candidate: issue "${issue.id}" (${issue.category}) shares road segment "${issue.primaryRoadId}" with work order "${wo.id}" (${wo.workType}) assigned ${Math.abs(deltaDays)}d from report.`,
        });
      }
    }
  }

  return candidates;
}
