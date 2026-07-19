export interface AnalysisHistoryEntry {
  readonly matchId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoffTime: string;
  readonly competition: string;
  readonly analyzedAt: string;
  readonly reportId: string;
  readonly evidenceCount: number;
  readonly featureCount: number;
  readonly ruleCount: number;
  /** Presentation-only library flag stored with local history. */
  readonly favorite?: boolean;
}

export interface DashboardMetrics {
  readonly importedMatches: number;
  readonly evidence: number;
  readonly features: number;
  readonly rules: number;
  readonly reports: number;
}

export type PipelineStageName =
  | "Provider"
  | "Normalizer"
  | "Evidence"
  | "Feature"
  | "Rule"
  | "Analysis"
  | "Report";

export interface PipelineStage {
  readonly name: PipelineStageName;
  readonly status: "healthy";
}
