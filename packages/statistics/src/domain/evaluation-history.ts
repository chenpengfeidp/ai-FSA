import type { ActualMatchResult } from "./actual-match-result.js";
import type {
  PredictionEvaluationRecord,
  SealedPredictionInput,
} from "./prediction-evaluation.js";

export const EVALUATION_HISTORY_SCHEMA_VERSION = "evaluation-history.mvp.a15";

/**
 * Immutable Evaluation History record (A1.5).
 * Append-only platform capability for Calibration / Statistics / Knowledge / Case.
 * Never mutates the original Prediction seal.
 */
export interface EvaluationHistoryRecord {
  readonly schemaVersion: typeof EVALUATION_HISTORY_SCHEMA_VERSION;
  readonly historyId: string;
  readonly matchId: string;
  readonly competitionId?: string;
  readonly competitionName?: string;
  readonly season: string;
  readonly matchDate: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly predictionSnapshot: SealedPredictionInput;
  readonly actualResult: ActualMatchResult;
  readonly evaluation: PredictionEvaluationRecord;
  readonly confidence: Readonly<{
    predictionConfidence: number;
    confidenceBand: "high" | "low" | "medium" | "very_high";
  }>;
  readonly featureModelVersion: string;
  readonly ruleSetVersion: string;
  readonly projectionModelVersion: string;
  readonly evaluationModelVersion: string;
  readonly recordedAt: string;
  readonly checksum: string;
}

export interface CreateEvaluationHistoryRecordInput {
  readonly historyId: string;
  readonly matchId: string;
  readonly competitionId?: string;
  readonly competitionName?: string;
  readonly season: string;
  readonly matchDate: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly predictionSnapshot: SealedPredictionInput;
  readonly actualResult: ActualMatchResult;
  readonly evaluation: PredictionEvaluationRecord;
  readonly confidence: Readonly<{
    predictionConfidence: number;
    confidenceBand: "high" | "low" | "medium" | "very_high";
  }>;
  readonly featureModelVersion: string;
  readonly ruleSetVersion: string;
  readonly projectionModelVersion: string;
  readonly evaluationModelVersion: string;
  readonly recordedAt: string;
  readonly checksum: string;
}

export class EvaluationHistoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvaluationHistoryValidationError";
  }
}

const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new EvaluationHistoryValidationError(`${field} must not be empty.`);
  }

  return normalized;
}

function requireTimestamp(value: string, field: string): string {
  if (!isoTimestampPattern.test(value) || Number.isNaN(Date.parse(value))) {
    throw new EvaluationHistoryValidationError(
      `${field} must be a valid ISO 8601 timestamp.`,
    );
  }

  return value;
}

export function createEvaluationHistoryRecord(
  input: CreateEvaluationHistoryRecordInput,
): EvaluationHistoryRecord {
  if (input.predictionSnapshot.matchId !== input.matchId) {
    throw new EvaluationHistoryValidationError(
      "predictionSnapshot.matchId must match history matchId.",
    );
  }

  if (input.actualResult.matchId !== input.matchId) {
    throw new EvaluationHistoryValidationError(
      "actualResult.matchId must match history matchId.",
    );
  }

  if (input.evaluation.matchId !== input.matchId) {
    throw new EvaluationHistoryValidationError(
      "evaluation.matchId must match history matchId.",
    );
  }

  if (input.evaluation.status !== "scored") {
    throw new EvaluationHistoryValidationError(
      "Evaluation History only stores scored evaluations.",
    );
  }

  return Object.freeze({
    schemaVersion: EVALUATION_HISTORY_SCHEMA_VERSION,
    historyId: requireNonEmpty(input.historyId, "historyId"),
    matchId: requireNonEmpty(input.matchId, "matchId"),
    ...(input.competitionId === undefined
      ? {}
      : {
          competitionId: requireNonEmpty(input.competitionId, "competitionId"),
        }),
    ...(input.competitionName === undefined
      ? {}
      : {
          competitionName: requireNonEmpty(input.competitionName, "competitionName"),
        }),
    season: requireNonEmpty(input.season, "season"),
    matchDate: requireTimestamp(input.matchDate, "matchDate"),
    homeTeam: requireNonEmpty(input.homeTeam, "homeTeam"),
    awayTeam: requireNonEmpty(input.awayTeam, "awayTeam"),
    predictionSnapshot: input.predictionSnapshot,
    actualResult: input.actualResult,
    evaluation: input.evaluation,
    confidence: Object.freeze({ ...input.confidence }),
    featureModelVersion: requireNonEmpty(
      input.featureModelVersion,
      "featureModelVersion",
    ),
    ruleSetVersion: requireNonEmpty(input.ruleSetVersion, "ruleSetVersion"),
    projectionModelVersion: requireNonEmpty(
      input.projectionModelVersion,
      "projectionModelVersion",
    ),
    evaluationModelVersion: requireNonEmpty(
      input.evaluationModelVersion,
      "evaluationModelVersion",
    ),
    recordedAt: requireTimestamp(input.recordedAt, "recordedAt"),
    checksum: requireNonEmpty(input.checksum, "checksum"),
  });
}
