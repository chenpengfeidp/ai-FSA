import type { ReplayCohort } from "../domain/replay-cohort.js";
import {
  ConflictReplayCohortError,
  ReplayCohortNotFoundError,
  SealedReplayCohortImmutableError,
  type ReplayCohortRepository,
} from "./replay-cohort-repository.js";

function sameMembership(left: ReplayCohort, right: ReplayCohort): boolean {
  return (
    left.membershipDigestSha256 === right.membershipDigestSha256 &&
    left.schemaVersion === right.schemaVersion &&
    left.eligibilityContractVersion === right.eligibilityContractVersion &&
    left.sidecarSchemaVersion === right.sidecarSchemaVersion &&
    JSON.stringify(left.members) === JSON.stringify(right.members) &&
    JSON.stringify(left.specification) === JSON.stringify(right.specification)
  );
}

export class InMemoryReplayCohortRepository implements ReplayCohortRepository {
  readonly #byId = new Map<string, ReplayCohort>();

  async save(cohort: ReplayCohort): Promise<ReplayCohort> {
    const existing = this.#byId.get(cohort.cohortId);

    if (existing === undefined) {
      const frozen = Object.freeze({
        ...cohort,
        members: Object.freeze([...cohort.members]),
        limitations: Object.freeze([...cohort.limitations]),
        specification: Object.freeze({ ...cohort.specification }),
      });
      this.#byId.set(cohort.cohortId, frozen);
      return frozen;
    }

    if (existing.status === "SEALED") {
      if (cohort.status === "SEALED" && sameMembership(existing, cohort)) {
        return existing;
      }

      throw new SealedReplayCohortImmutableError(cohort.cohortId);
    }

    // DRAFT existing: allow replace only with identical membership snapshot.
    if (!sameMembership(existing, cohort)) {
      throw new ConflictReplayCohortError(cohort.cohortId);
    }

    if (cohort.status === "SEALED") {
      const sealed = Object.freeze({
        ...existing,
        status: "SEALED" as const,
        sealedAt: cohort.sealedAt,
        members: existing.members,
        limitations: existing.limitations,
        specification: existing.specification,
      });
      this.#byId.set(cohort.cohortId, sealed);
      return sealed;
    }

    return existing;
  }

  async findByCohortId(cohortId: string): Promise<ReplayCohort | undefined> {
    return this.#byId.get(cohortId);
  }

  async seal(input: {
    readonly cohortId: string;
    readonly sealedAt: string;
  }): Promise<ReplayCohort> {
    const existing = this.#byId.get(input.cohortId);

    if (existing === undefined) {
      throw new ReplayCohortNotFoundError(input.cohortId);
    }

    if (existing.status === "SEALED") {
      return existing;
    }

    const sealed = Object.freeze({
      ...existing,
      status: "SEALED" as const,
      sealedAt: input.sealedAt,
      members: existing.members,
      limitations: existing.limitations,
      specification: existing.specification,
    });
    this.#byId.set(input.cohortId, sealed);
    return sealed;
  }
}
