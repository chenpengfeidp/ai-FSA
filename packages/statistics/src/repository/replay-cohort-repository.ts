import type { ReplayCohort } from "../domain/replay-cohort.js";

export interface ReplayCohortRepository {
  /** Persist a DRAFT or SEALED cohort. Same digest + status is idempotent. */
  save(cohort: ReplayCohort): Promise<ReplayCohort>;
  findByCohortId(cohortId: string): Promise<ReplayCohort | undefined>;
  /**
   * Transition DRAFT → SEALED. Already-SEALED with identical digest returns existing.
   * Never mutates membership.
   */
  seal(input: {
    readonly cohortId: string;
    readonly sealedAt: string;
  }): Promise<ReplayCohort>;
}

export class ConflictReplayCohortError extends Error {
  constructor(cohortId: string) {
    super(
      `Replay Cohort "${cohortId}" already exists with different membership or seal state.`,
    );
    this.name = "ConflictReplayCohortError";
  }
}

export class SealedReplayCohortImmutableError extends Error {
  constructor(cohortId: string) {
    super(
      `Replay Cohort "${cohortId}" is SEALED and cannot change membership or order.`,
    );
    this.name = "SealedReplayCohortImmutableError";
  }
}

export class ReplayCohortNotFoundError extends Error {
  constructor(cohortId: string) {
    super(`Replay Cohort "${cohortId}" was not found.`);
    this.name = "ReplayCohortNotFoundError";
  }
}
