/**
 * Domain Contracts for Rasta Hisaab Civic Intelligence Pipeline.
 *
 * Defines contracts for complaint normalization, canonical issue clustering,
 * work order linkage, timeline provenance, and matching candidate scoring.
 * Strict nullability is enforced throughout.
 */

import type { LatLng } from "../types";

export type IssueCategory =
  | "pothole"
  | "waterlogging"
  | "broken_surface"
  | "open_manhole"
  | "debris_uncollected"
  | "drainage_overflow"
  | "uneven_paver"
  | "other";

export type IssueUrgency = "low" | "medium" | "high" | "emergency";

export type LifecycleStatus = "open" | "in_progress" | "resolved" | "reopened" | "disputed";

export type ComplaintSource = "citizen" | "portal" | "social" | "synthetic" | "voice";

export type NormalizedComplaint = {
  id: string;
  source: ComplaintSource;
  reportedAt: string; // ISO 8601 string
  rawCategory: string;
  category: IssueCategory;
  rawDescription: string;
  normalizedText: string;
  language: string;
  urgency: IssueUrgency;
  upvotes: number;
  status: LifecycleStatus;
  resolvedAt: string | null;
  location: {
    lat: number;
    lng: number;
    ward: string | null;
    localityText: string | null;
    roadId: string | null;
    confidence: number;
  } | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type CanonicalCivicIssue = {
  id: string;
  title: string;
  summary: string;
  category: IssueCategory;
  ward: string;
  roadId: string | null;
  location: LatLng;
  status: LifecycleStatus;
  firstReportedAt: string;
  lastReportedAt: string;
  complaintCount: number;
  primaryComplaintId: string;
  severityScore: number; // 0 to 100
  resolution: {
    resolvedAt: string;
    workOrderId: string | null;
    verifiedByCitizen: boolean;
    verificationNotes: string | null;
  } | null;
};

export type MatchConfidenceTier = "exact" | "high" | "medium" | "low" | "unlikely";

export type ComplaintIssueLink = {
  id: string;
  complaintId: string;
  issueId: string;
  confidence: number; // 0.0 to 1.0
  tier: MatchConfidenceTier;
  matchRule: string;
  linkedAt: string;
  isPrimary: boolean;
  distanceMeters: number | null;
};

export type WorkOrderRelationKind =
  | "targeted_fix"
  | "segment_resurfacing"
  | "monsoon_patch"
  | "post_facto_reconciliation"
  | "unverified_association";

export type IssueWorkOrderLink = {
  id: string;
  issueId: string;
  workOrderId: string;
  relation: WorkOrderRelationKind;
  confidence: number; // 0.0 to 1.0
  timingAlignment: "before_work" | "during_work" | "after_work" | "reopened_post_work";
  linkedAt: string;
  verified: boolean;
  notes: string | null;
};

export type MatchCandidate = {
  sourceComplaintId: string;
  targetIssueId: string;
  distanceMeters: number | null;
  timeDeltaHours: number;
  textSimilarity: number; // 0.0 to 1.0
  categoryMatch: boolean;
  overallScore: number; // 0.0 to 1.0
  confidenceTier: MatchConfidenceTier;
  rank: number;
  features: {
    spatialWeight: number;
    temporalWeight: number;
    semanticWeight: number;
  };
};

export type EvidenceKind =
  | "photo"
  | "voice_note"
  | "social_post"
  | "contractor_log"
  | "sensor_depth"
  | "satellite_survey"
  | "citizen_report";

export type EvidenceReference = {
  id: string;
  issueId: string;
  complaintId: string | null;
  kind: EvidenceKind;
  sourceUrl: string | null;
  storagePath: string | null;
  capturedAt: string;
  submittedAt: string;
  caption: string | null;
  provenanceHash: string | null;
  verified: boolean;
};

export type TimelineEventType =
  | "complaint_filed"
  | "issue_clustered"
  | "work_order_assigned"
  | "work_started"
  | "work_completed"
  | "issue_reopened"
  | "audit_flagged"
  | "contractor_disputed"
  | "verified_by_citizen";

export type IssueTimelineEvent = {
  id: string;
  issueId: string;
  timestamp: string;
  eventType: TimelineEventType;
  title: string;
  description: string;
  actor: {
    kind: "citizen" | "bmc_engineer" | "contractor" | "auditor" | "system";
    name: string | null;
  };
  entityReference: {
    entityType: "complaint" | "work_order" | "audit_flag" | "evidence";
    entityId: string;
  } | null;
};
