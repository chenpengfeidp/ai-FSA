import type { ActualMatchResult, MatchWinner } from "./actual-match-result.js";

export const EVALUATION_MODEL_VERSION = "evaluation.mvp.a1";

export type EvaluationStatus = "excluded" | "scored";

export type ConfidenceCorrectness = "correct" | "incorrect" | "not_claimed";

export type GoalRangeBucket = "range01" | "range23" | "range4Plus";

export interface SealedScoreline {
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly probability: number;
}

export interface SealedGoalRange {
  readonly range01: number;
  readonly range23: number;
  readonly range4Plus: number;
}

export interface SealedScenario {
  readonly slot: "mostLikely" | "secondLikely" | "upset";
  readonly winner: MatchWinner;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly probability: number;
}

export interface SealedRuleSnapshot {
  readonly ruleName: string;
  readonly status: "FAIL" | "INAPPLICABLE" | "PASS";
  readonly channel: "away+" | "home+" | "none";
}

export interface SealedPredictionInput {
  readonly matchId: string;
  readonly projectionChecksum: string;
  readonly projectionStatus: "blocked" | "completed_nonempty" | "failed";
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
  readonly topScorelines: readonly SealedScoreline[];
  readonly goalRange: SealedGoalRange;
  readonly predictionConfidence: number;
  readonly confidenceBand: "high" | "low" | "medium" | "very_high";
  readonly scenarios: Readonly<{
    mostLikely: SealedScenario;
    secondLikely: SealedScenario;
    upset: SealedScenario;
  }>;
  readonly rules: readonly SealedRuleSnapshot[];
  readonly featureNames: readonly string[];
  readonly projectionModelVersion: string;
  readonly featureModelVersion?: string;
  readonly ruleSetVersion?: string;
}

export interface ScenarioHitMetrics {
  readonly mostLikely: boolean;
  readonly alternative: boolean;
  readonly upset: boolean;
  readonly anyScoreline: boolean;
  readonly mostLikelyWinner: boolean;
}

export interface RuleCoverageMetrics {
  readonly applicable: number;
  readonly pass: number;
  readonly fail: number;
  readonly inapplicable: number;
  readonly agreementRatio: number;
}

export interface FeatureCoverageMetrics {
  readonly present: number;
  readonly corePresent: number;
  readonly coreExpected: number;
  readonly coverageRatio: number;
}

export interface EvaluationMetrics {
  readonly winnerHit: boolean;
  readonly scoreHit: boolean;
  readonly goalHit: boolean;
  readonly goalRangeHit: boolean;
  readonly predictedWinner: MatchWinner;
  readonly predictedGoalRange: GoalRangeBucket;
  readonly actualGoalRange: GoalRangeBucket;
  readonly scenarioHit: ScenarioHitMetrics;
  readonly confidenceCorrectness: ConfidenceCorrectness;
  readonly ruleCoverage: RuleCoverageMetrics;
  readonly featureCoverage: FeatureCoverageMetrics;
  /** Flat +1 / −1 paper return on predicted 1X2 winner. Research framing only. */
  readonly paperUnitReturn: number;
  readonly paperMetricDisclaimer: string;
}

export interface PredictionEvaluationRecord {
  readonly evaluationModelVersion: typeof EVALUATION_MODEL_VERSION;
  readonly matchId: string;
  readonly evaluatedAt: string;
  readonly status: EvaluationStatus;
  readonly exclusionReason?: string;
  readonly projectionChecksum: string;
  readonly projectionModelVersion: string;
  readonly featureModelVersion?: string;
  readonly ruleSetVersion?: string;
  readonly actual?: ActualMatchResult;
  readonly metrics?: EvaluationMetrics;
  readonly checksum: string;
}

export interface CreatePredictionEvaluationRecordInput {
  readonly matchId: string;
  readonly evaluatedAt: string;
  readonly status: EvaluationStatus;
  readonly exclusionReason?: string;
  readonly projectionChecksum: string;
  readonly projectionModelVersion: string;
  readonly featureModelVersion?: string;
  readonly ruleSetVersion?: string;
  readonly actual?: ActualMatchResult;
  readonly metrics?: EvaluationMetrics;
  readonly checksum: string;
}

export class PredictionEvaluationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PredictionEvaluationValidationError";
  }
}

const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new PredictionEvaluationValidationError(`${field} must not be empty.`);
  }

  return normalized;
}

export function createPredictionEvaluationRecord(
  input: CreatePredictionEvaluationRecordInput,
): PredictionEvaluationRecord {
  if (
    !isoTimestampPattern.test(input.evaluatedAt) ||
    Number.isNaN(Date.parse(input.evaluatedAt))
  ) {
    throw new PredictionEvaluationValidationError(
      "evaluatedAt must be a valid ISO 8601 timestamp.",
    );
  }

  if (input.status === "scored") {
    if (input.actual === undefined || input.metrics === undefined) {
      throw new PredictionEvaluationValidationError(
        "scored evaluation requires actual and metrics.",
      );
    }

    if (input.exclusionReason !== undefined) {
      throw new PredictionEvaluationValidationError(
        "scored evaluation must not carry exclusionReason.",
      );
    }
  } else if (
    input.exclusionReason === undefined ||
    input.exclusionReason.trim().length === 0
  ) {
    throw new PredictionEvaluationValidationError(
      "excluded evaluation requires exclusionReason.",
    );
  }

  return Object.freeze({
    evaluationModelVersion: EVALUATION_MODEL_VERSION,
    matchId: requireNonEmpty(input.matchId, "matchId"),
    evaluatedAt: input.evaluatedAt,
    status: input.status,
    ...(input.exclusionReason === undefined
      ? {}
      : {
          exclusionReason: requireNonEmpty(input.exclusionReason, "exclusionReason"),
        }),
    projectionChecksum: requireNonEmpty(
      input.projectionChecksum,
      "projectionChecksum",
    ),
    projectionModelVersion: requireNonEmpty(
      input.projectionModelVersion,
      "projectionModelVersion",
    ),
    ...(input.featureModelVersion === undefined
      ? {}
      : { featureModelVersion: input.featureModelVersion }),
    ...(input.ruleSetVersion === undefined
      ? {}
      : { ruleSetVersion: input.ruleSetVersion }),
    ...(input.actual === undefined ? {} : { actual: input.actual }),
    ...(input.metrics === undefined
      ? {}
      : { metrics: Object.freeze({ ...input.metrics }) }),
    checksum: requireNonEmpty(input.checksum, "checksum"),
  });
}
