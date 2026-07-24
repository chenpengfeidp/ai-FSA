import type { PredictionCalibrationReport } from "./prediction-calibration-report.js";

/**
 * V1A Football Intelligence Validation — measurement-only comparison report.
 * Computed exclusively from Evaluation History (A1.5), reusing Evaluation
 * metrics (A1) and the Prediction Calibration report (A2). Never re-runs
 * Provider/Feature/Rule/Projection/Confidence/Evaluation/Calibration and
 * never estimates missing history. Profiles are observational partitions
 * of already-sealed predictions grouped by which Feature families were
 * actually present at seal time — not counterfactual re-predictions.
 */
export const VALIDATION_REPORT_MODEL_VERSION = "validation-report.mvp.v1a";

/** A profile row below this many scored History rows is directional-only. */
export const MINIMUM_QUALIFIED_PROFILE_SAMPLE_SIZE = 20;

/** A profile sub-metric (e.g. Draw Accuracy) below this many observations is flagged insufficient. */
export const MINIMUM_QUALIFIED_SEGMENT_SAMPLE_SIZE = 5;

/**
 * Cumulative Feature-configuration profiles, ordered from thinnest to
 * richest observed Feature coverage. A record is classified into the
 * single highest profile whose required Feature families are all present
 * in that record's sealed `featureNames` — never a re-run under a
 * different configuration.
 */
export type FeatureProfileId =
  | "baseline"
  | "club_intelligence"
  | "club_player"
  | "club_player_xg"
  | "full_football_intelligence";

export const FEATURE_PROFILE_IDS: readonly FeatureProfileId[] = Object.freeze([
  "baseline",
  "club_intelligence",
  "club_player",
  "club_player_xg",
  "full_football_intelligence",
]);

export const FEATURE_PROFILE_LABELS: Readonly<Record<FeatureProfileId, string>> =
  Object.freeze({
    baseline: "Baseline",
    club_intelligence: "Club Intelligence",
    club_player: "Club + Player",
    club_player_xg: "Club + Player + xG",
    full_football_intelligence: "Full Football Intelligence",
  });

/** A metric summary reused across all comparison rows; honest-absence when sampleSize is 0. */
export interface ValidationMetricSummary {
  readonly value: number | undefined;
  readonly sampleSize: number;
  readonly qualified: boolean;
}

/**
 * One Feature-configuration profile's comparison row. Every accuracy /
 * coverage / paper-ROI metric is reused directly from already-computed
 * Evaluation Metrics (A1); `calibration` reuses the full A2 Prediction
 * Calibration report scoped to this profile's partition of History.
 */
export interface ValidationProfileRow {
  readonly profile: FeatureProfileId;
  readonly label: string;
  readonly sampleSize: number;
  readonly qualified: boolean;
  readonly winnerAccuracy: ValidationMetricSummary;
  readonly drawAccuracy: ValidationMetricSummary;
  readonly scoreAccuracy: ValidationMetricSummary;
  readonly goalRangeAccuracy: ValidationMetricSummary;
  /** Mean Feature coverage ratio (present/expected core Features), reused from Evaluation Metrics. */
  readonly coverage: ValidationMetricSummary;
  /** Mean flat +1/−1 paper unit return. Research framing only — never wagering advice. */
  readonly paperReturn: ValidationMetricSummary;
  readonly calibration: PredictionCalibrationReport;
}

export interface ValidationProvenance {
  readonly sourceRecordCount: number;
  readonly evaluationHistorySchemaVersions: readonly string[];
  readonly evaluationModelVersions: readonly string[];
  readonly projectionModelVersions: readonly string[];
  readonly earliestMatchDate: string | undefined;
  readonly latestMatchDate: string | undefined;
}

/**
 * Deterministic, read-only comparison of prediction quality across
 * Feature-configuration profiles. Display-only: never adjusts Prediction,
 * Feature, Rule, Projection, Confidence, or Evaluation, and never claims
 * an improvement — callers must read `qualified` / sample sizes themselves.
 */
export interface ValidationReport {
  readonly schemaVersion: typeof VALIDATION_REPORT_MODEL_VERSION;
  readonly computedAt: string;
  readonly totalSampleSize: number;
  readonly minimumQualifiedSampleSize: number;
  readonly provenance: ValidationProvenance;
  readonly profiles: readonly ValidationProfileRow[];
  readonly limitations: readonly string[];
}

export class ValidationReportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationReportValidationError";
  }
}
