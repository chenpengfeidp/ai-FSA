import {
  HISTORICAL_INTAKE_PRODUCTION_AUTHORIZATION_SCHEMA_VERSION,
  type HistoricalIntakeAuthorizedPair,
  type HistoricalIntakeProductionAuthorizationPolicy,
} from "../domain/historical-intake-production-authorization.js";

/**
 * Runtime production Historical Evaluation Intake authorization registry.
 *
 * YAML `production_historical_intake_authorized` in PROJECT_STATE is a separate
 * human snapshot and is NOT read here. Both must remain false until a later
 * production-authorization review lists a pair and enables the global switch.
 *
 * Do not add real artifacts (including Ipswich–Arsenal) in this sprint.
 */
export const PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY = Object.freeze({
  schemaVersion: HISTORICAL_INTAKE_PRODUCTION_AUTHORIZATION_SCHEMA_VERSION,
  globalProductionHistoricalIntakeEnabled: false,
  authorizedPairs: Object.freeze([]) as readonly HistoricalIntakeAuthorizedPair[],
}) satisfies HistoricalIntakeProductionAuthorizationPolicy;
