/**
 * Domain types for Complaint Intelligence & Work-Order Linking Engine.
 *
 * Keeps individual complaints, canonical civic issues, road segments,
 * and work orders strictly separated with explicit provenance.
 */

export type CanonicalCategory =
  | "pothole"
  | "waterlogging"
  | "broken_paver_blocks"
  | "open_manhole"
  | "choked_drain"
  | "road_cave_in"
  | "road_surface_other"
  | "other";

export type NormalizedChannel = "app" | "helpline" | "walkin" | "portal" | "social" | "other";

export type ResolutionMethod =
  | "gps_road_snap"
  | "gps_ward_only"
  | "exact_locality"
  | "fuzzy_locality"
  | "ward_fallback"
  | "unresolved";

export type LocationResolution = {
  roadId: string | null;
  roadName: string | null;
  ward: string | null;
  locality: string | null;
  distanceToRoadM: number | null;
  method: ResolutionMethod;
  confidence: number; // 0.0 to 1.0
  warnings: string[];
};

export type NormalizedComplaintRecord = {
  id: string;
  receivedAt: string;
  normalizedTimestamp: string; // ISO 8601
  channel: NormalizedChannel;
  channelRaw: string;
  rawCategory: string;
  canonicalCategory: CanonicalCategory;
  inferredCategory: CanonicalCategory | null;
  rawDescription: string; // UNTOUCHED
  cleanText: string;
  tokens: string[];
  language: string;
  rawLocality: string;
  gps: { lat: number; lng: number; accuracyM: number | null } | null;
  status: string;
  upvotes: number;
  resolution: LocationResolution;
};

export type MatchConfidenceTier = "high" | "medium" | "low";
export type MatchPolicyDecision = "auto_merge" | "manual_review" | "separate_issue";

export type MatchCandidatePair = {
  complaintAId: string;
  complaintBId: string;
  score: number; // 0.0 to 1.0
  features: {
    sameRoad: boolean;
    distanceM: number | null;
    categoryMatch: boolean;
    timeDeltaHours: number;
    semanticSimilarity: number;
    localityMatch: boolean;
  };
  confidenceTier: MatchConfidenceTier;
  policy: MatchPolicyDecision;
  explanation: string;
};

export type CanonicalIssueStatus =
  | "open"
  | "in_progress"
  | "work_order_assigned"
  | "resolved"
  | "reopened"
  | "disputed";

export type CanonicalIssue = {
  id: string;
  primaryRoadId: string | null;
  ward: string;
  category: CanonicalCategory;
  firstReportedAt: string;
  latestReportedAt: string;
  complaintCount: number;
  sourceCount: number;
  sources: NormalizedChannel[];
  complaintIds: string[];
  locationConfidence: number;
  centroid: { lat: number; lng: number } | null;
  locality: string | null;
  recurrence: {
    isRecurrent: boolean;
    cycleCount: number;
    previousWorkOrderIds: string[];
  };
  matchingVersion: string;
  status: CanonicalIssueStatus;
};

export type WorkOrderLinkType =
  | "explicit_complaint_link"
  | "geo_temporal_candidate"
  | "semantic_candidate"
  | "manual_review";

export type LinkDecisionStatus = "accepted" | "candidate" | "rejected" | "pending_review";

export type WorkOrderLinkRecord = {
  id: string;
  workOrderId: string;
  complaintId: string | null;
  issueId: string;
  linkType: WorkOrderLinkType;
  confidence: number | "exact";
  evidenceRecordIds: string[];
  matchingVersion: string;
  decisionStatus: LinkDecisionStatus;
  reviewerDecision: "confirmed" | "rejected" | null;
  explanation: string;
};

export type IssueOutcomeStatus =
  | "unlinked"
  | "work_order_found"
  | "work_in_progress"
  | "work_order_completed"
  | "reopened_within_30d"
  | "reported_again_after_repair"
  | "unknown";

export type IssueOutcome = {
  issueId: string;
  outcomeStatus: IssueOutcomeStatus;
  primaryWorkOrderId: string | null;
  workOrderIds: string[];
  slaMet: boolean | null;
  reopenedWithin30d: boolean;
  repeatComplaintsAfterCompletion: number;
  explanation: string;
};
