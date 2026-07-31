import type {
  ProjectionReplayComparisonReport,
  ProjectionReplayMetricSummary,
} from "./projection-replay-comparison-report.js";
import type {
  ProjectionReplayAccuracyBlock,
  ProjectionReplayAccuracyDelta,
} from "./projection-replay-comparison-report.js";

export const PROJECTION_REPLAY_REPORT_MODEL_VERSION =
  "projectionReplayReport.v1.p2h";

export interface ReplaySummary {
  readonly populationSampleSize: number;
  readonly v1ScoredSampleSize: number;
  readonly v2ScoredSampleSize: number;
  readonly v2ReplayCoverage: ProjectionReplayMetricSummary;
  readonly replayedAt: string;
}

export interface ProjectionVersionComparison {
  readonly v1: ProjectionReplayAccuracyBlock;
  readonly v2: ProjectionReplayAccuracyBlock;
  readonly improvement: ProjectionReplayAccuracyDelta;
}

export interface ScriptContribution {
  readonly scriptId: string;
  readonly label: string;
  readonly activationCount: number;
  readonly activationFrequency: number;
  readonly averageWeight: number;
  readonly averageConfidence: number;
  readonly winnerAccuracy: ProjectionReplayMetricSummary;
  readonly goalRangeAccuracy: ProjectionReplayMetricSummary;
  readonly scoreAccuracy: ProjectionReplayMetricSummary;
}

export interface FootballStateContribution {
  readonly dimensionId: string;
  readonly dimensionLabel: string;
  readonly level: string;
  readonly sampleSize: number;
  readonly winnerAccuracy: ProjectionReplayMetricSummary;
  readonly goalRangeAccuracy: ProjectionReplayMetricSummary;
  readonly scoreAccuracy: ProjectionReplayMetricSummary;
}

export interface ProjectionReplayReport {
  readonly modelVersion: typeof PROJECTION_REPLAY_REPORT_MODEL_VERSION;
  readonly computedAt: string;
  readonly summary: ReplaySummary;
  readonly versionComparison: ProjectionVersionComparison;
  readonly comparisonReport: ProjectionReplayComparisonReport;
  readonly scriptContributions: readonly ScriptContribution[];
  readonly footballStateContributions: readonly FootballStateContribution[];
  readonly limitations: readonly string[];
  readonly checksum: string;
}

export class ProjectionReplayReportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectionReplayReportValidationError";
  }
}
