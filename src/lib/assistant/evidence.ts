import type { ComplaintIntelligenceEngine } from "@/lib/matching/engine";
import type { Dataset } from "@/lib/rupee/load";
import { maskPII } from "./security";
import type { EvidenceBundle, TimelineEventRecord } from "./types";

/**
 * Compiles a bounded, public-safe evidence bundle for a complaint or issue.
 * Strips personal information (complainant IDs, phone numbers) before model consumption.
 */
export function buildEvidenceBundle(
  complaintId: string,
  engine: ComplaintIntelligenceEngine,
  dataset: Dataset,
): EvidenceBundle | null {
  const c = engine.getComplaint(complaintId);
  if (!c) return null;

  const issue = engine.getIssueForComplaint(complaintId);
  const links = issue ? engine.getLinksForIssue(issue.id) : [];
  const limitations: string[] = [];
  const sourceRecordIds: string[] = [c.id];

  // Resolve associated work orders
  const workOrderMap = new Map(dataset.workOrders.map((w) => [w.id, w]));
  const workOrders: EvidenceBundle["workOrders"] = [];

  for (const link of links) {
    const wo = workOrderMap.get(link.workOrderId);
    if (wo) {
      sourceRecordIds.push(wo.id);
      workOrders.push({
        id: wo.id,
        contractorId: wo.contractorId,
        contractorName: wo.contractorName,
        costInr: wo.costInr,
        assignedAt: wo.assignedAt,
        startedAt: wo.startedAt,
        completedAt: wo.completedAt,
        slaHours: wo.slaHours,
        slaMet: wo.slaMet,
        reopened: wo.reopened,
        isOfficialLink: link.linkType === "explicit_complaint_link",
        remark: wo.remark,
      });
    }
  }

  if (workOrders.length === 0) {
    limitations.push("No official BMC work order is currently linked to this complaint or issue in local records.");
  } else if (!workOrders.some((w) => w.isOfficialLink)) {
    limitations.push("Work order associations are inferred based on geographic road segment and timeline alignment, not direct BMC complaint references.");
  }

  if (!c.resolution.roadId) {
    limitations.push("Complaint location could not be snapped to an exact road segment with high confidence.");
  }

  // Construct timeline
  const timeline: TimelineEventRecord[] = [];
  timeline.push({
    timestamp: c.receivedAt,
    event: `Complaint reported via ${c.channelRaw} in ${c.resolution.ward ?? "unassigned"} ward.`,
    actor: "Citizen",
    stage: "reported",
  });

  if (issue && issue.complaintCount > 1) {
    timeline.push({
      timestamp: issue.firstReportedAt,
      event: `Clustered into canonical issue "${issue.id}" alongside ${issue.complaintCount - 1} related report(s).`,
      actor: "Intelligence Engine",
      stage: "clustered",
    });
  }

  for (const wo of workOrders) {
    if (wo.assignedAt) {
      timeline.push({
        timestamp: wo.assignedAt,
        event: `Work order "${wo.id}" assigned to contractor ${wo.contractorName}.`,
        actor: "BMC Engineer",
        stage: "assigned",
      });
    }
    if (wo.startedAt) {
      timeline.push({
        timestamp: wo.startedAt,
        event: `Repair commenced on site.`,
        actor: wo.contractorName,
        stage: "started",
      });
    }
    if (wo.completedAt) {
      timeline.push({
        timestamp: wo.completedAt,
        event: `Work order marked completed (Billed ₹${wo.costInr.toLocaleString("en-IN")}, SLA ${wo.slaMet ? "Met" : "Missed"}).`,
        actor: wo.contractorName,
        stage: "completed",
      });
    }
    if (wo.reopened) {
      timeline.push({
        timestamp: wo.completedAt,
        event: `Repair failed within 30 days and was reopened for rectification under defect liability.`,
        actor: "Audit System",
        stage: "reopened",
      });
    }
  }

  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Check audit flags on road or work orders
  const auditFlags: string[] = [];
  if (c.resolution.roadId) {
    const road = dataset.roads.find((r) => r.id === c.resolution.roadId);
    if (road?.underDlp) {
      auditFlags.push(`Road "${road.id}" is under Defect Liability Period (DLP). Repairs must be completed by the original contractor at zero cost to BMC.`);
    }
  }

  return {
    complaintId: c.id,
    channel: c.channelRaw,
    publicSafeDescription: maskPII(c.cleanText),
    reportedLanguage: c.language,
    resolvedRoadId: c.resolution.roadId,
    resolvedRoadName: c.resolution.roadName,
    resolvedWard: c.resolution.ward,
    canonicalIssueId: issue?.id ?? null,
    issueCategory: issue?.category ?? c.canonicalCategory,
    issueStatus: issue?.status ?? c.status,
    workOrders,
    timeline,
    sourceRecordIds,
    limitations,
    auditFlags,
  };
}
