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

export interface PipelineStage {
  /** Display label (locale-specific; not a protocol enum). */
  readonly name: string;
  readonly status: "healthy";
}
