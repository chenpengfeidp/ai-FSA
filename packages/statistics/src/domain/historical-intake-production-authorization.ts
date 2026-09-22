export const HISTORICAL_INTAKE_PRODUCTION_AUTHORIZATION_SCHEMA_VERSION =
  "historical-intake-production-authorization.v1" as const;

export class HistoricalIntakeAuthorizationPolicyError extends Error {
  readonly code = "INVALID_PRODUCTION_AUTHORIZATION_POLICY" as const;

  constructor(message: string) {
    super(message);
    this.name = "HistoricalIntakeAuthorizationPolicyError";
  }
}

export interface HistoricalIntakeAuthorizedPair {
  readonly originalSealId: string;
  readonly originalSealChecksum: string;
  readonly resultEvidenceId: string;
  readonly admissionReviewId: string;
}

export interface HistoricalIntakeProductionAuthorizationPolicy {
  readonly schemaVersion: typeof HISTORICAL_INTAKE_PRODUCTION_AUTHORIZATION_SCHEMA_VERSION;
  readonly globalProductionHistoricalIntakeEnabled: boolean;
  readonly authorizedPairs: readonly HistoricalIntakeAuthorizedPair[];
}

export interface HistoricalIntakeAuthorization {
  readonly source: "validated-policy";
  readonly policy: HistoricalIntakeProductionAuthorizationPolicy;
}
