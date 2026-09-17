import {
  createEvaluationHistoryRecord,
  createHistoricalIntakeEvaluationHistoryRecord,
  EVALUATION_HISTORY_HISTORICAL_INTAKE_SCHEMA_VERSION,
  EVALUATION_HISTORY_SCHEMA_VERSION,
  EvaluationHistoryValidationError,
  type CreateEvaluationHistoryRecordInput,
  type CreateHistoricalIntakeEvaluationHistoryRecordInput,
  type EvaluationHistoryRecord,
  type HistoricalIntakeIntegrity,
} from "../domain/evaluation-history.js";

export class UnsupportedHistorySchemaVersionError extends Error {
  readonly code = "UNSUPPORTED_HISTORY_SCHEMA_VERSION" as const;

  constructor(schemaVersion: string) {
    super(`Unsupported Evaluation History schemaVersion "${schemaVersion}".`);
    this.name = "UnsupportedHistorySchemaVersionError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Version-aware Evaluation History decoder.
 *
 * - a15: reconstruct via a15 creator; corrupt a15 returns undefined (legacy omit).
 * - historical-intake.v1: intake creator; missing intakeIntegrity fails closed.
 * - any other schemaVersion: throw UNSUPPORTED_HISTORY_SCHEMA_VERSION.
 */
export function decodeEvaluationHistoryRecord(
  value: unknown,
): EvaluationHistoryRecord | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const schemaVersion = value.schemaVersion;

  if (schemaVersion === EVALUATION_HISTORY_SCHEMA_VERSION) {
    const { schemaVersion: _schemaVersion, ...rest } = value;

    try {
      return createEvaluationHistoryRecord(
        rest as unknown as CreateEvaluationHistoryRecordInput,
      );
    } catch {
      return undefined;
    }
  }

  if (schemaVersion === EVALUATION_HISTORY_HISTORICAL_INTAKE_SCHEMA_VERSION) {
    if (!isRecord(value.intakeIntegrity)) {
      throw new EvaluationHistoryValidationError(
        "historical-intake History requires intakeIntegrity.",
      );
    }

    const { schemaVersion: _schemaVersion, intakeIntegrity, ...rest } = value;

    return createHistoricalIntakeEvaluationHistoryRecord({
      ...(rest as unknown as CreateEvaluationHistoryRecordInput),
      intakeIntegrity: intakeIntegrity as unknown as HistoricalIntakeIntegrity,
    } satisfies CreateHistoricalIntakeEvaluationHistoryRecordInput);
  }

  if (typeof schemaVersion === "string") {
    throw new UnsupportedHistorySchemaVersionError(schemaVersion);
  }

  throw new UnsupportedHistorySchemaVersionError(String(schemaVersion));
}
