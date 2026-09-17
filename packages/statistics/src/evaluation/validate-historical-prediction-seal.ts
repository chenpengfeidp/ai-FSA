import { PREMATCH_SEAL_ALLOWED_USAGE_HISTORICAL_INTAKE } from "../domain/prematch-prediction-seal.js";
import {
  HistoricalEvaluationIntakeError,
  type HistoricalEvaluationIntakeFailureCode,
} from "../domain/historical-evaluation-intake.js";
import {
  HISTORICAL_PREDICTION_SEAL_KIND,
  type HistoricalPredictionSeal,
} from "../domain/historical-prediction-seal.js";
import { sha256CanonicalJson } from "./canonical-json.js";

function requireNonEmpty(
  value: string,
  code: HistoricalEvaluationIntakeFailureCode,
  field: string,
): string {
  if (value.trim().length === 0) {
    throw new HistoricalEvaluationIntakeError(code, `${field} must not be empty.`);
  }

  return value;
}

export function validateHistoricalPredictionSeal(
  seal: HistoricalPredictionSeal,
): HistoricalPredictionSeal {
  if (
    seal.reconstructed === true ||
    seal.generatedByCurrentAnalysisPipeline === true
  ) {
    throw new HistoricalEvaluationIntakeError(
      "RETROSPECTIVE_RECONSTRUCTION",
      "Retrospective reconstruction cannot be admitted as a Class A PRE_MATCH seal.",
    );
  }

  if (
    seal.synthetic === true ||
    seal.historicalAuthenticity !== true ||
    seal.provenanceClass !== "A" ||
    seal.allowedUsage.includes("conformance_test_only")
  ) {
    throw new HistoricalEvaluationIntakeError(
      "SYNTHETIC_FIXTURE_REJECTED",
      "Synthetic, Class B/C, or conformance-only seals are rejected by production intake.",
    );
  }

  if (!seal.allowedUsage.includes(PREMATCH_SEAL_ALLOWED_USAGE_HISTORICAL_INTAKE)) {
    throw new HistoricalEvaluationIntakeError(
      "SYNTHETIC_FIXTURE_REJECTED",
      "Seal allowedUsage must include historical_evaluation_intake.",
    );
  }

  if (seal.originalSealKind !== HISTORICAL_PREDICTION_SEAL_KIND) {
    throw new HistoricalEvaluationIntakeError(
      "INVALID_SEAL_CHECKSUM",
      'originalSealKind must be "sealed_projection".',
    );
  }

  if (seal.checksumAlgorithm !== "sha256") {
    throw new HistoricalEvaluationIntakeError(
      "UNSUPPORTED_CHECKSUM_ALGORITHM",
      `Unsupported seal checksum algorithm "${seal.checksumAlgorithm}".`,
    );
  }

  if (seal.checksumCanonicalization !== "fas-json-canonical.v1") {
    throw new HistoricalEvaluationIntakeError(
      "UNSUPPORTED_CANONICALIZATION",
      `Unsupported seal canonicalization "${seal.checksumCanonicalization}".`,
    );
  }

  requireNonEmpty(
    seal.originalSealId,
    "FIXTURE_IDENTITY_MISMATCH",
    "originalSealId",
  );
  requireNonEmpty(
    seal.originalSealSource,
    "FIXTURE_IDENTITY_MISMATCH",
    "originalSealSource",
  );
  requireNonEmpty(seal.matchId, "FIXTURE_IDENTITY_MISMATCH", "matchId");
  requireNonEmpty(seal.homeTeam, "HOME_AWAY_ORIENTATION_MISMATCH", "homeTeam");
  requireNonEmpty(seal.awayTeam, "HOME_AWAY_ORIENTATION_MISMATCH", "awayTeam");
  requireNonEmpty(seal.competitionId, "FIXTURE_IDENTITY_MISMATCH", "competitionId");
  requireNonEmpty(
    seal.competitionName,
    "FIXTURE_IDENTITY_MISMATCH",
    "competitionName",
  );
  requireNonEmpty(seal.season, "FIXTURE_IDENTITY_MISMATCH", "season");
  requireNonEmpty(
    seal.featureModelVersion,
    "MISSING_MODEL_VERSION",
    "featureModelVersion",
  );
  requireNonEmpty(seal.ruleSetVersion, "MISSING_MODEL_VERSION", "ruleSetVersion");
  requireNonEmpty(
    seal.projectionModelVersion,
    "MISSING_MODEL_VERSION",
    "projectionModelVersion",
  );
  requireNonEmpty(seal.checksumScope, "INVALID_SEAL_CHECKSUM", "checksumScope");

  if (seal.predictionSnapshot.matchId !== seal.matchId) {
    throw new HistoricalEvaluationIntakeError(
      "FIXTURE_IDENTITY_MISMATCH",
      "predictionSnapshot.matchId must match seal matchId.",
    );
  }

  const scopedPayload = seal.checksumPayload ?? seal.predictionSnapshot;
  const digest = sha256CanonicalJson(scopedPayload);

  if (digest !== seal.originalSealChecksum) {
    throw new HistoricalEvaluationIntakeError(
      "INVALID_SEAL_CHECKSUM",
      "originalSealChecksum does not match the canonical sha256 of the declared checksum scope.",
    );
  }

  return seal;
}
