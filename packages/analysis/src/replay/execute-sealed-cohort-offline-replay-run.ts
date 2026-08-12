import type { EvaluationHistoryRepository } from "@fas/statistics";
import type { ProjectionReplaySidecarRepository } from "@fas/statistics";
import type { ReplayCohortRepository } from "@fas/statistics";
import type { ReplayRunRepository } from "@fas/statistics";
import {
  assessProjectionReplayEligibility,
  computeProjectionReplaySidecarContentSha256,
  isSealedCohortOfflineReplayCalibrationLabel,
  SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION,
  SealedCohortOfflineReplayRunValidationError,
  validateSealedCohortForOfflineRun,
  type ProjectionReplayEligibilityReason,
  type SealedCohortOfflineReplayCalibrationLabel,
  type SealedCohortOfflineReplayMemberFailureCode,
  type SealedCohortOfflineReplayMemberResult,
  type SealedCohortOfflineReplayRun,
} from "@fas/statistics";
import {
  runOfflineMatchScriptReplay,
  type OfflineMatchScriptReplayErrorCode,
} from "./offline-match-script-replay.js";

const RUN_LIMITATIONS = Object.freeze([
  "P2K-F sealed cohort offline Replay Run — measurement dataset only.",
  "Reuses P2K-D runOfflineMatchScriptReplay; no Provider / Evidence / Feature / Rule regeneration.",
  "Does not mutate sealed cohort membership.",
  "Candidate C remains NON-DEFAULT / not population validated / not production promoted.",
  "No Winner / Draw / Exact Score / Goal Range / BTTS / O-U / confidence population claims.",
]);

export type ExecuteSealedCohortOfflineReplayRunOutcome =
  | { readonly ok: true; readonly value: SealedCohortOfflineReplayRun }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: string;
        readonly message: string;
      };
    };

export interface SealedCohortOfflineReplayPair {
  readonly position: number;
  readonly historyId: string;
  readonly matchId: string;
  readonly baseline: SealedCohortOfflineReplayMemberResult;
  readonly candidate: SealedCohortOfflineReplayMemberResult;
  /** True when both succeeded and historical context identities are identical. */
  readonly sameHistoricalContext: boolean;
}

export type ExecuteSealedCohortOfflineReplayPairOutcome =
  | {
      readonly ok: true;
      readonly baseline: SealedCohortOfflineReplayRun;
      readonly candidate: SealedCohortOfflineReplayRun;
      readonly pairs: readonly SealedCohortOfflineReplayPair[];
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: string;
        readonly message: string;
      };
    };

function mapOfflineErrorCode(
  code: OfflineMatchScriptReplayErrorCode,
): SealedCohortOfflineReplayMemberFailureCode {
  return code;
}

