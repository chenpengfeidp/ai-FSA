import { MULTI_SCRIPT_MERGE_ALGORITHM } from "./multi-script/compute-multi-script-projection.js";

export const FOOTBALL_STATE_PARAMETER_POLICY_VERSION = "footballStateParams.v1";
export const CONFIDENCE_PARAMETER_POLICY_VERSION = "confidenceParams.v1";
export const RECOMMENDATION_PARAMETER_POLICY_VERSION = "recommendationParams.v1";
export const MATRIX_MERGE_PARAMETER_POLICY_VERSION = "matrixMergeParams.v1";

/**
 * Football State level thresholds (score ∈ [0,1]).
 * Preserves existing low < 0.34 / medium < 0.67 behaviour.
 */
export interface FootballStateParameterSet {
  readonly policyVersion: typeof FOOTBALL_STATE_PARAMETER_POLICY_VERSION;
  readonly lowThreshold: number;
  readonly mediumThreshold: number;
}

/**
 * Confidence composition weights for Projection V2.
 * Preserves existing 0.35A + 0.3C + 0.35S and conflict penalty.
 */
export interface ConfidenceParameterSet {
  readonly policyVersion: typeof CONFIDENCE_PARAMETER_POLICY_VERSION;
  readonly alignmentWeight: number;
  readonly coverageWeight: number;
  readonly strengthWeight: number;
  readonly conflictPenalty: number;
  readonly maxConfidence: number;
  readonly requiredEvidenceWeight: number;
  readonly momentumConflictIncrement: number;
}

/**
 * Recommendation gate margins / thresholds.
 */
export interface RecommendationParameterSet {
  readonly policyVersion: typeof RECOMMENDATION_PARAMETER_POLICY_VERSION;
  readonly leanHomeMargin: number;
  readonly leanAwayMargin: number;
  readonly leanDrawMargin: number;
  readonly insufficientConfidence: number;
  readonly cautiousConfidence: number;
  readonly cautiousAlignment: number;
}

/**
 * Matrix merge governance (algorithm id only — script weights drive coefficients).
 */
export interface MatrixMergeParameterSet {
  readonly policyVersion: typeof MATRIX_MERGE_PARAMETER_POLICY_VERSION;
  readonly algorithm: typeof MULTI_SCRIPT_MERGE_ALGORITHM;
  readonly normalizeWeights: boolean;
}

export const DEFAULT_FOOTBALL_STATE_PARAMETERS: FootballStateParameterSet =
  Object.freeze({
    policyVersion: FOOTBALL_STATE_PARAMETER_POLICY_VERSION,
    lowThreshold: 0.34,
    mediumThreshold: 0.67,
  });

export const DEFAULT_CONFIDENCE_PARAMETERS: ConfidenceParameterSet = Object.freeze({
  policyVersion: CONFIDENCE_PARAMETER_POLICY_VERSION,
  alignmentWeight: 0.35,
  coverageWeight: 0.3,
  strengthWeight: 0.35,
  conflictPenalty: 0.5,
  maxConfidence: 0.95,
  requiredEvidenceWeight: 5,
  momentumConflictIncrement: 0.5,
});

export const DEFAULT_RECOMMENDATION_PARAMETERS: RecommendationParameterSet =
  Object.freeze({
    policyVersion: RECOMMENDATION_PARAMETER_POLICY_VERSION,
    leanHomeMargin: 0.08,
    leanAwayMargin: 0.08,
    leanDrawMargin: 0.05,
    insufficientConfidence: 0.4,
    cautiousConfidence: 0.55,
    cautiousAlignment: 0.5,
  });

export const DEFAULT_MATRIX_MERGE_PARAMETERS: MatrixMergeParameterSet =
  Object.freeze({
    policyVersion: MATRIX_MERGE_PARAMETER_POLICY_VERSION,
    algorithm: MULTI_SCRIPT_MERGE_ALGORITHM,
    normalizeWeights: true,
  });

export const PROJECTION_PARAMETER_GROUP_IDS = Object.freeze([
  "lambda",
  "matchScript",
  "footballState",
  "confidence",
  "recommendation",
  "matrixMerge",
] as const);

export type ProjectionParameterGroupId =
  (typeof PROJECTION_PARAMETER_GROUP_IDS)[number];
