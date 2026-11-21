import type { WorkOrder } from "@/lib/rupee/types";
import type { CanonicalIssue, IssueOutcome, IssueOutcomeStatus, NormalizedComplaintRecord } from "../types";

/**
 * Classifies civic issue outcomes based on contractor activity and subsequent reports.
 *
 * NOTE: A completed work order does NOT constitute proof that the road is fixed,
 * nor does the absence of complaints prove that a defect is resolved.
 */
export function classifyIssueOutcome(
  issue: CanonicalIssue,
  linkedWorkOrders: WorkOrder[],
  memberComplaints: NormalizedComplaintRecord[],
): IssueOutcome {
  if (linkedWorkOrders.length === 0) {
    return {
      issueId: issue.id,
      outcomeStatus: "unlinked",
      primaryWorkOrderId: null,
      workOrderIds: [],
      slaMet: null,
      reopenedWithin30d: false,
      repeatComplaintsAfterCompletion: 0,
      explanation: "No official work order has been associated with this civic issue.",
    };
  }

  // Sort work orders by completion / start date
  const sortedWos = [...linkedWorkOrders].sort((a, b) => {
    const timeA = new Date(a.completedAt || a.startedAt || a.assignedAt).getTime();
    const timeB = new Date(b.completedAt || b.startedAt || b.assignedAt).getTime();
    return timeB - timeA;
  });

  const primaryWo = sortedWos[0];
  const allWoIds = sortedWos.map((w) => w.id);
  const anyReopened = sortedWos.some((w) => w.reopened);

  // Check for repeat complaints filed after the latest work order completion
  let repeatCount = 0;
  if (primaryWo.completedAt) {
    const compTime = new Date(primaryWo.completedAt).getTime();
    for (const c of memberComplaints) {
      if (new Date(c.normalizedTimestamp).getTime() > compTime) {
        repeatCount++;
      }
    }
  }

  let outcomeStatus: IssueOutcomeStatus = "unknown";
  let explanation = "";

  if (anyReopened) {
    outcomeStatus = "reopened_within_30d";
    explanation = `Work order "${primaryWo.id}" was officially marked as reopened within 30 days.`;
  } else if (repeatCount > 0) {
    outcomeStatus = "reported_again_after_repair";
    explanation = `${repeatCount} complaint(s) were logged at this location after work order "${primaryWo.id}" completed on ${primaryWo.completedAt}.`;
  } else if (primaryWo.completedAt && primaryWo.completedAt.trim() !== "") {
    outcomeStatus = "work_order_completed";
    explanation = `Work order "${primaryWo.id}" was logged as completed on ${primaryWo.completedAt} (SLA ${primaryWo.slaMet ? "met" : "missed"}).`;
  } else if (primaryWo.startedAt && primaryWo.startedAt.trim() !== "") {
    outcomeStatus = "work_in_progress";
    explanation = `Work order "${primaryWo.id}" is currently in progress (started ${primaryWo.startedAt}).`;
  } else if (primaryWo.assignedAt && primaryWo.assignedAt.trim() !== "") {
    outcomeStatus = "work_order_found";
    explanation = `Work order "${primaryWo.id}" has been assigned to ${primaryWo.contractorName}.`;
  }

  return {
    issueId: issue.id,
    outcomeStatus,
    primaryWorkOrderId: primaryWo.id,
    workOrderIds: allWoIds,
    slaMet: primaryWo.slaMet,
    reopenedWithin30d: anyReopened,
    repeatComplaintsAfterCompletion: repeatCount,
    explanation,
  };
}
