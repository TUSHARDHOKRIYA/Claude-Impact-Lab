import type { LatLng, Road, WorkOrder } from "../rupee/types";
import type { Accident, Complaint, Facility, FloodHotspot, Traffic } from "../rupee/load";

export type EvidenceRelationshipType =
  | "explicit_source_link"
  | "verified_record"
  | "inferred_candidate"
  | "human_reviewed"
  | "citizen_observation"
  | "model_generated";

export type EvidenceEdge = {
  id: string;
  sourceType: "road" | "complaint" | "work_order" | "contractor" | "facility";
  sourceId: string;
  targetType: "road" | "complaint" | "work_order" | "contractor" | "facility";
  targetId: string;
  relationship: EvidenceRelationshipType;
  confidence: number;
  explanation: string;
};

export type PassportWorkOrder = WorkOrder & {
  expectedCostInr: number;
  varianceInr: number;
  variancePct: number;
  flags: string[];
  evidenceType: EvidenceRelationshipType;
};

export type PassportComplaint = Complaint & {
  evidenceType: EvidenceRelationshipType;
  distanceToRoadM: number | null;
};

export type RecommendedActionKind =
  | "dlp_verification"
  | "field_quality_audit"
  | "repeated_failure_review"
  | "sla_delay_inquiry"
  | "flood_resilience_upgrade"
  | "citizen_verification"
  | "routine_monitoring";

export type PassportRecommendedAction = {
  kind: RecommendedActionKind;
  priority: "critical" | "high" | "medium" | "low";
  headline: string;
  explanation: string;
  targetEntityId: string;
  actionRequiredBy: string;
};

export type RoadPassportData = {
  road: Road;
  workOrders: PassportWorkOrder[];
  complaints: PassportComplaint[];
  accidents: Accident[];
  facilities: Facility[];
  floodHotspots: FloodHotspot[];
  traffic: Traffic | null;
  summary: {
    totalBilledInr: number;
    expectedCostInr: number;
    varianceInr: number;
    totalOrders: number;
    reopenedOrders: number;
    reopenRate: number;
    slaMetOrders: number;
    slaRate: number;
    totalComplaints: number;
    openComplaints: number;
    auditFlagCount: number;
    accidentCount: number;
    nearbyFacilitiesCount: number;
    heldInr: number;
    failedInr: number;
    flaggedInr: number;
  };
  methodBreakdown: Array<{
    method: string;
    billedInr: number;
    orders: number;
    reopenRate: number;
  }>;
  contractorBreakdown: Array<{
    contractorId: string;
    contractorName: string;
    billedInr: number;
    orders: number;
    reopenRate: number;
  }>;
  recommendedActions: PassportRecommendedAction[];
  evidenceEdges: EvidenceEdge[];
  provenance: {
    datasetSource: string;
    algorithmVersion: string;
    generatedAt: string;
    isSynthetic: boolean;
    contractualDisclaimer: string;
  };
};

export type ActionQueueItem = {
  id: string;
  priority: "critical" | "high" | "medium";
  category:
    | "high_defect_recurrence"
    | "unlinked_complaint_backlog"
    | "sla_breach"
    | "reopened_repair"
    | "repeat_work_cluster"
    | "potential_dlp_conflict"
    | "cost_anomaly";
  headline: string;
  roadId: string;
  roadName: string;
  ward: string;
  relatedEntityId: string;
  amountAtRiskInr: number;
  status: "new" | "under_review" | "action_required" | "resolved";
  recommendedAction: string;
  reason: string;
  evidenceCount: number;
};

export type SpendVsNeedDimension = {
  name: string;
  weight: number;
  score: number; // 0 to 100
  rationale: string;
};

export type RoadPriorityRank = {
  rank: number;
  roadId: string;
  roadName: string;
  ward: string;
  compositeScore: number;
  dimensions: {
    infrastructureVulnerability: SpendVsNeedDimension;
    publicSafety: SpendVsNeedDimension;
    serviceDeficit: SpendVsNeedDimension;
    maintenanceBurden: SpendVsNeedDimension;
    resourceEquity: SpendVsNeedDimension;
  };
  recommendedIntervention: string;
  estCostInr: number;
  underDlp: boolean;
};

export type BudgetScenario = {
  id: string;
  title: string;
  description: string;
  budgetEnvelopeInr: number;
  allocatedInr: number;
  roadsFundedCount: number;
  fundedRoads: Array<{
    roadId: string;
    roadName: string;
    ward: string;
    costInr: number;
    method: string;
    priorityRank: number;
    compositeScore: number;
  }>;
};
