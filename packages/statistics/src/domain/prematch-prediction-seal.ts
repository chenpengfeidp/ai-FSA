import type { SealedPredictionInput } from "./prediction-evaluation.js";

export const PREMATCH_PREDICTION_SEAL_SCHEMA_VERSION =
  "prematch-prediction-seal.v1" as const;

export const PREMATCH_SEAL_CANONICALIZATION = "fas-json-canonical.v1" as const;

export const PREMATCH_SEAL_CHECKSUM_ALGORITHM = "sha256" as const;

export const PREMATCH_SEAL_SOURCE_AUTHORITY =
  "prisma.prematch_prediction_seal_items" as const;

export const PREMATCH_SEAL_ALLOWED_USAGE_HISTORICAL_INTAKE =
  "historical_evaluation_intake" as const;

export type PrematchSealErrorCode =
  | "SEAL_NOT_PRE_MATCH"
  | "INVALID_ANALYSIS_CUTOFF"
  | "EVIDENCE_AFTER_CUTOFF"
  | "POST_MATCH_EVIDENCE"
  | "ACTUAL_FORBIDDEN"
  | "RETROSPECTIVE_RECONSTRUCTION"
  | "REPLAY_NOT_ORIGINAL_SEAL"
  | "SYNTHETIC_FIXTURE_REJECTED"
  | "UNTRUSTED_SOURCE_AUTHORITY"
  | "TIMESTAMP_INFERRED"
  | "FIXTURE_IDENTITY_MISMATCH"
  | "HOME_AWAY_ORIENTATION_MISMATCH"
  | "UNSUPPORTED_SEAL_SCHEMA_VERSION"
  | "UNSUPPORTED_CHECKSUM_ALGORITHM"
  | "UNSUPPORTED_CANONICALIZATION"
  | "INVALID_SEAL_CHECKSUM"
  | "MISSING_MODEL_VERSION"
  | "SEAL_IDENTITY_CONFLICT";

export class PrematchPredictionSealError extends Error {
  readonly code: PrematchSealErrorCode;

  constructor(code: PrematchSealErrorCode, message: string) {
    super(message);
    this.name = "PrematchPredictionSealError";
    this.code = code;
  }
}

export interface Clock {
  now(): string;
}

export interface PrematchSealIdentity {
  readonly schemaVersion: typeof PREMATCH_PREDICTION_SEAL_SCHEMA_VERSION;
  readonly matchId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly competitionId: string;
  readonly competitionName: string;
  readonly season: string;
  readonly kickoff: string;
  readonly analysisTime: string;
  readonly analysisCutoff: string;
  readonly predictionSnapshot: SealedPredictionInput;
  readonly featureModelVersion: string;
  readonly ruleSetVersion: string;
  readonly projectionModelVersion: string;
  readonly projectionPolicyPin: string;
  readonly parameterArtifactId?: string;
  readonly parameterVersionLabel?: string;
  readonly parameterArtifactChecksum?: string;
  readonly synthetic: false;
  readonly historicalAuthenticity: true;
  readonly provenanceClass: "A";
  readonly allowedUsage: readonly [
    typeof PREMATCH_SEAL_ALLOWED_USAGE_HISTORICAL_INTAKE,
  ];
  readonly sourceAuthority: typeof PREMATCH_SEAL_SOURCE_AUTHORITY;
}

export interface PrematchPredictionSeal {
  readonly schemaVersion: typeof PREMATCH_PREDICTION_SEAL_SCHEMA_VERSION;
  readonly originalSealId: string;
  readonly sealedAt: string;
  readonly sealIdentity: PrematchSealIdentity;
  readonly contentSha256: string;
}

export interface SealEvidenceAuditRecord {
  readonly type: string;
  readonly collectedAt: string;
}

export interface PrematchFixtureIdentity {
  readonly matchId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly competitionId: string;
  readonly competitionName: string;
  readonly season: string;
  readonly kickoff: string;
}
