import type { SealedPredictionInput } from "./prediction-evaluation.js";

/** Replay Run artifact schema written by P2K-F. */
export const SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION =
  "sealed-cohort-offline-replay-run.p2k.f" as const;

export const SEALED_COHORT_OFFLINE_REPLAY_CALIBRATION_LABELS = Object.freeze([
  "r1b.candidate.a.baseline",
  "r1b.candidate.c.sideAwareOpen",
] as const);

export type SealedCohortOfflineReplayCalibrationLabel =
  (typeof SEALED_COHORT_OFFLINE_REPLAY_CALIBRATION_LABELS)[number];

export type SealedCohortOfflineReplayRunStatus =
  | "completed"
  | "completed_with_failures";

export type SealedCohortOfflineReplayMemberFailureCode =
  | "MISSING_HISTORY"
  | "MISSING_SIDECAR"
  | "INVALID_SIDECAR_HASH"
  | "UNSUPPORTED_SIDECAR_SCHEMA"
  | "INCOMPLETE_REPLAY_CONTEXT"
  | "MATCH_ID_MISMATCH"
  | "INVALID_PARAMETER_LABEL"
  | "PRODUCTION_IMPLICIT_OVERRIDE"
  | "MISSING_REQUIRED_REPLAY_ARTIFACT"
  | "REPLAY_NOT_ELIGIBLE"
  | "MEMBER_MATCH_ID_MISMATCH";

/** Historical context identity retained for A/B same-context verification. */
export interface SealedCohortOfflineReplayContextIdentity {
  readonly matchId: string;
  readonly featureBundleChecksum: string;
  readonly featureModelVersion: string;
  readonly featureNames: readonly string[];
  readonly ruleIds: readonly string[];
  readonly ruleNames: readonly string[];
  readonly evidenceRefs: readonly string[];
  readonly requiredEvidencePresentCount: number;
  readonly generatedAt: string;
  readonly contentSha256: string;
  readonly schemaVersion: string;
  readonly parameterVersionLabel: string | undefined;
  readonly parameterArtifactId: string | undefined;
  readonly parameterArtifactChecksum: string | undefined;
}

export type SealedCohortOfflineReplayMemberResult =
  | {
      readonly status: "success";
      readonly position: number;
      readonly historyId: string;
      readonly matchId: string;
      readonly cohortId: string;
      readonly membershipDigestSha256: string;
      readonly matchScriptCalibrationLabel: SealedCohortOfflineReplayCalibrationLabel;
      readonly isProductionDefault: boolean;
      readonly productionPromoted: false;
      readonly sidecarContentSha256: string;
      readonly sidecarSchemaVersion: string;
      readonly replaySchemaVersion: typeof SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION;
      readonly offlineParameterArtifactId: string;
      readonly offlineParameterArtifactChecksum: string;
      readonly projectionChecksum: string;
      readonly historicalReplayContext: SealedCohortOfflineReplayContextIdentity;
      readonly prediction: SealedPredictionInput;
    }
  | {
      readonly status: "failure";
      readonly position: number;
      readonly historyId: string;
      readonly matchId: string;
      readonly cohortId: string;
      readonly membershipDigestSha256: string;
      readonly matchScriptCalibrationLabel: SealedCohortOfflineReplayCalibrationLabel;
      readonly isProductionDefault: boolean;
      readonly productionPromoted: false;
      readonly replaySchemaVersion: typeof SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION;
      readonly reasonCode: SealedCohortOfflineReplayMemberFailureCode;
      readonly message: string;
    };

/**
 * Deterministic offline Replay Run against one SEALED cohort and one calibration label.
 * Does not store population metrics.
 */
export interface SealedCohortOfflineReplayRun {
  readonly replayRunId: string;
  readonly schemaVersion: typeof SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION;
  readonly cohortId: string;
  readonly membershipDigestSha256: string;
  readonly matchScriptCalibrationLabel: SealedCohortOfflineReplayCalibrationLabel;
  readonly isProductionDefault: boolean;
  readonly productionPromoted: false;
  readonly status: SealedCohortOfflineReplayRunStatus;
  readonly createdAt: string;
  readonly completedAt: string;
  readonly memberCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly results: readonly SealedCohortOfflineReplayMemberResult[];
  readonly limitations: readonly string[];
}

export type SealedCohortOfflineReplayRunValidationErrorCode =
  | "COHORT_NOT_FOUND"
  | "COHORT_NOT_SEALED"
  | "MEMBERSHIP_DIGEST_MISMATCH"
  | "DUPLICATE_MEMBERSHIP"
  | "INVALID_CALIBRATION_LABEL"
  | "EMPTY_REPLAY_RUN_ID";

export class SealedCohortOfflineReplayRunValidationError extends Error {
  readonly code: SealedCohortOfflineReplayRunValidationErrorCode;

  constructor(
    code: SealedCohortOfflineReplayRunValidationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SealedCohortOfflineReplayRunValidationError";
    this.code = code;
  }
}

export function isSealedCohortOfflineReplayCalibrationLabel(
  value: string,
): value is SealedCohortOfflineReplayCalibrationLabel {
  return (
    SEALED_COHORT_OFFLINE_REPLAY_CALIBRATION_LABELS as readonly string[]
  ).includes(value);
}
