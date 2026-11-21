import type { Complaint, Dataset } from "../rupee/load";
import { generateCandidatePairs } from "./candidate";
import { type IssueService, buildIssueService } from "./issues";
import { type WorkOrderLinkingResult, buildAuditTrailExplanation, linkWorkOrdersToIssues } from "./linking";
import { normaliseComplaint } from "./normalise";
import { resolveLocation } from "./resolve";
import type {
  CanonicalIssue,
  IssueOutcome,
  NormalizedComplaintRecord,
  WorkOrderLinkRecord,
} from "./types";

export type ComplaintIntelligenceEngine = {
  complaints: NormalizedComplaintRecord[];
  complaintById: Map<string, NormalizedComplaintRecord>;
  issues: CanonicalIssue[];
  issueService: IssueService;
  linkingResult: WorkOrderLinkingResult;

  // Accessors
  getComplaint: (id: string) => NormalizedComplaintRecord | undefined;
  getIssue: (id: string) => CanonicalIssue | undefined;
  getIssueForComplaint: (complaintId: string) => CanonicalIssue | undefined;
  getLinksForIssue: (issueId: string) => WorkOrderLinkRecord[];
  getLinksForWorkOrder: (workOrderId: string) => WorkOrderLinkRecord[];
  getOutcomeForIssue: (issueId: string) => IssueOutcome | undefined;
  getAuditTrailForIssue: (issueId: string) => ReturnType<typeof buildAuditTrailExplanation>[];

  // Ingest single complaint dynamically
  ingestComplaint: (raw: Complaint) => {
    normalized: NormalizedComplaintRecord;
    matchedIssue: CanonicalIssue;
    isNewIssue: boolean;
  };
};

export function createComplaintIntelligenceEngine(
  dataset: Dataset,
  matchingVersion = "v1.0.0",
): ComplaintIntelligenceEngine {
  const roadsByWard = new Map<string, typeof dataset.roads>();
  for (const r of dataset.roads) {
    const list = roadsByWard.get(r.ward) ?? [];
    list.push(r);
    roadsByWard.set(r.ward, list);
  }

  // 1. Normalise & Resolve all complaints
  const complaints: NormalizedComplaintRecord[] = [];
  const complaintById = new Map<string, NormalizedComplaintRecord>();

  for (const raw of dataset.complaints) {
    const resolution = resolveLocation(
      {
        lat: raw.lat,
        lng: raw.lng,
        localityText: raw.locality,
        wardCode: raw.ward,
      },
      { roadsByWard },
    );

    const norm = normaliseComplaint(raw, resolution);
    complaints.push(norm);
    complaintById.set(norm.id, norm);
  }

  // 2. Candidate Duplicate Matching
  const candidatePairs = generateCandidatePairs(complaints);

  // 3. Canonical Issue Clustering
  const issueService = buildIssueService(complaints, candidatePairs, matchingVersion);

  // 4. Work Order Linking & Outcome Classification
  const linkingResult = linkWorkOrdersToIssues(
    dataset.workOrders,
    complaints,
    issueService,
    matchingVersion,
  );

  const workOrderMap = new Map(dataset.workOrders.map((w) => [w.id, w]));

  return {
    complaints,
    complaintById,
    issues: issueService.issues,
    issueService,
    linkingResult,

    getComplaint: (id: string) => complaintById.get(id),
    getIssue: (id: string) => issueService.getIssue(id),
    getIssueForComplaint: (cId: string) => issueService.getIssueForComplaint(cId),
    getLinksForIssue: (issueId: string) => linkingResult.linksByIssueId.get(issueId) ?? [],
    getLinksForWorkOrder: (woId: string) => linkingResult.linksByWorkOrderId.get(woId) ?? [],
    getOutcomeForIssue: (issueId: string) => linkingResult.outcomesByIssueId.get(issueId),
    getAuditTrailForIssue: (issueId: string) => {
      const links = linkingResult.linksByIssueId.get(issueId) ?? [];
      const issue = issueService.getIssue(issueId);
      return links.map((l) => buildAuditTrailExplanation(l, workOrderMap.get(l.workOrderId), issue));
    },

    ingestComplaint: (raw: Complaint) => {
      const resolution = resolveLocation(
        {
          lat: raw.lat,
          lng: raw.lng,
          localityText: raw.locality,
          wardCode: raw.ward,
        },
        { roadsByWard },
      );
      const normalized = normaliseComplaint(raw, resolution);
      complaints.push(normalized);
      complaintById.set(normalized.id, normalized);

      // Check for auto-merge candidate against existing complaints
      const pairs = generateCandidatePairs([normalized, ...complaints]);
      const mergePair = pairs.find(
        (p) =>
          (p.complaintAId === normalized.id || p.complaintBId === normalized.id) &&
          p.policy === "auto_merge",
      );

      if (mergePair) {
        const partnerId =
          mergePair.complaintAId === normalized.id ? mergePair.complaintBId : mergePair.complaintAId;
        const existingIssue = issueService.getIssueForComplaint(partnerId);
        if (existingIssue) {
          existingIssue.complaintIds.push(normalized.id);
          existingIssue.complaintCount++;
          issueService.issueIdByComplaintId.set(normalized.id, existingIssue.id);
          return { normalized, matchedIssue: existingIssue, isNewIssue: false };
        }
      }

      // New canonical issue
      const newIssue: CanonicalIssue = {
        id: `ISSUE-${(normalized.resolution.ward ?? "GEN").replace("/", "_")}-${String(issueService.issues.length + 1).padStart(5, "0")}`,
        primaryRoadId: normalized.resolution.roadId,
        ward: normalized.resolution.ward ?? "UNKNOWN",
        category: normalized.inferredCategory ?? normalized.canonicalCategory,
        firstReportedAt: normalized.normalizedTimestamp,
        latestReportedAt: normalized.normalizedTimestamp,
        complaintCount: 1,
        sourceCount: 1,
        sources: [normalized.channel],
        complaintIds: [normalized.id],
        locationConfidence: normalized.resolution.confidence,
        centroid: normalized.gps,
        locality: normalized.resolution.locality ?? normalized.rawLocality,
        recurrence: { isRecurrent: false, cycleCount: 1, previousWorkOrderIds: [] },
        matchingVersion,
        status: "open",
      };

      issueService.issues.push(newIssue);
      issueService.issueById.set(newIssue.id, newIssue);
      issueService.issueIdByComplaintId.set(normalized.id, newIssue.id);

      return { normalized, matchedIssue: newIssue, isNewIssue: true };
    },
  };
}
