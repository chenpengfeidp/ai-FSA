import type { SealedPredictionInput } from "../domain/prediction-evaluation.js";
import {
  PREMATCH_PREDICTION_SEAL_SCHEMA_VERSION,
  PREMATCH_SEAL_ALLOWED_USAGE_HISTORICAL_INTAKE,
  PREMATCH_SEAL_CANONICALIZATION,
  PREMATCH_SEAL_CHECKSUM_ALGORITHM,
  PREMATCH_SEAL_SOURCE_AUTHORITY,
  PrematchPredictionSealError,
  type PrematchFixtureIdentity,
  type PrematchPredictionSeal,
  type PrematchSealIdentity,
} from "../domain/prematch-prediction-seal.js";
import { canonicalizeJson, sha256CanonicalJson } from "./canonical-json.js";

const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u;

export interface CreatePrematchPredictionSealInput {
  readonly fixture: PrematchFixtureIdentity;
  readonly analysisTime: string;
  readonly analysisCutoff: string;
  readonly sealedAt: string;
  readonly predictionSnapshot: SealedPredictionInput;
  readonly featureModelVersion: string;
  readonly ruleSetVersion: string;
  readonly projectionModelVersion: string;
  readonly projectionPolicyPin: string;
  readonly parameterArtifactId?: string;
  readonly parameterVersionLabel?: string;
  readonly parameterArtifactChecksum?: string;
  readonly schemaVersion?: string;
  readonly checksumAlgorithm?: string;
  readonly canonicalization?: string;
  readonly sourceAuthority?: string;
  readonly synthetic?: boolean;
  readonly historicalAuthenticity?: boolean;
  readonly provenanceClass?: string;
  readonly allowedUsage?: readonly string[];
}

function requireTimestamp(value: string, field: string): string {
  if (!ISO_TIMESTAMP_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    throw new PrematchPredictionSealError(
      "TIMESTAMP_INFERRED",
      `${field} must be a stored ISO-8601 timestamp; inferred clocks are forbidden.`,
    );
  }

  return value;
}

function requireNonEmpty(value: string, field: string): string {
  if (value.trim().length === 0) {
    throw new PrematchPredictionSealError(
      "FIXTURE_IDENTITY_MISMATCH",
      `${field} is required on the PRE_MATCH seal.`,
    );
  }

  return value;
}

function requireModelVersion(value: string, field: string): string {
  if (value.trim().length === 0) {
    throw new PrematchPredictionSealError(
      "MISSING_MODEL_VERSION",
      `${field} is required on the PRE_MATCH seal.`,
    );
  }

  return value;
}

function omitUndefined<Value extends Record<string, unknown>>(value: Value): Value {
  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
  return Object.freeze(Object.fromEntries(entries)) as Value;
}

