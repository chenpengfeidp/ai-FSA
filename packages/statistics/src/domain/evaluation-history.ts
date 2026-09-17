import type { ActualMatchResult } from "./actual-match-result.js";
import type {
  PredictionEvaluationRecord,
  SealedPredictionInput,
} from "./prediction-evaluation.js";

export const EVALUATION_HISTORY_SCHEMA_VERSION = "evaluation-history.mvp.a15";

export const EVALUATION_HISTORY_HISTORICAL_INTAKE_SCHEMA_VERSION =
  "evaluation-history.mvp.historical-intake.v1";

export const SUPPORTED_EVALUATION_HISTORY_SCHEMA_VERSIONS = Object.freeze([
  EVALUATION_HISTORY_SCHEMA_VERSION,
  EVALUATION_HISTORY_HISTORICAL_INTAKE_SCHEMA_VERSION,
] as const);

export const INTAKE_INTEGRITY_CONTRACT_VERSION =
  "historical-intake.integrity.v1" as const;

export type SupportedEvaluationHistorySchemaVersion =
  (typeof SUPPORTED_EVALUATION_HISTORY_SCHEMA_VERSIONS)[number];

/**
 * Immutable Evaluation History record (A1.5).
 * Append-only platform capability for Calibration / Statistics / Knowledge / Case.
 * Never mutates the original Prediction seal.
 */
