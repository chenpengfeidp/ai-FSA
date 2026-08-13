/**
 * P2K-E validation orchestration for Projection-v2 recovery rows:
 * P2K-C replayEligible AND independent offlineReplayExecutable.
 *
 * Does not change P2K-C assessProjectionReplayEligibility / selectReplayCohortMembers.
 * Does not add parameter provenance into replayComplete.
 * Does not run P2K-F / P2K-G / P2K-H. Does not mutate History or Sidecar.
 */
import {
  assessProjectionReplayEligibility,
  buildReplayCohort,
  computeProjectionReplaySidecarContentSha256,
  createDefaultReplayCohortSpecification,
  selectReplayCohortMembers,
  type EvaluationHistoryRecord,
  type EvaluationHistoryRepository,
  type ProjectionReplaySidecarRecord,
  type ProjectionReplaySidecarRepository,
  type ReplayCohort,
  type ReplayCohortRepository,
  type ReplayCohortSpecification,
} from "@fas/statistics";

import {
  assessOfflineReplayExecutability,
  type OfflineReplayExecutabilityReason,
} from "./assess-offline-replay-executability.js";

export type OfflineExecutableCohortExclusionReason =
  | "OUT_OF_NAMESPACE"
  | "MISSING_SIDECAR"
  | "NOT_P2K_C_REPLAY_ELIGIBLE"
  | "SIDECAR_SCHEMA_MISMATCH"
  | "NOT_OFFLINE_REPLAY_EXECUTABLE";

export interface OfflineExecutableCohortExclusion {
  readonly historyId: string;
  readonly matchId: string;
  readonly reason: OfflineExecutableCohortExclusionReason;
  readonly detail: string;
  readonly p2kCReasons: readonly string[];
  readonly offlineExecReasons: readonly OfflineReplayExecutabilityReason[];
  readonly featureModelVersion: string | undefined;
}

export type CreateAndSealOfflineExecutableReplayCohortOutcome =
  | {
      readonly ok: true;
      readonly value: ReplayCohort;
      readonly consideredHistoryCount: number;
      readonly namespaceHistoryCount: number;
      readonly selectedMemberCount: number;
      readonly p2kCEligibleCount: number;
      readonly offlineReplayExecutableCount: number;
      readonly exclusions: readonly OfflineExecutableCohortExclusion[];
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code:
          | "EMPTY_MEMBERSHIP"
          | "COHORT_CONFLICT"
          | "SEALED_IMMUTABLE"
          | "VALIDATION_ERROR";
        readonly message: string;
      };
      readonly exclusions: readonly OfflineExecutableCohortExclusion[];
      readonly consideredHistoryCount: number;
      readonly namespaceHistoryCount: number;
      readonly p2kCEligibleCount: number;
      readonly offlineReplayExecutableCount: number;
    };

function classifyCandidates(input: {
  readonly histories: readonly EvaluationHistoryRecord[];
  readonly sidecarsByHistoryId: ReadonlyMap<
    string,
    ProjectionReplaySidecarRecord | undefined
  >;
  readonly sidecarSchemaVersion: string;
  readonly matchIdPrefix: string;
}): {
  readonly candidates: readonly EvaluationHistoryRecord[];
  readonly exclusions: readonly OfflineExecutableCohortExclusion[];
  readonly namespaceHistoryCount: number;
  readonly p2kCEligibleCount: number;
  readonly offlineReplayExecutableCount: number;
} {
  const exclusions: OfflineExecutableCohortExclusion[] = [];
  const candidates: EvaluationHistoryRecord[] = [];
  let namespaceHistoryCount = 0;
  let p2kCEligibleCount = 0;
  let offlineReplayExecutableCount = 0;

  for (const history of input.histories) {
    if (!history.matchId.startsWith(input.matchIdPrefix)) {
      exclusions.push(
        Object.freeze({
          historyId: history.historyId,
          matchId: history.matchId,
          reason: "OUT_OF_NAMESPACE",
          detail: `matchId is outside prefix "${input.matchIdPrefix}".`,
          p2kCReasons: Object.freeze([]),
          offlineExecReasons: Object.freeze([]),
          featureModelVersion: history.featureModelVersion,
        }),
      );
      continue;
    }

    namespaceHistoryCount += 1;
    const sidecar = input.sidecarsByHistoryId.get(history.historyId);
    const eligibility = assessProjectionReplayEligibility({
      history,
      sidecar,
      hashContext: computeProjectionReplaySidecarContentSha256,
    });
    const executable = assessOfflineReplayExecutability({ history, sidecar });

    if (eligibility.replayEligible) {
      p2kCEligibleCount += 1;
    }
    if (executable.offlineReplayExecutable) {
      offlineReplayExecutableCount += 1;
    }

    if (sidecar === undefined) {
      exclusions.push(
        Object.freeze({
          historyId: history.historyId,
          matchId: history.matchId,
          reason: "MISSING_SIDECAR",
          detail: "No Projection Replay Sidecar for History row.",
          p2kCReasons: eligibility.reasons,
          offlineExecReasons: executable.reasons,
          featureModelVersion: history.featureModelVersion,
        }),
      );
      continue;
    }

    if (!eligibility.replayEligible) {
      exclusions.push(
        Object.freeze({
          historyId: history.historyId,
          matchId: history.matchId,
          reason: "NOT_P2K_C_REPLAY_ELIGIBLE",
          detail: `P2K-C replayEligible=false (${eligibility.reasons.join(",") || "unspecified"}).`,
          p2kCReasons: eligibility.reasons,
          offlineExecReasons: executable.reasons,
          featureModelVersion: sidecar.context.featureModelVersion,
        }),
      );
      continue;
    }

    if (sidecar.schemaVersion !== input.sidecarSchemaVersion) {
      exclusions.push(
        Object.freeze({
          historyId: history.historyId,
          matchId: history.matchId,
          reason: "SIDECAR_SCHEMA_MISMATCH",
          detail: `Sidecar schemaVersion ${sidecar.schemaVersion} != pin ${input.sidecarSchemaVersion}.`,
          p2kCReasons: eligibility.reasons,
          offlineExecReasons: executable.reasons,
          featureModelVersion: sidecar.context.featureModelVersion,
        }),
      );
      continue;
    }

    if (!executable.offlineReplayExecutable) {
      exclusions.push(
        Object.freeze({
          historyId: history.historyId,
          matchId: history.matchId,
          reason: "NOT_OFFLINE_REPLAY_EXECUTABLE",
          detail: `P2K-C eligible but offlineReplayExecutable=false (${executable.reasons.join(",") || "unspecified"}).`,
          p2kCReasons: eligibility.reasons,
          offlineExecReasons: executable.reasons,
          featureModelVersion: sidecar.context.featureModelVersion,
        }),
      );
      continue;
    }

    candidates.push(history);
  }

  return Object.freeze({
    candidates: Object.freeze(candidates),
    exclusions: Object.freeze(exclusions),
    namespaceHistoryCount,
    p2kCEligibleCount,
    offlineReplayExecutableCount,
  });
}

