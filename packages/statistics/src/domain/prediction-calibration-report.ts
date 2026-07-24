import type { GoalRangeBucket } from "./prediction-evaluation.js";

/**
 * A2 Prediction Calibration — measurement-only report.
 * Computed exclusively from Evaluation History (A1.5). Never estimates
 * missing history, never mutates sealed Prediction/Feature/Rule/Projection,
 * and never auto-adjusts future predictions.
 */
export const PREDICTION_CALIBRATION_REPORT_MODEL_VERSION =
  "calibration-report.mvp.a2";

/** Overall report is directional-only below this many scored History rows. */
export const MINIMUM_QUALIFIED_REPORT_SAMPLE_SIZE = 20;

/** A bucket/bin below this many observations is flagged insufficient. */
export const MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE = 5;

/** Mirrors the sealed confidence band literal already carried on Evaluation History rows. */
export type ConfidenceBandLabel = "high" | "low" | "medium" | "very_high";

export const CONFIDENCE_BANDS: readonly ConfidenceBandLabel[] = Object.freeze([
  "low",
  "medium",
  "high",
  "very_high",
]);

export type MatchOutcomeLabel = "away" | "draw" | "home";

export const MATCH_OUTCOME_LABELS: readonly MatchOutcomeLabel[] = Object.freeze([
  "home",
  "draw",
  "away",
]);

export const GOAL_RANGE_BUCKETS: readonly GoalRangeBucket[] = Object.freeze([
  "range01",
  "range23",
  "range4Plus",
]);

/** Confidence Bucket Accuracy row: hit-rate observed for a sealed confidence band. */
export interface ConfidenceBucketAccuracyRow {
  readonly band: ConfidenceBandLabel;
  readonly sampleSize: number;
  readonly hits: number;
  readonly accuracy: number | undefined;
  readonly qualified: boolean;
}

/** Confidence Distribution row: population share for a sealed confidence band. */
export interface ConfidenceDistributionRow {
  readonly band: ConfidenceBandLabel;
  readonly sampleSize: number;
  readonly share: number;
}

/** Reliability Table / outcome-calibration row for one predicted-probability decile bucket. */
export interface ProbabilityBucketRow {
  readonly bucketLabel: string;
  readonly minProbability: number;
  readonly maxProbability: number;
  readonly sampleSize: number;
  readonly meanPredictedProbability: number | undefined;
  readonly observedFrequency: number | undefined;
  readonly qualified: boolean;
}

/** Win / Draw / Loss calibration row: a ProbabilityBucketRow scoped to one outcome class. */
export interface OutcomeCalibrationRow extends ProbabilityBucketRow {
  readonly outcome: MatchOutcomeLabel;
}

/** Goal-range calibration row: accuracy observed when a goal-range bucket was predicted. */
export interface GoalRangeCalibrationRow {
  readonly bucket: GoalRangeBucket;
  readonly sampleSize: number;
  readonly hits: number;
  readonly accuracy: number | undefined;
  readonly qualified: boolean;
}

export interface CalibrationErrorMetric {
  readonly value: number | undefined;
  readonly sampleSize: number;
  readonly qualified: boolean;
}

export interface PredictionCalibrationProvenance {
  readonly sourceRecordCount: number;
  readonly evaluationHistorySchemaVersions: readonly string[];
  readonly evaluationModelVersions: readonly string[];
  readonly projectionModelVersions: readonly string[];
  readonly earliestMatchDate: string | undefined;
  readonly latestMatchDate: string | undefined;
}

/**
 * Deterministic, read-only calibration measurement over Evaluation History.
 * Display-only: does not feed back into Feature/Rule/Projection/Confidence
 * and does not adjust any sealed or future Prediction.
 */
export interface PredictionCalibrationReport {
  readonly schemaVersion: typeof PREDICTION_CALIBRATION_REPORT_MODEL_VERSION;
  readonly computedAt: string;
  readonly sampleSize: number;
  readonly qualified: boolean;
  readonly minimumQualifiedSampleSize: number;
  readonly provenance: PredictionCalibrationProvenance;
  readonly confidenceBucketAccuracy: readonly ConfidenceBucketAccuracyRow[];
  readonly confidenceDistribution: readonly ConfidenceDistributionRow[];
  readonly reliabilityTable: readonly ProbabilityBucketRow[];
  readonly expectedCalibrationError: CalibrationErrorMetric;
  readonly brierScore: CalibrationErrorMetric;
  readonly outcomeCalibration: readonly OutcomeCalibrationRow[];
  readonly goalRangeCalibration: readonly GoalRangeCalibrationRow[];
  readonly limitations: readonly string[];
}

export class PredictionCalibrationReportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PredictionCalibrationReportValidationError";
  }
}
