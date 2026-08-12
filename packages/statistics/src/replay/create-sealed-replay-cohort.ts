import type { EvaluationHistoryRepository } from "../repository/evaluation-history-repository.js";
import type { ProjectionReplaySidecarRepository } from "../repository/projection-replay-sidecar-repository.js";
import type { ReplayCohortRepository } from "../repository/replay-cohort-repository.js";
import type {
  ReplayCohort,
  ReplayCohortSpecification,
} from "../domain/replay-cohort.js";
import type { ProjectionReplaySidecarRecord } from "./projection-replay-sidecar-record.js";
import { buildReplayCohort } from "./build-replay-cohort.js";
import { selectReplayCohortMembers } from "./select-replay-cohort-members.js";

export type CreateSealedReplayCohortOutcome =
  | { readonly ok: true; readonly value: ReplayCohort }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: "COHORT_CONFLICT" | "SEALED_IMMUTABLE" | "VALIDATION_ERROR";
        readonly message: string;
      };
    };

/**
 * Build membership from durable History + Sidecar, then persist a SEALED cohort.
 * Read-only w.r.t. History/Sidecar — never fabricates Sidecars or regenerates Evidence.
 */
export async function createAndSealReplayCohort(input: {
  readonly cohortId: string;
  readonly specification: ReplayCohortSpecification;
  readonly historyRepository: EvaluationHistoryRepository;
  readonly sidecarRepository: ProjectionReplaySidecarRepository;
  readonly cohortRepository: ReplayCohortRepository;
  readonly clock: () => string;
}): Promise<CreateSealedReplayCohortOutcome> {
  try {
    const histories = await input.historyRepository.query({});
    const sidecarsByHistoryId = new Map<
      string,
      ProjectionReplaySidecarRecord | undefined
    >();

    for (const history of histories) {
      sidecarsByHistoryId.set(
        history.historyId,
        await input.sidecarRepository.findRecordByHistoryId(history.historyId),
      );
    }

    const selection = selectReplayCohortMembers({
      histories,
      sidecarsByHistoryId,
      specification: input.specification,
    });

    const now = input.clock();
    const cohort = buildReplayCohort({
      cohortId: input.cohortId,
      status: "SEALED",
      selection,
      createdAt: now,
      membershipCreatedAt: now,
      sealedAt: now,
    });

    const saved = await input.cohortRepository.save(cohort);
    return Object.freeze({ ok: true, value: saved });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "SealedReplayCohortImmutableError"
    ) {
      return Object.freeze({
        ok: false,
        error: Object.freeze({
          code: "SEALED_IMMUTABLE" as const,
          message: error.message,
        }),
      });
    }

    if (error instanceof Error && error.name === "ConflictReplayCohortError") {
      return Object.freeze({
        ok: false,
        error: Object.freeze({
          code: "COHORT_CONFLICT" as const,
          message: error.message,
        }),
      });
    }

    if (error instanceof Error && error.name === "ReplayCohortValidationError") {
      return Object.freeze({
        ok: false,
        error: Object.freeze({
          code: "VALIDATION_ERROR" as const,
          message: error.message,
        }),
      });
    }

    throw error;
  }
}

/**
 * Resolve a previously sealed cohort by id for future P2K-F replay runs.
 */
export async function resolveSealedReplayCohort(input: {
  readonly cohortId: string;
  readonly cohortRepository: ReplayCohortRepository;
}): Promise<ReplayCohort | undefined> {
  const cohort = await input.cohortRepository.findByCohortId(input.cohortId);
  if (cohort === undefined || cohort.status !== "SEALED") {
    return undefined;
  }
  return cohort;
}
