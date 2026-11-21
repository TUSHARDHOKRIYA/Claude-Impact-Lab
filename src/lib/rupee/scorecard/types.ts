/**
 * Shapes for the formula-based contractor scorecard. Every part of the score
 * is a ratio of actual to expected, turned into 0 to 100 by 100 / (1 + ratio),
 * so 50 always means "exactly as expected".
 */

export type StressLevel = "Low" | "Medium" | "High";

export type ScoreBand = "Strong" | "As expected" | "Needs attention" | "Limited data";

/** One work order with the context the formula needs. */
export type ScoredOrder = {
  id: string;
  ward: string;
  roadId: string;
  roadName: string;
  workType: string;
  method: string;
  contractorId: string;
  completedAt: string;
  areaSqm: number;
  costInr: number;
  expectedCostInr: number;
  /** Billed cost divided by rate-card cost. */
  costRatio: number;
  slaHours: number;
  slaMet: boolean;
  reopened: boolean;
  stress: StressLevel;
  rain30dMm: number;
  underDlp: boolean;
  complaints: number;
  /** Same road, same kind of problem, fixed again this soon after the earlier job. */
  repeatOf: { workOrderId: string; days: number; contractorId: string } | null;
  overBilled: boolean;
};

export type ScorePart = {
  /** 0 to 100. 50 is exactly as expected. */
  score: number;
  /** Actual divided by expected. 1 is as expected, lower is better. */
  ratio: number;
};

export type DurabilityPart = ScorePart & { actualRate: number; expectedRate: number; failures: number };
export type SpeedPart = ScorePart & { actualRate: number; expectedRate: number; misses: number };
export type CostPart = ScorePart & {
  avgCostRatio: number;
  costRatioScore: number;
  outlierShare: number;
  cityOutlierShare: number;
  outlierScore: number;
  outlierJobs: number;
};

export type RepeatExample = {
  roadId: string;
  roadName: string;
  ward: string;
  workOrderId: string;
  earlierWorkOrderId: string;
  days: number;
  workType: string;
  costInr: number;
  sameContractor: boolean;
};

export type RepeatRoad = {
  roadId: string;
  roadName: string;
  ward: string;
  jobs: number;
  reopened: number;
  costInr: number;
};

export type Repeats = {
  reopened: number;
  reopenedInr: number;
  repeatJobs: number;
  repeatInr: number;
  byThisContractor: number;
  roadsFixedTwice: number;
  roadsFixedThreePlus: number;
  topRoads: RepeatRoad[];
  examples: RepeatExample[];
};

export type WardSlice = {
  ward: string;
  wardName: string;
  jobs: number;
  billedInr: number;
  /** Billed amount as a share of that ward's monsoon budget. */
  budgetShare: number;
  reopenRate: number;
  expectedReopenRate: number;
  slaMissRate: number;
  expectedSlaMissRate: number;
  avgCostRatio: number;
};

export type MethodSlice = {
  method: string;
  jobs: number;
  reopenRate: number;
  expectedReopenRate: number;
  slaMissRate: number;
  expectedSlaMissRate: number;
};

/** Context only. Never part of the score, so nobody is rewarded or punished for workload. */
export type Volume = {
  jobs: number;
  billedInr: number;
  expectedBilledInr: number;
  wards: number;
  roads: number;
  highStressShare: number;
  mediumStressShare: number;
  lowStressShare: number;
  complaintsLinked: number;
  jobsWithoutComplaint: number;
  paidUnderDlpJobs: number;
  paidUnderDlpInr: number;
  firstJob: string;
  lastJob: string;
};

export type ContractorScorecard = {
  id: string;
  name: string;
  empanelledSince: number;
  rank: number;
  band: ScoreBand;
  /** Small-sample-protected overall score. This is the one shown. */
  overall: number;
  rawOverall: number;
  durability: DurabilityPart;
  cost: CostPart;
  speed: SpeedPart;
  volume: Volume;
  repeats: Repeats;
  byWard: WardSlice[];
  byMethod: MethodSlice[];
  orders: ScoredOrder[];
};

export type ScorecardSet = {
  cards: ContractorScorecard[];
  city: { jobs: number; reopenRate: number; slaMissRate: number; outlierShare: number };
};
