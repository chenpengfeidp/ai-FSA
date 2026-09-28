import {
  HISTORICAL_INTAKE_PRODUCTION_AUTHORIZATION_SCHEMA_VERSION,
  type HistoricalIntakeAuthorizedPair,
  type HistoricalIntakeProductionAuthorizationPolicy,
} from "../domain/historical-intake-production-authorization.js";

/**
 * Runtime production Historical Evaluation Intake authorization registry.
 *
 * globalProductionHistoricalIntakeEnabled = true means the production authorization
 * mechanism is active. It does NOT mean all Class A artifacts are authorized.
 * An artifact may only enter Historical Evaluation Intake if its exact triple
 * (originalSealId, originalSealChecksum, resultEvidenceId) is listed below with
 * a non-empty admissionReviewId.
 *
 * Authorized artifacts: exactly ONE pair (Ipswich Town vs Arsenal, lottery:csl:20260915:周二012).
 * All other artifacts remain unauthorized.
 * Authorization != Ingest. This grants authorization; it does not execute ingest.
 */
export const PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY = Object.freeze({
  schemaVersion: HISTORICAL_INTAKE_PRODUCTION_AUTHORIZATION_SCHEMA_VERSION,
  globalProductionHistoricalIntakeEnabled: true,
  authorizedPairs: Object.freeze([
    Object.freeze({
      originalSealId:
        "prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9",
      originalSealChecksum:
        "ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e",
      resultEvidenceId:
        "evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result",
      admissionReviewId:
        "HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW_IPSWICH_ARSENAL_2026-09-18",
    }),
  ]) as readonly HistoricalIntakeAuthorizedPair[],
}) satisfies HistoricalIntakeProductionAuthorizationPolicy;
