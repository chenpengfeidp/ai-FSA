/**
 * P2K-G Population Evaluation — descriptive A vs C measurement on a sealed cohort.
 * Evidence only; never promotes Candidate C or changes production Match Script pins.
 */

export const SEALED_COHORT_POPULATION_EVALUATION_SCHEMA_VERSION =
  "sealed-cohort-population-evaluation.p2k.g" as const;

export type PopulationMetricAvailability = "available" | "not_available";

export interface PopulationMetricValue {
  readonly availability: PopulationMetricAvailability;
  readonly value: number | undefined;
  readonly hitCount: number | undefined;
  readonly sampleSize: number;
  readonly unavailableReason: string | undefined;
}

export interface PopulationMetricComparisonRow {
  readonly metricId: string;
  readonly metricLabel: string;
  readonly baseline: PopulationMetricValue;
  readonly candidate: PopulationMetricValue;
  /** Candidate − Baseline when both available; otherwise undefined. */
  readonly delta: number | undefined;
}

export interface PopulationEvaluationCoverage {
  readonly totalSealedMembers: number;
  /** Sealed cohort members are already P2K-C replay-eligible by construction. */
  readonly eligibleReplayMembers: number;
  readonly successfulBaselineReplayCount: number;
  readonly successfulCandidateReplayCount: number;
  readonly pairedSuccessfulCount: number;
  readonly failedBaselineCount: number;
  readonly failedCandidateCount: number;
  /**
   * Paired successes excluded from final metrics (e.g. evaluation metrics undefined).
   * Never used to silently shrink A vs C to different populations.
   */
  readonly excludedCount: number;
  readonly finalEvaluationSampleSize: number;
}

export interface PopulationWinnerBreakdown {
  readonly actualHome: PopulationMetricComparisonRow;
  readonly actualDraw: PopulationMetricComparisonRow;
  readonly actualAway: PopulationMetricComparisonRow;
}

/**
 * Deterministic population evaluation artifact for one SEALED cohort and one A/C run pair.
 */
export interface SealedCohortPopulationEvaluation {
  readonly evaluationRunId: string;
  readonly schemaVersion: typeof SEALED_COHORT_POPULATION_EVALUATION_SCHEMA_VERSION;
  readonly cohortId: string;
  readonly membershipDigestSha256: string;
  readonly baselineReplayRunId: string;
  readonly candidateReplayRunId: string;
  readonly baselineCalibrationLabel: "r1b.candidate.a.baseline";
  readonly candidateCalibrationLabel: "r1b.candidate.c.sideAwareOpen";
  readonly coverage: PopulationEvaluationCoverage;
  readonly comparisons: readonly PopulationMetricComparisonRow[];
  readonly winnerBreakdown: PopulationWinnerBreakdown;
  readonly candidateCProductionPromoted: false;
  readonly productionMatchScriptUnchanged: true;
  readonly statisticalSignificanceSupported: false;
  readonly createdAt: string;
  readonly checksum: string;
  readonly limitations: readonly string[];
}

export type SealedCohortPopulationEvaluationErrorCode =
  | "COHORT_NOT_FOUND"
  | "COHORT_NOT_SEALED"
  | "MEMBERSHIP_DIGEST_MISMATCH"
  | "BASELINE_RUN_NOT_FOUND"
  | "CANDIDATE_RUN_NOT_FOUND"
  | "UNSUPPORTED_REPLAY_RUN_SCHEMA"
  | "CALIBRATION_LABEL_MISMATCH"
  | "COHORT_ID_MISMATCH"
  | "RUN_MEMBERSHIP_DIGEST_MISMATCH"
  | "MEMBERSHIP_SET_MISMATCH"
  | "SAME_CONTEXT_VIOLATION"
  | "MISSING_HISTORY_OUTCOME"
  | "EMPTY_EVALUATION_RUN_ID"
  | "INVALID_COMPUTED_AT";

export class SealedCohortPopulationEvaluationError extends Error {
  readonly code: SealedCohortPopulationEvaluationErrorCode;

  constructor(code: SealedCohortPopulationEvaluationErrorCode, message: string) {
    super(message);
    this.name = "SealedCohortPopulationEvaluationError";
    this.code = code;
  }
}
