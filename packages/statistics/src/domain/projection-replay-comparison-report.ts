import type { IntelligenceDomainId } from "./contribution-report.js";
import type { FeatureProfileId } from "./validation-report.js";
import type { PredictionCalibrationReport } from "./prediction-calibration-report.js";

export const PROJECTION_REPLAY_COMPARISON_REPORT_MODEL_VERSION =
  "projectionReplayComparison.v1.p2e5";

export interface ProjectionReplayMetricSummary {
  readonly value: number | undefined;
  readonly sampleSize: number;
  readonly qualified: boolean;
}

export interface ProjectionReplayAccuracyBlock {
  readonly sampleSize: number;
  readonly scoredSampleSize: number;
  readonly v2ReplaySampleSize: number;
  readonly winnerAccuracy: ProjectionReplayMetricSummary;
  readonly drawAccuracy: ProjectionReplayMetricSummary;
  readonly scoreAccuracy: ProjectionReplayMetricSummary;
  readonly goalRangeAccuracy: ProjectionReplayMetricSummary;
  readonly bttsAccuracy: ProjectionReplayMetricSummary;
  readonly overUnderAccuracy: ProjectionReplayMetricSummary;
  readonly confidenceCorrelation: ProjectionReplayMetricSummary;
  readonly calibration: PredictionCalibrationReport;
}

export interface ProjectionReplayAccuracyDelta {
  readonly winnerAccuracyDelta: number | undefined;
  readonly drawAccuracyDelta: number | undefined;
  readonly scoreAccuracyDelta: number | undefined;
  readonly goalRangeAccuracyDelta: number | undefined;
  readonly bttsAccuracyDelta: number | undefined;
  readonly overUnderAccuracyDelta: number | undefined;
  readonly confidenceCorrelationDelta: number | undefined;
}

export interface ProjectionReplayComparisonSegment {
  readonly segmentKey: string;
  readonly label: string;
  readonly v1: ProjectionReplayAccuracyBlock;
  readonly v2: ProjectionReplayAccuracyBlock;
  readonly deltas: ProjectionReplayAccuracyDelta;
}

export interface ProjectionReplayComparisonReport {
  readonly modelVersion: typeof PROJECTION_REPLAY_COMPARISON_REPORT_MODEL_VERSION;
  readonly computedAt: string;
  readonly populationSampleSize: number;
  readonly v2ReplayCoverage: ProjectionReplayMetricSummary;
  readonly overall: ProjectionReplayComparisonSegment;
  readonly byCompetition: readonly ProjectionReplayComparisonSegment[];
  readonly bySeason: readonly ProjectionReplayComparisonSegment[];
  readonly byFeatureProfile: readonly ProjectionReplayComparisonSegment[];
  readonly byIntelligenceDomain: readonly ProjectionReplayComparisonSegment[];
  readonly limitations: readonly string[];
  readonly checksum: string;
}

export class ProjectionReplayComparisonReportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectionReplayComparisonReportValidationError";
  }
}

export const MINIMUM_QUALIFIED_REPLAY_SEGMENT_SAMPLE_SIZE = 5;

export type ProjectionReplayGroupId =
  | "competition"
  | "season"
  | "featureProfile"
  | "intelligenceDomain";

export type ProjectionReplaySegmentKey =
  | FeatureProfileId
  | IntelligenceDomainId
  | string;
