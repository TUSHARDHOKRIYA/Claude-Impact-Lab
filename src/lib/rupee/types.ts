/**
 * Shapes for the Follow the Rupee analytics. Source data is the synthetic
 * Claude Impact Lab dataset in `data/rupee/` (see DATA_DICTIONARY.md there).
 * Money is whole rupees. Dates are IST strings as they appear in the CSVs.
 */

export type LatLng = { lat: number; lng: number };

export type Ward = {
  code: string;
  name: string;
  zone: string;
  office: string;
  centroid: LatLng;
  areaKm2: number;
  population: number;
  /** 0 to 1, how flood-prone the ward is. */
  lowLyingIndex: number;
  crews: number;
  budgetInr: number;
  localities: string[];
};

export type Road = {
  id: string;
  name: string;
  segmentNo: number;
  ward: string;
  roadType: string;
  surface: string;
  lanes: number;
  lengthM: number;
  start: LatLng;
  end: LatLng;
  lastResurfaced: string;
  underDlp: boolean;
  busRoute: boolean;
};

export type WorkOrder = {
  id: string;
  complaintIds: string[];
  ward: string;
  roadId: string;
  workType: string;
  method: string;
  contractorId: string;
  contractorName: string;
  assignedAt: string;
  startedAt: string;
  completedAt: string;
  areaSqm: number;
  costInr: number;
  slaHours: number;
  slaMet: boolean;
  reopened: boolean;
  remark: string;
};

export type Contractor = {
  id: string;
  name: string;
  empanelledSince: number;
  activeWards: string[];
};

export type AuditFlagKind =
  | "over_rate"
  | "double_billed"
  | "paid_under_dlp"
  | "phantom_completion";

export type AuditFlag = {
  kind: AuditFlagKind;
  workOrderId: string;
  ward: string;
  roadId: string;
  roadName: string;
  contractorId: string;
  contractorName: string;
  completedAt: string;
  costInr: number;
  /** The part of the bill that needs explaining. Never more than costInr. */
  amountAtRiskInr: number;
  /** One plain sentence a citizen can read. No accusations. */
  reason: string;
  /** Other work order ids that back the flag (the earlier bill, for example). */
  evidence: string[];
};

export type SpendSlice = {
  key: string;
  label: string;
  spentInr: number;
  orders: number;
  /** Share of orders re-opened within 30 days, 0 to 1. */
  reopenRate: number;
  /** Share of orders that met SLA, 0 to 1. */
  slaRate: number;
};

/** Where one ward's money went. Every rupee lands in exactly one outcome. */
export type WardLedger = {
  ward: Ward;
  budgetInr: number;
  spentInr: number;
  orders: number;
  outcome: {
    /** Not re-opened and not flagged. */
    heldInr: number;
    /** Re-opened within 30 days and not flagged. */
    failedInr: number;
    /** Carries at least one audit flag (counted once, whatever the count). */
    flaggedInr: number;
  };
  slaRate: number;
  reopenRate: number;
  byContractor: SpendSlice[];
  byMethod: SpendSlice[];
  byWorkType: SpendSlice[];
  flags: AuditFlag[];
  complaints: {
    total: number;
    /** Linked to at least one work order. */
    linked: number;
    /** Status Open or In Progress and not linked to any work order. */
    stillOpen: number;
  };
  /** Ward-level context used to read the numbers fairly. */
  context: {
    heavyRainDays: number;
    floodHotspots: number;
    roadsUnderDlp: number;
  };
};

export type ContractorScore = {
  contractor: Contractor;
  orders: number;
  spentInr: number;
  slaRate: number;
  reopenRate: number;
  /** Re-open rate we would expect from the wards and weeks they worked in. */
  expectedReopenRate: number;
  /** Median of cost / rate-card expected cost. 1 means on the rate card. */
  medianCostRatio: number;
  flags: Record<AuditFlagKind, number>;
  flaggedInr: number;
  wards: string[];
  /** One fair sentence of context, such as low-lying wards worked. */
  contextNote: string;
};

export type NextRupeeItem = {
  rank: number;
  roadId: string;
  roadName: string;
  ward: string;
  /** 0 to 100. Higher means fix sooner. */
  score: number;
  /** Plain reasons, strongest first, at most four. */
  reasons: string[];
  suggestedMethod: string;
  /** Re-open rate of the suggested method on similar work, 0 to 1. */
  methodReopenRate: number;
  estCostInr: number;
  openComplaints: number;
  accidents: number;
  floodHotspot: string | null;
  facilities: string[];
  /** If true, the DLP contractor should fix it at no cost to BMC. */
  underDlp: boolean;
};

export type CityOverview = {
  budgetInr: number;
  spentInr: number;
  orders: number;
  outcome: WardLedger["outcome"];
  wards: Array<{
    code: string;
    name: string;
    budgetInr: number;
    spentInr: number;
    outcome: WardLedger["outcome"];
    flagCount: number;
    reopenRate: number;
  }>;
};
