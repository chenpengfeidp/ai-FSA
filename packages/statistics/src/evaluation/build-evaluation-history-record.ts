import {
  createEvaluationHistoryRecord,
  type EvaluationHistoryRecord,
} from "../domain/evaluation-history.js";
import type { ActualMatchResult } from "../domain/actual-match-result.js";
import type {
  PredictionEvaluationRecord,
  SealedPredictionInput,
} from "../domain/prediction-evaluation.js";

export interface BuildEvaluationHistoryRecordInput {
  readonly predictionSnapshot: SealedPredictionInput;
  readonly actualResult: ActualMatchResult;
  readonly evaluation: PredictionEvaluationRecord;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly matchDate: string;
  readonly season?: string;
  readonly recordedAt: string;
  readonly ruleSetVersion?: string;
}

function stableChecksum(parts: readonly string[]): string {
  let hash = 2166136261;

  for (const part of parts) {
    for (let index = 0; index < part.length; index += 1) {
      hash ^= part.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    hash ^= 124;
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function seasonFromMatchDate(matchDate: string): string {
  const year = new Date(matchDate).getUTCFullYear();

  if (!Number.isFinite(year)) {
    return "unknown";
  }

  return String(year);
}

/**
 * Builds an append-only Evaluation History record from a sealed evaluation.
 * historyId is deterministic so re-saves of the same seal are idempotent.
 */
export function buildEvaluationHistoryRecord(
  input: BuildEvaluationHistoryRecordInput,
): EvaluationHistoryRecord {
  const {
    predictionSnapshot,
    actualResult,
    evaluation,
    homeTeam,
    awayTeam,
    matchDate,
    recordedAt,
  } = input;

  const featureModelVersion =
    predictionSnapshot.featureModelVersion ?? "feature.unknown";
  const ruleSetVersion =
    input.ruleSetVersion ??
    predictionSnapshot.ruleSetVersion ??
    "rule.mvp.i2b.market";
  const projectionModelVersion = predictionSnapshot.projectionModelVersion;
  const evaluationModelVersion = evaluation.evaluationModelVersion;
  const historyId = `eval-history:${predictionSnapshot.matchId}:${predictionSnapshot.projectionChecksum}:${evaluation.checksum}`;
  const checksum = stableChecksum([
    historyId,
    predictionSnapshot.projectionChecksum,
    evaluation.checksum,
    actualResult.homeGoals.toString(),
    actualResult.awayGoals.toString(),
    featureModelVersion,
    ruleSetVersion,
    projectionModelVersion,
  ]);

  return createEvaluationHistoryRecord({
    historyId,
    matchId: predictionSnapshot.matchId,
    ...(actualResult.competitionId === undefined
      ? {}
      : { competitionId: actualResult.competitionId }),
    ...(actualResult.competitionName === undefined
      ? {}
      : { competitionName: actualResult.competitionName }),
    season: input.season ?? seasonFromMatchDate(matchDate),
    matchDate,
    homeTeam,
    awayTeam,
    predictionSnapshot,
    actualResult,
    evaluation,
    confidence: Object.freeze({
      predictionConfidence: predictionSnapshot.predictionConfidence,
      confidenceBand: predictionSnapshot.confidenceBand,
    }),
    featureModelVersion,
    ruleSetVersion,
    projectionModelVersion,
    evaluationModelVersion,
    recordedAt,
    checksum,
  });
}
