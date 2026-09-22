import { HISTORICAL_INTAKE_PRODUCTION_AUTHORIZATION_SCHEMA_VERSION } from "../../src/domain/historical-intake-production-authorization.js";
import { createHistoricalIntakeAuthorization } from "../../src/evaluation/create-historical-intake-authorization.js";
import {
  ingestHistoricalEvaluationWithAuthorization,
  type EvaluatePredictionFn,
  type IngestHistoricalEvaluationInput,
} from "../../src/evaluation/ingest-historical-evaluation.js";
import type { HistoricalEvaluationIntakeResult } from "../../src/domain/historical-evaluation-intake.js";
import type { HistoricalPredictionSeal } from "../../src/domain/historical-prediction-seal.js";
import type { VerifiedRealWorldActual } from "../../src/domain/historical-evaluation-intake.js";

export const UNIT_TEST_CONSTRUCTED_ADMISSION_REVIEW_ID =
  "unit_test_constructed_admission" as const;

export interface ConstructedAuthorizedPairInput {
  readonly seal: HistoricalPredictionSeal;
  readonly actual: VerifiedRealWorldActual;
}

export function constructedHistoricalIntakeAuthorizationPolicy(
  pairs: readonly ConstructedAuthorizedPairInput[],
  globalProductionHistoricalIntakeEnabled = true,
): unknown {
  return Object.freeze({
    schemaVersion: HISTORICAL_INTAKE_PRODUCTION_AUTHORIZATION_SCHEMA_VERSION,
    globalProductionHistoricalIntakeEnabled,
    authorizedPairs: Object.freeze(
      pairs.map((pair) =>
        Object.freeze({
          originalSealId: pair.seal.originalSealId,
          originalSealChecksum: pair.seal.originalSealChecksum,
          resultEvidenceId: pair.actual.evidence.id,
          admissionReviewId: UNIT_TEST_CONSTRUCTED_ADMISSION_REVIEW_ID,
        }),
      ),
    ),
  });
}

export interface IngestHistoricalEvaluationForTestInput
  extends IngestHistoricalEvaluationInput {
  readonly authorizationPolicy: unknown;
  readonly evaluatePredictionFn?: EvaluatePredictionFn;
}

/**
 * Test-only Historical Evaluation Intake. Not exported from `@fas/statistics`.
 * Production application code must not import this module.
 */
export async function ingestHistoricalEvaluationForTest(
  input: IngestHistoricalEvaluationForTestInput,
): Promise<HistoricalEvaluationIntakeResult> {
  const authorization = createHistoricalIntakeAuthorization(
    input.authorizationPolicy,
  );

  return ingestHistoricalEvaluationWithAuthorization({
    command: input.command,
    historyRepository: input.historyRepository,
    ...(input.sidecarRepository === undefined
      ? {}
      : { sidecarRepository: input.sidecarRepository }),
    authorization,
    ...(input.evaluatePredictionFn === undefined
      ? {}
      : { evaluatePredictionFn: input.evaluatePredictionFn }),
  });
}
