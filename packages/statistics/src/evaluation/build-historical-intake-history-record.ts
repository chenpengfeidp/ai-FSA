import {
  createHistoricalIntakeEvaluationHistoryRecord,
  INTAKE_INTEGRITY_CONTRACT_VERSION,
  type HistoricalIntakeEvaluationHistoryRecord,
  type HistoricalIntakeIntegrity,
} from "../domain/evaluation-history.js";
import type { HistoricalPredictionSeal } from "../domain/historical-prediction-seal.js";
import type { VerifiedRealWorldActual } from "../domain/historical-evaluation-intake.js";
import type { PredictionEvaluationRecord } from "../domain/prediction-evaluation.js";

export const HISTORICAL_INTAKE_HISTORY_ID_PREFIX = "eval-history-hi:";

export function historicalIntakeHistoryId(
  originalSealId: string,
  originalSealChecksum: string,
): string {
  return `${HISTORICAL_INTAKE_HISTORY_ID_PREFIX}${originalSealId}:${originalSealChecksum}`;
}

function stableChecksum(parts: readonly string[]): string {
  let hash = 2166136261;

  for (const part of parts) {
    for (let index = 0; index < part.length; index += 1) {
      hash ^= part.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
  }

  hash ^= 124;
  hash = Math.imul(hash, 16777619);

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export interface BuildHistoricalIntakeHistoryRecordInput {
  readonly seal: HistoricalPredictionSeal;
  readonly actual: VerifiedRealWorldActual;
  readonly evaluation: PredictionEvaluationRecord;
  readonly intakeRecordedAt: string;
  readonly replayComplete: boolean;
  readonly replayEligible: boolean;
  readonly replayReasons: readonly string[];
}

export function buildHistoricalIntakeHistoryRecord(
  input: BuildHistoricalIntakeHistoryRecordInput,
): HistoricalIntakeEvaluationHistoryRecord {
  const { seal, actual, evaluation, intakeRecordedAt } = input;
  const historyId = historicalIntakeHistoryId(
    seal.originalSealId,
    seal.originalSealChecksum,
  );
  const checksum = stableChecksum([
    historyId,
    seal.originalSealChecksum,
    evaluation.checksum,
    actual.actual.homeGoals.toString(),
    actual.actual.awayGoals.toString(),
    seal.featureModelVersion,
    seal.ruleSetVersion,
    seal.projectionModelVersion,
  ]);

  const intakeIntegrity: HistoricalIntakeIntegrity = Object.freeze({
    contractVersion: INTAKE_INTEGRITY_CONTRACT_VERSION,
    originalSealId: seal.originalSealId,
    originalSealKind: "sealed_projection",
    originalSealSource: seal.originalSealSource,
    originalSealChecksum: seal.originalSealChecksum,
    checksumAlgorithm: "sha256",
    checksumCanonicalization: "fas-json-canonical.v1",
    checksumScope: seal.checksumScope,
    analysisTime: seal.analysisTime,
    analysisCutoff: seal.analysisCutoff,
    predictionGeneratedAt: seal.generatedAt,
    kickoff: seal.kickoff,
    ...(seal.projectionPolicyPin === undefined
      ? {}
      : { projectionPolicyPin: seal.projectionPolicyPin }),
    ...(seal.parameterArtifactId === undefined
      ? {}
      : { parameterArtifactId: seal.parameterArtifactId }),
    ...(seal.parameterVersionLabel === undefined
      ? {}
      : { parameterVersionLabel: seal.parameterVersionLabel }),
    ...(seal.parameterArtifactChecksum === undefined
      ? {}
      : { parameterArtifactChecksum: seal.parameterArtifactChecksum }),
    resultEvidenceId: actual.evidence.id,
    resultEvidenceSourceRef: `${actual.evidence.providerId}:${actual.evidence.sourceId}`,
    resultVerifiedAt: actual.actual.observedAt,
    historicalAuthenticity: true,
    provenanceClass: "A",
    realWorldActualVerified: true,
    replayComplete: input.replayComplete,
    replayEligible: input.replayEligible,
    replayReasons: Object.freeze([...input.replayReasons]),
    calibrationEligible: false,
    validationEligible: false,
    contributionEligible: false,
    replayCohortEligible: false,
    intakeRecordedAt,
  });

  return createHistoricalIntakeEvaluationHistoryRecord({
    historyId,
    matchId: seal.matchId,
    competitionId: seal.competitionId,
    competitionName: seal.competitionName,
    season: seal.season,
    matchDate: seal.kickoff,
    homeTeam: seal.homeTeam,
    awayTeam: seal.awayTeam,
    predictionSnapshot: seal.predictionSnapshot,
    actualResult: actual.actual,
    evaluation,
    confidence: Object.freeze({
      predictionConfidence: seal.predictionSnapshot.predictionConfidence,
      confidenceBand: seal.predictionSnapshot.confidenceBand,
    }),
    featureModelVersion: seal.featureModelVersion,
    ruleSetVersion: seal.ruleSetVersion,
    projectionModelVersion: seal.projectionModelVersion,
    evaluationModelVersion: evaluation.evaluationModelVersion,
    recordedAt: intakeRecordedAt,
    checksum,
    intakeIntegrity,
  });
}
