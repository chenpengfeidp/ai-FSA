import type { ProjectionReplayMetricSummary } from "./projection-replay-comparison-report.js";

export const PROJECTION_DIAGNOSTICS_REPORT_MODEL_VERSION =
  "projectionDiagnosticsReport.v1.p2i";

export const MINIMUM_QUALIFIED_DIAGNOSTICS_SAMPLE_SIZE = 5;

export type FailureCategory =
  | "winner_miss"
  | "draw_miss"
  | "score_miss"
  | "goal_range_miss"
  | "btts_miss"
  | "over_under_miss";

export interface FailureCategoryCount {
  readonly category: FailureCategory;
  readonly label: string;
  readonly count: number;
  readonly rate: ProjectionReplayMetricSummary;
}

export interface FailureDistribution {
  readonly sampleSize: number;
  readonly categories: readonly FailureCategoryCount[];
  readonly topFailureReasons: readonly FailureCategoryCount[];
}

export interface ScriptDiagnosticsRow {
  readonly scriptId: string;
  readonly label: string;
  readonly activationCount: number;
  readonly accuracy: ProjectionReplayMetricSummary;
  readonly averageConfidence: number;
  readonly averageScoreError: number;
  readonly averageGoalError: number;
}

export interface ScriptDiagnostics {
  readonly rows: readonly ScriptDiagnosticsRow[];
  readonly worstScripts: readonly ScriptDiagnosticsRow[];
  readonly bestScripts: readonly ScriptDiagnosticsRow[];
}

export interface FootballStateDiagnosticsRow {
  readonly dimensionId: string;
  readonly dimensionLabel: string;
  readonly level: string;
  readonly sampleSize: number;
  readonly accuracy: ProjectionReplayMetricSummary;
  readonly falsePositive: number;
  readonly falseNegative: number;
}

export interface FootballStateDiagnostics {
  readonly rows: readonly FootballStateDiagnosticsRow[];
}

export interface RuleActivationRow {
  readonly ruleName: string;
  readonly activationCount: number;
  readonly activationRate: number;
}

export interface RuleIncorrectCorrelationRow {
  readonly ruleName: string;
  readonly incorrectCount: number;
  readonly incorrectRate: number;
  readonly activationCount: number;
}

export interface RuleConflictPairRow {
  readonly homeRule: string;
  readonly awayRule: string;
  readonly coActivationCount: number;
  readonly incorrectCount: number;
  readonly incorrectRate: number;
}

export interface RuleSaturationSummary {
  readonly averagePassRules: number;
  readonly averageApplicableRules: number;
  readonly maxPassRules: number;
  readonly saturatedMatchCount: number;
  readonly saturationThreshold: number;
}

export interface RuleDiagnostics {
  readonly mostFrequentlyActivated: readonly RuleActivationRow[];
  readonly correlatedWithIncorrect: readonly RuleIncorrectCorrelationRow[];
  readonly conflictPairs: readonly RuleConflictPairRow[];
  readonly saturation: RuleSaturationSummary;
}

export interface ConfidenceBucketRow {
  readonly band: "high" | "low" | "medium" | "very_high";
  readonly sampleSize: number;
  readonly accuracy: ProjectionReplayMetricSummary;
  readonly incorrectCount: number;
}

export interface ConfidenceDiagnostics {
  readonly highConfidenceWrong: number;
  readonly lowConfidenceCorrect: number;
  readonly highConfidenceWrongRate: ProjectionReplayMetricSummary;
  readonly lowConfidenceCorrectRate: ProjectionReplayMetricSummary;
  readonly calibrationBuckets: readonly ConfidenceBucketRow[];
}

export interface ProjectionDiagnosticsReport {
  readonly modelVersion: typeof PROJECTION_DIAGNOSTICS_REPORT_MODEL_VERSION;
  readonly computedAt: string;
  readonly sampleSize: number;
  readonly failureDistribution: FailureDistribution;
  readonly scriptDiagnostics: ScriptDiagnostics;
  readonly footballStateDiagnostics: FootballStateDiagnostics;
  readonly ruleDiagnostics: RuleDiagnostics;
  readonly confidenceDiagnostics: ConfidenceDiagnostics;
  readonly limitations: readonly string[];
  readonly checksum: string;
}

export class ProjectionDiagnosticsReportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectionDiagnosticsReportValidationError";
  }
}
