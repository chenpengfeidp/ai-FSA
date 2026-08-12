/**
 * P2K-E Sealed Replay Cohort — membership snapshot for future offline A/B replay.
 * Does not store predictions, outcomes, or population metrics.
 */

/** Cohort artifact schema written by P2K-E. */
export const REPLAY_COHORT_SCHEMA_VERSION = "replay-cohort.p2k.e" as const;

/**
 * Pins the P2K-C eligibility contract used as the sole membership gate.
 * Selection calls {@link assessProjectionReplayEligibility}; it does not reimplement it.
 */
export const REPLAY_ELIGIBILITY_CONTRACT_VERSION =
  "projection-replay-eligibility.p2k.c" as const;

export const REPLAY_COHORT_ORDERING_HISTORY_ID_ASC = "historyId_asc" as const;

export type ReplayCohortStatus = "DRAFT" | "SEALED";

export type ReplayCohortOrdering = typeof REPLAY_COHORT_ORDERING_HISTORY_ID_ASC;

/**
 * Deterministic cohort specification.
 * Must not encode prediction quality or actual match outcomes.
 */
export interface ReplayCohortSpecification {
  readonly eligibilityContractVersion: typeof REPLAY_ELIGIBILITY_CONTRACT_VERSION;
  readonly sidecarSchemaVersion: string;
  readonly ordering: ReplayCohortOrdering;
  /** Deterministic cap after stable ordering; never outcome-/quality-based. */
  readonly maxSampleSize?: number;
  /**
   * Optional inclusive lower bound on History `recordedAt` (ISO).
   * Filters ingest time only — not kickoff outcome fields.
   */
  readonly recordedAtFromInclusive?: string;
  /**
   * Optional exclusive upper bound on History `recordedAt` (ISO).
   * Filters ingest time only — not kickoff outcome fields.
   */
  readonly recordedAtToExclusive?: string;
}

export interface ReplayCohortMember {
  readonly historyId: string;
  readonly matchId: string;
  /** Zero-based position in the sealed ordered membership. */
  readonly position: number;
}

export interface ReplayCohort {
  readonly cohortId: string;
  readonly schemaVersion: typeof REPLAY_COHORT_SCHEMA_VERSION;
  readonly status: ReplayCohortStatus;
  readonly specification: ReplayCohortSpecification;
  readonly eligibilityContractVersion: typeof REPLAY_ELIGIBILITY_CONTRACT_VERSION;
  readonly sidecarSchemaVersion: string;
  readonly createdAt: string;
  readonly membershipCreatedAt: string;
  readonly sealedAt: string | undefined;
  readonly members: readonly ReplayCohortMember[];
  readonly membershipDigestSha256: string;
  readonly limitations: readonly string[];
}

export class ReplayCohortValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReplayCohortValidationError";
  }
}

export function createDefaultReplayCohortSpecification(input?: {
  readonly sidecarSchemaVersion: string;
  readonly maxSampleSize?: number;
  readonly recordedAtFromInclusive?: string;
  readonly recordedAtToExclusive?: string;
}): ReplayCohortSpecification {
  if (input === undefined) {
    throw new ReplayCohortValidationError(
      "sidecarSchemaVersion is required for a Replay Cohort specification.",
    );
  }

  return Object.freeze({
    eligibilityContractVersion: REPLAY_ELIGIBILITY_CONTRACT_VERSION,
    sidecarSchemaVersion: input.sidecarSchemaVersion.trim(),
    ordering: REPLAY_COHORT_ORDERING_HISTORY_ID_ASC,
    ...(input.maxSampleSize === undefined
      ? {}
      : { maxSampleSize: input.maxSampleSize }),
    ...(input.recordedAtFromInclusive === undefined
      ? {}
      : { recordedAtFromInclusive: input.recordedAtFromInclusive }),
    ...(input.recordedAtToExclusive === undefined
      ? {}
      : { recordedAtToExclusive: input.recordedAtToExclusive }),
  });
}