function mapEligibilityReason(
  reason: ProjectionReplayEligibilityReason,
): SealedCohortOfflineReplayMemberFailureCode {
  switch (reason) {
    case "MISSING_SIDECAR":
      return "MISSING_SIDECAR";
    case "INVALID_SIDECAR_HASH":
      return "INVALID_SIDECAR_HASH";
    case "UNSUPPORTED_SIDECAR_SCHEMA":
      return "UNSUPPORTED_SIDECAR_SCHEMA";
    case "MATCH_ID_MISMATCH":
      return "MATCH_ID_MISMATCH";
    case "MISSING_FEATURES":
    case "MISSING_RULES":
    case "MISSING_REPLAY_CONTEXT":
      return "INCOMPLETE_REPLAY_CONTEXT";
    case "PARAMETER_ARTIFACT_UNPINNED":
      return "MISSING_REQUIRED_REPLAY_ARTIFACT";
    case "OUTCOME_NOT_FINISHED":
    case "EVALUATION_NOT_SCORED":
      return "REPLAY_NOT_ELIGIBLE";
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

function contextsEqual(
  left: SealedCohortOfflineReplayMemberResult,
  right: SealedCohortOfflineReplayMemberResult,
): boolean {
  if (left.status !== "success" || right.status !== "success") {
    return false;
  }

  return (
    JSON.stringify(left.historicalReplayContext) ===
    JSON.stringify(right.historicalReplayContext)
  );
}

/**
 * Execute one offline Replay Run for a SEALED cohort under an explicit calibration label.
 * Reuses P2K-D offline replay; does not mutate History, Sidecar, or cohort membership.
 */
export async function executeSealedCohortOfflineReplayRun(input: {
  readonly replayRunId: string;
  readonly cohortId: string;
  readonly matchScriptCalibrationLabel: string;
  readonly cohortRepository: ReplayCohortRepository;
  readonly historyRepository: EvaluationHistoryRepository;
  readonly sidecarRepository: ProjectionReplaySidecarRepository;
  readonly replayRunRepository: ReplayRunRepository;
  readonly clock: () => string;
}): Promise<ExecuteSealedCohortOfflineReplayRunOutcome> {
  try {
    const replayRunId = input.replayRunId.trim();
    if (replayRunId.length === 0) {
      throw new SealedCohortOfflineReplayRunValidationError(
        "EMPTY_REPLAY_RUN_ID",
        "replayRunId must not be empty.",
      );
    }

    if (
      !isSealedCohortOfflineReplayCalibrationLabel(input.matchScriptCalibrationLabel)
    ) {
      throw new SealedCohortOfflineReplayRunValidationError(
        "INVALID_CALIBRATION_LABEL",
        `Unsupported offline Replay Run calibrationLabel: ${input.matchScriptCalibrationLabel}`,
      );
    }

    const calibrationLabel: SealedCohortOfflineReplayCalibrationLabel =
      input.matchScriptCalibrationLabel;
    const isProductionDefault = calibrationLabel === "r1b.candidate.a.baseline";

    const loaded = await input.cohortRepository.findByCohortId(input.cohortId);
    const cohort = validateSealedCohortForOfflineRun(loaded);
    const createdAt = input.clock();
    const results: SealedCohortOfflineReplayMemberResult[] = [];

    for (const member of cohort.members) {
      const history = await input.historyRepository.findByHistoryId(
        member.historyId,
      );
      if (history === undefined) {
        results.push(
          Object.freeze({
            status: "failure" as const,
            position: member.position,
            historyId: member.historyId,
            matchId: member.matchId,
            cohortId: cohort.cohortId,
            membershipDigestSha256: cohort.membershipDigestSha256,
            matchScriptCalibrationLabel: calibrationLabel,
            isProductionDefault,
            productionPromoted: false as const,
            replaySchemaVersion: SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION,
            reasonCode: "MISSING_HISTORY",
            message: `Evaluation History "${member.historyId}" was not found for sealed cohort member.`,
          }),
        );
        continue;
      }

      if (history.matchId !== member.matchId) {
        results.push(
          Object.freeze({
            status: "failure" as const,
            position: member.position,
            historyId: member.historyId,
            matchId: member.matchId,
            cohortId: cohort.cohortId,
            membershipDigestSha256: cohort.membershipDigestSha256,
            matchScriptCalibrationLabel: calibrationLabel,
            isProductionDefault,
            productionPromoted: false as const,
            replaySchemaVersion: SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION,
            reasonCode: "MEMBER_MATCH_ID_MISMATCH",
            message: `History matchId "${history.matchId}" does not match sealed member matchId "${member.matchId}".`,
          }),
        );
        continue;
      }

      const sidecar = await input.sidecarRepository.findRecordByHistoryId(
        member.historyId,
      );
      const eligibility = assessProjectionReplayEligibility({
        history,
        sidecar,
        hashContext: computeProjectionReplaySidecarContentSha256,
      });

      if (!eligibility.replayEligible) {
        const primaryReason = eligibility.reasons[0];
        results.push(
          Object.freeze({
            status: "failure" as const,
            position: member.position,
            historyId: member.historyId,
            matchId: member.matchId,
            cohortId: cohort.cohortId,
            membershipDigestSha256: cohort.membershipDigestSha256,
            matchScriptCalibrationLabel: calibrationLabel,
            isProductionDefault,
            productionPromoted: false as const,
            replaySchemaVersion: SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION,
            reasonCode:
              primaryReason === undefined
                ? "REPLAY_NOT_ELIGIBLE"
                : mapEligibilityReason(primaryReason),
            message: `Sealed cohort member is not replayEligible: ${eligibility.reasons.join(",")}`,
          }),
        );
        continue;
      }

      const offline = runOfflineMatchScriptReplay({
        history,
        sidecar,
        matchScriptCalibrationLabel: calibrationLabel,
      });

      if (!offline.ok) {
        results.push(
          Object.freeze({
            status: "failure" as const,
            position: member.position,
            historyId: member.historyId,
            matchId: member.matchId,
            cohortId: cohort.cohortId,
            membershipDigestSha256: cohort.membershipDigestSha256,
            matchScriptCalibrationLabel: calibrationLabel,
            isProductionDefault,
            productionPromoted: false as const,
            replaySchemaVersion: SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION,
            reasonCode: mapOfflineErrorCode(offline.error.code),
            message: offline.error.message,
          }),
        );
        continue;
      }

      results.push(
        Object.freeze({
          status: "success" as const,
          position: member.position,
          historyId: member.historyId,
          matchId: member.matchId,
          cohortId: cohort.cohortId,
          membershipDigestSha256: cohort.membershipDigestSha256,
          matchScriptCalibrationLabel: offline.value.matchScriptCalibrationLabel,
          isProductionDefault: offline.value.isProductionDefault,
          productionPromoted: false as const,
          sidecarContentSha256: offline.value.historicalReplayContext.contentSha256,
          sidecarSchemaVersion: offline.value.historicalReplayContext.schemaVersion,
          replaySchemaVersion: SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION,
          offlineParameterArtifactId: offline.value.offlineParameterArtifactId,
          offlineParameterArtifactChecksum:
            offline.value.offlineParameterArtifactChecksum,
          projectionChecksum: offline.value.projectionChecksum,
          historicalReplayContext: Object.freeze({
            ...offline.value.historicalReplayContext,
          }),
          prediction: offline.value.prediction,
        }),
      );
    }

    const successCount = results.filter(
      (result) => result.status === "success",
    ).length;
    const failureCount = results.length - successCount;
    const completedAt = input.clock();

    const run: SealedCohortOfflineReplayRun = Object.freeze({
      replayRunId,
      schemaVersion: SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION,
      cohortId: cohort.cohortId,
      membershipDigestSha256: cohort.membershipDigestSha256,
      matchScriptCalibrationLabel: calibrationLabel,
      isProductionDefault,
      productionPromoted: false as const,
      status:
        failureCount === 0
          ? ("completed" as const)
          : ("completed_with_failures" as const),
      createdAt,
      completedAt,
      memberCount: results.length,
      successCount,
      failureCount,
      results: Object.freeze(results),
      limitations: RUN_LIMITATIONS,
    });

    const saved = await input.replayRunRepository.save(run);
    return Object.freeze({ ok: true, value: saved });
  } catch (error) {
    if (error instanceof SealedCohortOfflineReplayRunValidationError) {
      return Object.freeze({
        ok: false,
        error: Object.freeze({
          code: error.code,
          message: error.message,
        }),
      });
    }

    if (error instanceof Error && error.name === "ConflictReplayRunError") {
      return Object.freeze({
        ok: false,
        error: Object.freeze({
          code: "REPLAY_RUN_CONFLICT",
          message: error.message,
        }),
      });
    }

    throw error;
  }
}

/**
 * Execute Baseline A and Candidate C offline Replay Runs against the same SEALED cohort.
 * Pairs results by sealed membership order (historyId / matchId / position).
 */
export async function executeSealedCohortOfflineReplayPair(input: {
  readonly cohortId: string;
  readonly baselineReplayRunId: string;
  readonly candidateReplayRunId: string;
  readonly cohortRepository: ReplayCohortRepository;
  readonly historyRepository: EvaluationHistoryRepository;
  readonly sidecarRepository: ProjectionReplaySidecarRepository;
  readonly replayRunRepository: ReplayRunRepository;
  readonly clock: () => string;
}): Promise<ExecuteSealedCohortOfflineReplayPairOutcome> {
  const baseline = await executeSealedCohortOfflineReplayRun({
    replayRunId: input.baselineReplayRunId,
    cohortId: input.cohortId,
    matchScriptCalibrationLabel: "r1b.candidate.a.baseline",
    cohortRepository: input.cohortRepository,
    historyRepository: input.historyRepository,
    sidecarRepository: input.sidecarRepository,
    replayRunRepository: input.replayRunRepository,
    clock: input.clock,
  });

  if (!baseline.ok) {
    return Object.freeze({
      ok: false,
      error: baseline.error,
    });
  }

  const candidate = await executeSealedCohortOfflineReplayRun({
    replayRunId: input.candidateReplayRunId,
    cohortId: input.cohortId,
    matchScriptCalibrationLabel: "r1b.candidate.c.sideAwareOpen",
    cohortRepository: input.cohortRepository,
    historyRepository: input.historyRepository,
    sidecarRepository: input.sidecarRepository,
    replayRunRepository: input.replayRunRepository,
    clock: input.clock,
  });

  if (!candidate.ok) {
    return Object.freeze({
      ok: false,
      error: candidate.error,
    });
  }

  const candidateByHistoryId = new Map(
    candidate.value.results.map((result) => [result.historyId, result]),
  );

  const pairs = Object.freeze(
    baseline.value.results.map((baselineResult) => {
      const candidateResult = candidateByHistoryId.get(baselineResult.historyId);
      if (candidateResult === undefined) {
        throw new Error(
          `Candidate C replay missing sealed member ${baselineResult.historyId}.`,
        );
      }

      return Object.freeze({
        position: baselineResult.position,
        historyId: baselineResult.historyId,
        matchId: baselineResult.matchId,
        baseline: baselineResult,
        candidate: candidateResult,
        sameHistoricalContext: contextsEqual(baselineResult, candidateResult),
      });
    }),
  );

  return Object.freeze({
    ok: true,
    baseline: baseline.value,
    candidate: candidate.value,
    pairs,
  });
}
