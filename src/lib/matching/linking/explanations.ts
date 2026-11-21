import type { WorkOrder } from "@/lib/rupee/types";
import type { CanonicalIssue, WorkOrderLinkRecord } from "../types";

export type AuditTrailEntry = {
  linkId: string;
  relationship: string;
  confidenceBadge: string;
  evidence: string[];
  explanation: string;
  verificationStatus: string;
};

/**
 * Generates an end-to-end, citizen- and auditor-friendly explanation
 * for any work order to issue relationship.
 */
export function buildAuditTrailExplanation(
  link: WorkOrderLinkRecord,
  wo?: WorkOrder | null,
  issue?: CanonicalIssue | null,
): AuditTrailEntry {
  let confidenceBadge = "";
  if (link.confidence === "exact") {
    confidenceBadge = "OFFICIAL BMC RECORD";
  } else if (link.confidence >= 0.8) {
    confidenceBadge = `HIGH PROBABILITY (${Math.round(link.confidence * 100)}%)`;
  } else if (link.confidence >= 0.6) {
    confidenceBadge = `CANDIDATE (${Math.round(link.confidence * 100)}%)`;
  } else {
    confidenceBadge = "MANUAL REVIEW REQUIRED";
  }

  let relationship = "";
  switch (link.linkType) {
    case "explicit_complaint_link":
      relationship = "Official Direct Reference";
      break;
    case "geo_temporal_candidate":
      relationship = "Road & Timeline Alignment";
      break;
    case "semantic_candidate":
      relationship = "Category & Keyword Alignment";
      break;
    case "manual_review":
      relationship = "Pending Administrative Review";
      break;
  }

  const evidenceSummary: string[] = [
    `Work Order ID: ${link.workOrderId}`,
    `Associated Issue ID: ${link.issueId}`,
    `Matching Engine: ${link.matchingVersion}`,
    ...link.evidenceRecordIds.map((id) => `Evidence Record: ${id}`),
  ];

  if (wo) {
    evidenceSummary.push(
      `Contractor: ${wo.contractorName} (${wo.contractorId})`,
      `Repair Method: ${wo.method}`,
      `Cost Billed: ₹${wo.costInr.toLocaleString("en-IN")}`,
    );
  }

  if (issue) {
    evidenceSummary.push(
      `Issue Category: ${issue.category}`,
      `Total Complaints Merged: ${issue.complaintCount}`,
      `Ward: ${issue.ward}`,
    );
  }

  return {
    linkId: link.id,
    relationship,
    confidenceBadge,
    evidence: evidenceSummary,
    explanation: link.explanation,
    verificationStatus: link.decisionStatus,
  };
}
