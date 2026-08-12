export type ProjectCategory =
  | "safety"
  | "bridge"
  | "pavement"
  | "bike-ped"
  | "transit"
  | "freight"
  | "resilience"
  | "ev-charging"
  | "planning"
  | "signals"
  | "complete-streets";

export type ReadinessStage =
  | "planning"
  | "preliminary-design"
  | "final-design"
  | "row"
  | "construction-ready";

export type Project = {
  id: string;
  unifierId: string;
  name: string;
  description: string;
  county: "New Castle" | "Kent" | "Sussex";
  corridor: string;
  category: ProjectCategory;
  estimatedCost: number;
  unfundedAmount: number;
  status: "unfunded" | "partially-funded";
  readiness: ReadinessStage;
  designPercent: number;
  modes: string[];
  yearNeeded: number;
  crashHistory: {
    fatalities5yr: number;
    seriousInjuries5yr: number;
    highCrashLocation: boolean;
  };
  equity: {
    disadvantagedCommunity: boolean;
    rural: boolean;
    environmentalJustice: boolean;
  };
  tags: string[];
};

export type NofoCriteria = {
  programName: string;
  programCode: string;
  agency: string;
  fiscalYear: string;
  summary: string;
  eligibility: string[];
  evaluationCriteria: string[];
  programPriorities: string[];
  fundingObjectives: string[];
  eligibleProjectTypes: string[];
  keywords: string[];
  awardRange?: { min?: number; max?: number };
  source: "extracted" | "catalog" | "hybrid";
};

export type ScoreBreakdown = {
  eligibility: number;
  evaluation: number;
  priorities: number;
  fundingObjectives: number;
  historic: number;
};

export type MatchResult = {
  projectId: string;
  projectName: string;
  rank: number;
  score: number;
  breakdown: ScoreBreakdown;
  whyItQualifies: string;
  strengths: string[];
  gaps: string[];
  recommended: boolean;
};

export type FeedbackType = "reject" | "add" | "correct" | "comment";

export type Feedback = {
  id: string;
  projectId?: string;
  projectName?: string;
  type: FeedbackType;
  reason: string;
  createdAt: string;
};

export type AnalysisStatus =
  | "not_started"
  | "extracting"
  | "matching"
  | "ready"
  | "in_review"
  | "finalized";

export type Analysis = {
  id: string;
  createdAt: string;
  updatedAt: string;
  nofoName: string;
  nofoFileName: string;
  projectFileName: string;
  projectCount: number;
  status: AnalysisStatus;
  criteria: NofoCriteria;
  matches: MatchResult[];
  insight: string;
  strongMatchCount: number;
  feedback: Feedback[];
  finalSelections: string[];
  omittedAdditions: string[];
};

export type HistoricAward = {
  programCode: string;
  projectName: string;
  category: ProjectCategory;
  tags: string[];
  year: number;
  outcome: "awarded" | "not-awarded";
  notes: string;
};