export interface EvaluationHistoryRecordBase {
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

export interface A15EvaluationHistoryRecord extends EvaluationHistoryRecordBase {
  readonly schemaVersion: typeof EVALUATION_HISTORY_SCHEMA_VERSION;
}

export interface HistoricalIntakeIntegrity {
  readonly contractVersion: typeof INTAKE_INTEGRITY_CONTRACT_VERSION;
  readonly originalSealId: string;
  readonly originalSealKind: "sealed_projection";
  readonly originalSealSource: string;
  readonly originalSealChecksum: string;
  readonly checksumAlgorithm: "sha256";
  readonly checksumCanonicalization: "fas-json-canonical.v1";
  readonly checksumScope: string;
  readonly analysisTime: string;
  readonly analysisCutoff: string;
  readonly predictionGeneratedAt: string;
  readonly kickoff: string;
  readonly projectionPolicyPin?: string;
  readonly parameterArtifactId?: string;
  readonly parameterVersionLabel?: string;
  readonly parameterArtifactChecksum?: string;
  readonly resultEvidenceId: string;
  readonly resultEvidenceSourceRef: string;
  readonly resultVerifiedAt: string;
  readonly historicalAuthenticity: true;
  readonly provenanceClass: "A";
  readonly realWorldActualVerified: true;
  readonly replayComplete: boolean;
  readonly replayEligible: boolean;
  readonly replayReasons: readonly string[];
  readonly calibrationEligible: boolean;
  readonly validationEligible: boolean;
  readonly contributionEligible: boolean;
  readonly replayCohortEligible: boolean;
  readonly intakeRecordedAt?: string;
}

export interface HistoricalIntakeEvaluationHistoryRecord
  extends EvaluationHistoryRecordBase {
  readonly schemaVersion: typeof EVALUATION_HISTORY_HISTORICAL_INTAKE_SCHEMA_VERSION;
  readonly intakeIntegrity: HistoricalIntakeIntegrity;
}

export type EvaluationHistoryRecord =
  | A15EvaluationHistoryRecord
  | HistoricalIntakeEvaluationHistoryRecord;

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

export interface CreateHistoricalIntakeEvaluationHistoryRecordInput
  extends CreateEvaluationHistoryRecordInput {
  readonly intakeIntegrity: HistoricalIntakeIntegrity;
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

function requireBaseFields(
  input: CreateEvaluationHistoryRecordInput,
): Omit<EvaluationHistoryRecordBase, never> {
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

function requireIntakeIntegrity(
  integrity: HistoricalIntakeIntegrity,
): HistoricalIntakeIntegrity {
  if (integrity.contractVersion !== INTAKE_INTEGRITY_CONTRACT_VERSION) {
    throw new EvaluationHistoryValidationError(
      `intakeIntegrity.contractVersion must be "${INTAKE_INTEGRITY_CONTRACT_VERSION}".`,
    );
  }

  if (integrity.originalSealKind !== "sealed_projection") {
    throw new EvaluationHistoryValidationError(
      'intakeIntegrity.originalSealKind must be "sealed_projection".',
    );
  }

  if (integrity.checksumAlgorithm !== "sha256") {
    throw new EvaluationHistoryValidationError(
      'intakeIntegrity.checksumAlgorithm must be "sha256".',
    );
  }

  if (integrity.checksumCanonicalization !== "fas-json-canonical.v1") {
    throw new EvaluationHistoryValidationError(
      'intakeIntegrity.checksumCanonicalization must be "fas-json-canonical.v1".',
    );
  }

  if (integrity.historicalAuthenticity !== true) {
    throw new EvaluationHistoryValidationError(
      "intakeIntegrity.historicalAuthenticity must be true.",
    );
  }

  if (integrity.provenanceClass !== "A") {
    throw new EvaluationHistoryValidationError(
      'intakeIntegrity.provenanceClass must be "A".',
    );
  }

  if (integrity.realWorldActualVerified !== true) {
    throw new EvaluationHistoryValidationError(
      "intakeIntegrity.realWorldActualVerified must be true.",
    );
  }

  if (
    integrity.calibrationEligible !== false ||
    integrity.validationEligible !== false ||
    integrity.contributionEligible !== false ||
    integrity.replayCohortEligible !== false
  ) {
    throw new EvaluationHistoryValidationError(
      "historical-intake rows must default ineligible for Calibration, Validation, Contribution, and replay cohorts.",
    );
  }

  return Object.freeze({
    contractVersion: INTAKE_INTEGRITY_CONTRACT_VERSION,
    originalSealId: requireNonEmpty(
      integrity.originalSealId,
      "intakeIntegrity.originalSealId",
    ),
    originalSealKind: "sealed_projection",
    originalSealSource: requireNonEmpty(
      integrity.originalSealSource,
      "intakeIntegrity.originalSealSource",
    ),
    originalSealChecksum: requireNonEmpty(
      integrity.originalSealChecksum,
      "intakeIntegrity.originalSealChecksum",
    ),
    checksumAlgorithm: "sha256",
    checksumCanonicalization: "fas-json-canonical.v1",
    checksumScope: requireNonEmpty(
      integrity.checksumScope,
      "intakeIntegrity.checksumScope",
    ),
    analysisTime: requireTimestamp(
      integrity.analysisTime,
      "intakeIntegrity.analysisTime",
    ),
    analysisCutoff: requireTimestamp(
      integrity.analysisCutoff,
      "intakeIntegrity.analysisCutoff",
    ),
    predictionGeneratedAt: requireTimestamp(
      integrity.predictionGeneratedAt,
      "intakeIntegrity.predictionGeneratedAt",
    ),
    kickoff: requireTimestamp(integrity.kickoff, "intakeIntegrity.kickoff"),
    ...(integrity.projectionPolicyPin === undefined
      ? {}
      : {
          projectionPolicyPin: requireNonEmpty(
            integrity.projectionPolicyPin,
            "intakeIntegrity.projectionPolicyPin",
          ),
        }),
    ...(integrity.parameterArtifactId === undefined
      ? {}
      : {
          parameterArtifactId: requireNonEmpty(
            integrity.parameterArtifactId,
            "intakeIntegrity.parameterArtifactId",
          ),
        }),
    ...(integrity.parameterVersionLabel === undefined
      ? {}
      : {
          parameterVersionLabel: requireNonEmpty(
            integrity.parameterVersionLabel,
            "intakeIntegrity.parameterVersionLabel",
          ),
        }),
    ...(integrity.parameterArtifactChecksum === undefined
      ? {}
      : {
          parameterArtifactChecksum: requireNonEmpty(
            integrity.parameterArtifactChecksum,
            "intakeIntegrity.parameterArtifactChecksum",
          ),
        }),
    resultEvidenceId: requireNonEmpty(
      integrity.resultEvidenceId,
      "intakeIntegrity.resultEvidenceId",
    ),
    resultEvidenceSourceRef: requireNonEmpty(
      integrity.resultEvidenceSourceRef,
      "intakeIntegrity.resultEvidenceSourceRef",
    ),
    resultVerifiedAt: requireTimestamp(
      integrity.resultVerifiedAt,
      "intakeIntegrity.resultVerifiedAt",
    ),
    historicalAuthenticity: true,
    provenanceClass: "A",
    realWorldActualVerified: true,
    replayComplete: integrity.replayComplete,
    replayEligible: integrity.replayEligible,
    replayReasons: Object.freeze([...integrity.replayReasons]),
    calibrationEligible: false,
    validationEligible: false,
    contributionEligible: false,
    replayCohortEligible: false,
    ...(integrity.intakeRecordedAt === undefined
      ? {}
      : {
          intakeRecordedAt: requireTimestamp(
            integrity.intakeRecordedAt,
            "intakeIntegrity.intakeRecordedAt",
          ),
        }),
  });
}

export function createEvaluationHistoryRecord(
  input: CreateEvaluationHistoryRecordInput,
): A15EvaluationHistoryRecord {
  return Object.freeze({
    schemaVersion: EVALUATION_HISTORY_SCHEMA_VERSION,
    ...requireBaseFields(input),
  });
}

export function createHistoricalIntakeEvaluationHistoryRecord(
  input: CreateHistoricalIntakeEvaluationHistoryRecordInput,
): HistoricalIntakeEvaluationHistoryRecord {
  return Object.freeze({
    schemaVersion: EVALUATION_HISTORY_HISTORICAL_INTAKE_SCHEMA_VERSION,
    ...requireBaseFields(input),
    intakeIntegrity: requireIntakeIntegrity(input.intakeIntegrity),
  });
}

export function isHistoricalIntakeEvaluationHistoryRecord(
  record: EvaluationHistoryRecord,
): record is HistoricalIntakeEvaluationHistoryRecord {
  return (
    record.schemaVersion === EVALUATION_HISTORY_HISTORICAL_INTAKE_SCHEMA_VERSION
  );
}

export function isCalibrationPopulationEligible(
  record: EvaluationHistoryRecord,
): boolean {
  if (isHistoricalIntakeEvaluationHistoryRecord(record)) {
    return record.intakeIntegrity.calibrationEligible === true;
  }

  return true;
}

export function isValidationPopulationEligible(
  record: EvaluationHistoryRecord,
): boolean {
  if (isHistoricalIntakeEvaluationHistoryRecord(record)) {
    return record.intakeIntegrity.validationEligible === true;
  }

  return true;
}

export function isContributionPopulationEligible(
  record: EvaluationHistoryRecord,
): boolean {
  if (isHistoricalIntakeEvaluationHistoryRecord(record)) {
    return record.intakeIntegrity.contributionEligible === true;
  }

  return true;
}

export function isReplayCohortPopulationEligible(
  record: EvaluationHistoryRecord,
): boolean {
  if (isHistoricalIntakeEvaluationHistoryRecord(record)) {
    return record.intakeIntegrity.replayCohortEligible === true;
  }

  return true;
}
