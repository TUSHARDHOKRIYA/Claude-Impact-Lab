import type { WorkOrder } from "@/lib/rupee/types";
import type { IssueService } from "../issues/service";
import type { NormalizedComplaintRecord, WorkOrderLinkRecord } from "../types";

export type ExplicitLinkingResult = {
  links: WorkOrderLinkRecord[];
  brokenReferences: Array<{ workOrderId: string; complaintId: string }>;
  issueIdsWithExplicitLinks: Set<string>;
};

/**
 * Resolves explicit work-order to complaint links using official `linked_complaint_ids`.
 * Detects broken references and attaches canonical civic issue IDs.
 */
export function resolveExplicitWorkOrderLinks(
  workOrders: WorkOrder[],
  complaintMap: Map<string, NormalizedComplaintRecord>,
  issueService: IssueService,
  matchingVersion = "v1.0.0",
): ExplicitLinkingResult {
  const links: WorkOrderLinkRecord[] = [];
  const brokenReferences: Array<{ workOrderId: string; complaintId: string }> = [];
  const issueIdsWithExplicitLinks = new Set<string>();

  for (const wo of workOrders) {
    if (!wo.complaintIds || wo.complaintIds.length === 0) continue;

    for (const cId of wo.complaintIds) {
      const complaint = complaintMap.get(cId);

      // Broken reference check
      if (!complaint) {
        brokenReferences.push({ workOrderId: wo.id, complaintId: cId });
        continue;
      }

      const issue = issueService.getIssueForComplaint(cId);
      const issueId = issue ? issue.id : `ORPHAN-${cId}`;
      if (issue) issueIdsWithExplicitLinks.add(issue.id);

      const link: WorkOrderLinkRecord = {
        id: `LINK-EXP-${wo.id}-${cId}`,
        workOrderId: wo.id,
        complaintId: cId,
        issueId,
        linkType: "explicit_complaint_link",
        confidence: "exact",
        evidenceRecordIds: [wo.id, cId],
        matchingVersion,
        decisionStatus: "accepted",
        reviewerDecision: null,
        explanation: `Official BMC direct link in work order "${wo.id}" referencing complaint "${cId}" for road "${wo.roadId}".`,
      };

      links.push(link);
    }
  }

  return { links, brokenReferences, issueIdsWithExplicitLinks };
}
