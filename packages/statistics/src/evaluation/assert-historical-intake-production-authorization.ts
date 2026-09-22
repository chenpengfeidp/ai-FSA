import { HistoricalEvaluationIntakeError } from "../domain/historical-evaluation-intake.js";
import type { HistoricalIntakeAuthorization } from "../domain/historical-intake-production-authorization.js";
import type { HistoricalPredictionSeal } from "../domain/historical-prediction-seal.js";
import type { VerifiedRealWorldActual } from "../domain/historical-evaluation-intake.js";

/**
 * Fail-closed production authorization after Class A / Actual / temporal validation.
 * Does not consult allowedUsage. Exact triple match only.
 */
export function assertHistoricalIntakeProductionAuthorization(
  authorization: HistoricalIntakeAuthorization,
  seal: HistoricalPredictionSeal,
  actual: VerifiedRealWorldActual,
): void {
  if (authorization.source !== "validated-policy") {
    throw new HistoricalEvaluationIntakeError(
      "PRODUCTION_INTAKE_NOT_AUTHORIZED",
      "Historical intake authorization policy is not validated.",
    );
  }

  const { policy } = authorization;

  if (policy.globalProductionHistoricalIntakeEnabled !== true) {
    throw new HistoricalEvaluationIntakeError(
      "PRODUCTION_INTAKE_NOT_AUTHORIZED",
      "Production Historical Evaluation Intake is not globally enabled.",
    );
  }

  const authorized = policy.authorizedPairs.some(
    (pair) =>
      pair.originalSealId === seal.originalSealId &&
      pair.originalSealChecksum === seal.originalSealChecksum &&
      pair.resultEvidenceId === actual.evidence.id,
  );

  if (!authorized) {
    throw new HistoricalEvaluationIntakeError(
      "ARTIFACT_NOT_PRODUCTION_AUTHORIZED",
      "Exact originalSealId + originalSealChecksum + resultEvidenceId is not production-authorized.",
    );
  }
}