function failureOutcome(input: {
  readonly code:
    | "EMPTY_MEMBERSHIP"
    | "COHORT_CONFLICT"
    | "SEALED_IMMUTABLE"
    | "VALIDATION_ERROR";
  readonly message: string;
  readonly classified: ReturnType<typeof classifyCandidates>;
  readonly consideredHistoryCount: number;
}): CreateAndSealOfflineExecutableReplayCohortOutcome {
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code: input.code,
      message: input.message,
    }),
    exclusions: input.classified.exclusions,
    consideredHistoryCount: input.consideredHistoryCount,
    namespaceHistoryCount: input.classified.namespaceHistoryCount,
    p2kCEligibleCount: input.classified.p2kCEligibleCount,
    offlineReplayExecutableCount: input.classified.offlineReplayExecutableCount,
  });
}

/**
 * Seal a Replay Cohort from a matchId namespace after P2K-C eligibility and
 * independent offlineReplayExecutable gates.
 */
export async function createAndSealOfflineExecutableReplayCohort(input: {
  readonly cohortId: string;
  readonly matchIdPrefix: string;
  readonly specification?: ReplayCohortSpecification;
  readonly historyRepository: EvaluationHistoryRepository;
  readonly sidecarRepository: ProjectionReplaySidecarRepository;
  readonly cohortRepository: ReplayCohortRepository;
  readonly clock: () => string;
  readonly sidecarSchemaVersion: string;
}): Promise<CreateAndSealOfflineExecutableReplayCohortOutcome> {
  const matchIdPrefix = input.matchIdPrefix.trim();
  const specification =
    input.specification ??
    createDefaultReplayCohortSpecification({
      sidecarSchemaVersion: input.sidecarSchemaVersion,
    });

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

  const classified = classifyCandidates({
    histories,
    sidecarsByHistoryId,
    sidecarSchemaVersion: specification.sidecarSchemaVersion,
    matchIdPrefix,
  });

  const candidateSidecars = new Map<
    string,
    ProjectionReplaySidecarRecord | undefined
  >();
  for (const history of classified.candidates) {
    candidateSidecars.set(
      history.historyId,
      sidecarsByHistoryId.get(history.historyId),
    );
  }

  const selection = selectReplayCohortMembers({
    histories: classified.candidates,
    sidecarsByHistoryId: candidateSidecars,
    specification,
  });

  if (selection.members.length === 0) {
    return failureOutcome({
      code: "EMPTY_MEMBERSHIP",
      message:
        "No History+Sidecar rows in the requested namespace are both P2K-C replayEligible and offlineReplayExecutable.",
      classified,
      consideredHistoryCount: histories.length,
    });
  }

  try {
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

    return Object.freeze({
      ok: true,
      value: saved,
      consideredHistoryCount: histories.length,
      namespaceHistoryCount: classified.namespaceHistoryCount,
      selectedMemberCount: saved.members.length,
      p2kCEligibleCount: classified.p2kCEligibleCount,
      offlineReplayExecutableCount: classified.offlineReplayExecutableCount,
      exclusions: classified.exclusions,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "SealedReplayCohortImmutableError"
    ) {
      return failureOutcome({
        code: "SEALED_IMMUTABLE",
        message: error.message,
        classified,
        consideredHistoryCount: histories.length,
      });
    }

    if (error instanceof Error && error.name === "ConflictReplayCohortError") {
      return failureOutcome({
        code: "COHORT_CONFLICT",
        message: error.message,
        classified,
        consideredHistoryCount: histories.length,
      });
    }

    if (error instanceof Error && error.name === "ReplayCohortValidationError") {
      return failureOutcome({
        code: "VALIDATION_ERROR",
        message: error.message,
        classified,
        consideredHistoryCount: histories.length,
      });
    }

    throw error;
  }
}