export function buildSealIdentity(
  input: CreatePrematchPredictionSealInput,
): PrematchSealIdentity {
  const schemaVersion =
    input.schemaVersion ?? PREMATCH_PREDICTION_SEAL_SCHEMA_VERSION;

  if (schemaVersion !== PREMATCH_PREDICTION_SEAL_SCHEMA_VERSION) {
    throw new PrematchPredictionSealError(
      "UNSUPPORTED_SEAL_SCHEMA_VERSION",
      `Unsupported seal schemaVersion "${schemaVersion}".`,
    );
  }

  const checksumAlgorithm =
    input.checksumAlgorithm ?? PREMATCH_SEAL_CHECKSUM_ALGORITHM;

  if (checksumAlgorithm !== PREMATCH_SEAL_CHECKSUM_ALGORITHM) {
    throw new PrematchPredictionSealError(
      "UNSUPPORTED_CHECKSUM_ALGORITHM",
      `Unsupported seal checksum algorithm "${checksumAlgorithm}".`,
    );
  }

  const canonicalization = input.canonicalization ?? PREMATCH_SEAL_CANONICALIZATION;

  if (canonicalization !== PREMATCH_SEAL_CANONICALIZATION) {
    throw new PrematchPredictionSealError(
      "UNSUPPORTED_CANONICALIZATION",
      `Unsupported seal canonicalization "${canonicalization}".`,
    );
  }

  if (input.synthetic === true) {
    throw new PrematchPredictionSealError(
      "SYNTHETIC_FIXTURE_REJECTED",
      "Synthetic or Class B fixtures cannot produce a Class A PRE_MATCH seal.",
    );
  }

  if (
    input.historicalAuthenticity === false ||
    (input.provenanceClass !== undefined && input.provenanceClass !== "A")
  ) {
    throw new PrematchPredictionSealError(
      "SYNTHETIC_FIXTURE_REJECTED",
      "Non-Class-A classification cannot be persisted as an authentic PRE_MATCH seal.",
    );
  }

  const sourceAuthority = input.sourceAuthority ?? PREMATCH_SEAL_SOURCE_AUTHORITY;

  if (sourceAuthority !== PREMATCH_SEAL_SOURCE_AUTHORITY) {
    throw new PrematchPredictionSealError(
      "UNTRUSTED_SOURCE_AUTHORITY",
      `Untrusted seal sourceAuthority "${sourceAuthority}".`,
    );
  }

  const allowedUsage =
    input.allowedUsage ??
    Object.freeze([PREMATCH_SEAL_ALLOWED_USAGE_HISTORICAL_INTAKE]);

  if (!allowedUsage.includes(PREMATCH_SEAL_ALLOWED_USAGE_HISTORICAL_INTAKE)) {
    throw new PrematchPredictionSealError(
      "UNTRUSTED_SOURCE_AUTHORITY",
      "Class A seals must allow historical_evaluation_intake.",
    );
  }

  const analysisTime = requireTimestamp(input.analysisTime, "analysisTime");
  const analysisCutoff = requireTimestamp(input.analysisCutoff, "analysisCutoff");
  const sealedAt = requireTimestamp(input.sealedAt, "sealedAt");
  const kickoff = requireTimestamp(input.fixture.kickoff, "kickoff");

  if (analysisCutoff !== analysisTime) {
    throw new PrematchPredictionSealError(
      "INVALID_ANALYSIS_CUTOFF",
      "analysisCutoff must equal analysisTime.",
    );
  }

  const analysisMs = Date.parse(analysisTime);
  const sealedMs = Date.parse(sealedAt);
  const kickoffMs = Date.parse(kickoff);

  if (analysisMs >= kickoffMs) {
    throw new PrematchPredictionSealError(
      "SEAL_NOT_PRE_MATCH",
      "analysisTime must be strictly before kickoff.",
    );
  }

  if (sealedMs < analysisMs) {
    throw new PrematchPredictionSealError(
      "SEAL_NOT_PRE_MATCH",
      "sealedAt must be greater than or equal to analysisTime.",
    );
  }

  if (sealedMs >= kickoffMs) {
    throw new PrematchPredictionSealError(
      "SEAL_NOT_PRE_MATCH",
      "sealedAt must be strictly before kickoff.",
    );
  }

  if (input.predictionSnapshot.matchId !== input.fixture.matchId) {
    throw new PrematchPredictionSealError(
      "FIXTURE_IDENTITY_MISMATCH",
      "predictionSnapshot.matchId must equal fixture matchId.",
    );
  }

  const identity = omitUndefined({
    schemaVersion: PREMATCH_PREDICTION_SEAL_SCHEMA_VERSION,
    matchId: requireNonEmpty(input.fixture.matchId, "matchId"),
    homeTeam: requireNonEmpty(input.fixture.homeTeam, "homeTeam"),
    awayTeam: requireNonEmpty(input.fixture.awayTeam, "awayTeam"),
    competitionId: requireNonEmpty(input.fixture.competitionId, "competitionId"),
    competitionName: requireNonEmpty(
      input.fixture.competitionName,
      "competitionName",
    ),
    season: requireNonEmpty(input.fixture.season, "season"),
    kickoff,
    analysisTime,
    analysisCutoff,
    predictionSnapshot: input.predictionSnapshot,
    featureModelVersion: requireModelVersion(
      input.featureModelVersion,
      "featureModelVersion",
    ),
    ruleSetVersion: requireModelVersion(input.ruleSetVersion, "ruleSetVersion"),
    projectionModelVersion: requireModelVersion(
      input.projectionModelVersion,
      "projectionModelVersion",
    ),
    projectionPolicyPin: requireModelVersion(
      input.projectionPolicyPin,
      "projectionPolicyPin",
    ),
    ...(input.parameterArtifactId === undefined
      ? {}
      : { parameterArtifactId: input.parameterArtifactId }),
    ...(input.parameterVersionLabel === undefined
      ? {}
      : { parameterVersionLabel: input.parameterVersionLabel }),
    ...(input.parameterArtifactChecksum === undefined
      ? {}
      : { parameterArtifactChecksum: input.parameterArtifactChecksum }),
    synthetic: false as const,
    historicalAuthenticity: true as const,
    provenanceClass: "A" as const,
    allowedUsage: Object.freeze([
      PREMATCH_SEAL_ALLOWED_USAGE_HISTORICAL_INTAKE,
    ]) as PrematchSealIdentity["allowedUsage"],
    sourceAuthority: PREMATCH_SEAL_SOURCE_AUTHORITY,
  });

  return Object.freeze(identity) as PrematchSealIdentity;
}

