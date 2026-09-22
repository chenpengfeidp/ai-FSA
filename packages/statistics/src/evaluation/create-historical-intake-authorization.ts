import {
  HISTORICAL_INTAKE_PRODUCTION_AUTHORIZATION_SCHEMA_VERSION,
  HistoricalIntakeAuthorizationPolicyError,
  type HistoricalIntakeAuthorization,
  type HistoricalIntakeAuthorizedPair,
  type HistoricalIntakeProductionAuthorizationPolicy,
} from "../domain/historical-intake-production-authorization.js";

const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/u;
const WILDCARD_PATTERN = /[*?]/u;
const POLICY_KEYS = Object.freeze([
  "schemaVersion",
  "globalProductionHistoricalIntakeEnabled",
  "authorizedPairs",
] as const);
const PAIR_KEYS = Object.freeze([
  "originalSealId",
  "originalSealChecksum",
  "resultEvidenceId",
  "admissionReviewId",
] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void {
  const keys = Object.keys(value);
  for (const key of keys) {
    if (!allowed.includes(key)) {
      throw new HistoricalIntakeAuthorizationPolicyError(
        `${label} contains unknown field "${key}".`,
      );
    }
  }

  for (const required of allowed) {
    if (!keys.includes(required)) {
      throw new HistoricalIntakeAuthorizationPolicyError(
        `${label} is missing required field "${required}".`,
      );
    }
  }
}

function requireExactIdentityField(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new HistoricalIntakeAuthorizationPolicyError(`${field} must be a string.`);
  }

  if (value.trim().length === 0 || value !== value.trim()) {
    throw new HistoricalIntakeAuthorizationPolicyError(
      `${field} must be a non-empty exact identifier without surrounding whitespace.`,
    );
  }

  if (WILDCARD_PATTERN.test(value)) {
    throw new HistoricalIntakeAuthorizationPolicyError(
      `${field} must not contain wildcard characters.`,
    );
  }

  return value;
}

function requireChecksum(value: unknown, field: string): string {
  const checksum = requireExactIdentityField(value, field);
  if (!SHA256_HEX_PATTERN.test(checksum)) {
    throw new HistoricalIntakeAuthorizationPolicyError(
      `${field} must be a lowercase sha256 hex digest (64 characters).`,
    );
  }

  return checksum;
}

function decodePair(value: unknown, index: number): HistoricalIntakeAuthorizedPair {
  if (!isRecord(value)) {
    throw new HistoricalIntakeAuthorizationPolicyError(
      `authorizedPairs[${String(index)}] must be an object.`,
    );
  }

  assertExactKeys(value, PAIR_KEYS, `authorizedPairs[${String(index)}]`);

  return Object.freeze({
    originalSealId: requireExactIdentityField(
      value.originalSealId,
      `authorizedPairs[${String(index)}].originalSealId`,
    ),
    originalSealChecksum: requireChecksum(
      value.originalSealChecksum,
      `authorizedPairs[${String(index)}].originalSealChecksum`,
    ),
    resultEvidenceId: requireExactIdentityField(
      value.resultEvidenceId,
      `authorizedPairs[${String(index)}].resultEvidenceId`,
    ),
    admissionReviewId: requireExactIdentityField(
      value.admissionReviewId,
      `authorizedPairs[${String(index)}].admissionReviewId`,
    ),
  });
}

function assertNoDuplicateIdentities(
  pairs: readonly HistoricalIntakeAuthorizedPair[],
): void {
  const originalSealIds = new Set<string>();

  for (const [index, pair] of pairs.entries()) {
    if (originalSealIds.has(pair.originalSealId)) {
      throw new HistoricalIntakeAuthorizationPolicyError(
        `authorizedPairs[${String(index)}] duplicates originalSealId.`,
      );
    }

    originalSealIds.add(pair.originalSealId);
  }
}

/**
 * Fail-closed decoder for production (and test) Historical Intake authorization policy.
 * Unknown fields, wildcards, duplicates, and malformed checksums are rejected.
 */
export function createHistoricalIntakeAuthorization(
  value: unknown,
): HistoricalIntakeAuthorization {
  if (!isRecord(value)) {
    throw new HistoricalIntakeAuthorizationPolicyError(
      "Authorization policy must be an object.",
    );
  }

  assertExactKeys(value, POLICY_KEYS, "authorization policy");

  if (
    value.schemaVersion !== HISTORICAL_INTAKE_PRODUCTION_AUTHORIZATION_SCHEMA_VERSION
  ) {
    throw new HistoricalIntakeAuthorizationPolicyError(
      `Unsupported authorization policy schemaVersion "${String(value.schemaVersion)}".`,
    );
  }

  if (typeof value.globalProductionHistoricalIntakeEnabled !== "boolean") {
    throw new HistoricalIntakeAuthorizationPolicyError(
      "globalProductionHistoricalIntakeEnabled must be a boolean.",
    );
  }

  if (!Array.isArray(value.authorizedPairs)) {
    throw new HistoricalIntakeAuthorizationPolicyError(
      "authorizedPairs must be an array.",
    );
  }

  const authorizedPairs = Object.freeze(
    value.authorizedPairs.map((pair, index) => decodePair(pair, index)),
  );
  assertNoDuplicateIdentities(authorizedPairs);

  const policy: HistoricalIntakeProductionAuthorizationPolicy = Object.freeze({
    schemaVersion: HISTORICAL_INTAKE_PRODUCTION_AUTHORIZATION_SCHEMA_VERSION,
    globalProductionHistoricalIntakeEnabled:
      value.globalProductionHistoricalIntakeEnabled,
    authorizedPairs,
  });

  return Object.freeze({
    source: "validated-policy",
    policy,
  });
}