export function computeSealIdentityHash(identity: PrematchSealIdentity): string {
  return sha256CanonicalJson(identity);
}

export function computeOriginalSealId(
  matchId: string,
  sealIdentityHash: string,
): string {
  return `prematch-seal:${matchId}:${sealIdentityHash}`;
}

export function computeContentSha256(
  schemaVersion: string,
  originalSealId: string,
  sealedAt: string,
  sealIdentity: PrematchSealIdentity,
): string {
  return sha256CanonicalJson({
    schemaVersion,
    originalSealId,
    sealedAt,
    sealIdentity,
  });
}

export function identitiesCanonicallyEqual(
  left: PrematchSealIdentity,
  right: PrematchSealIdentity,
): boolean {
  return canonicalizeJson(left) === canonicalizeJson(right);
}

export function createPrematchPredictionSeal(
  input: CreatePrematchPredictionSealInput,
): PrematchPredictionSeal {
  const sealIdentity = buildSealIdentity(input);
  const sealIdentityHash = computeSealIdentityHash(sealIdentity);
  const originalSealId = computeOriginalSealId(
    sealIdentity.matchId,
    sealIdentityHash,
  );
  const contentSha256 = computeContentSha256(
    sealIdentity.schemaVersion,
    originalSealId,
    input.sealedAt,
    sealIdentity,
  );

  return Object.freeze({
    schemaVersion: PREMATCH_PREDICTION_SEAL_SCHEMA_VERSION,
    originalSealId,
    sealedAt: input.sealedAt,
    sealIdentity,
    contentSha256,
  });
}

export function authenticatePrematchPredictionSeal(
  seal: PrematchPredictionSeal,
): void {
  const expected = computeContentSha256(
    seal.schemaVersion,
    seal.originalSealId,
    seal.sealedAt,
    seal.sealIdentity,
  );

  if (expected !== seal.contentSha256) {
    throw new PrematchPredictionSealError(
      "INVALID_SEAL_CHECKSUM",
      "contentSha256 does not authenticate the stored PRE_MATCH seal.",
    );
  }

  const identityHash = computeSealIdentityHash(seal.sealIdentity);
  const expectedId = computeOriginalSealId(seal.sealIdentity.matchId, identityHash);

  if (expectedId !== seal.originalSealId) {
    throw new PrematchPredictionSealError(
      "INVALID_SEAL_CHECKSUM",
      "originalSealId does not match sealIdentityHash.",
    );
  }
}
