/**
 * P2K-E validation orchestration: seal a Replay Cohort only from members that are
 * both P2K-C replayEligible and offline RuleResult-rebuildable.
 *
 * Does not change P2K-C assessProjectionReplayEligibility / selectReplayCohortMembers
 * contracts. Offline rebuildability is an additional validation gate so fixture
 * Sidecars (rule-1 / rule-p2k / feature.v2.test) cannot enter a real offline
 * replay population.
 *
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
  assessSealedReplayRuleRebuild,
  type SealedReplayRuleRebuildIssue,
} from "./assess-sealed-replay-rule-rebuild.js";

export type OfflineRebuildableCohortExclusionReason =
  | "MISSING_SIDECAR"
  | "NOT_P2K_C_REPLAY_ELIGIBLE"
  | "OFFLINE_RULE_RESULT_NOT_REBUILDABLE"
  | "SIDECAR_SCHEMA_MISMATCH";

export interface OfflineRebuildableCohortExclusion {
  readonly historyId: string;
  readonly matchId: string;
  readonly reason: OfflineRebuildableCohortExclusionReason;
  readonly detail: string;
  readonly p2kCReasons: readonly string[];
  readonly rebuildIssues: readonly SealedReplayRuleRebuildIssue[];
  readonly featureModelVersion: string | undefined;
}

export type CreateAndSealOfflineRebuildableReplayCohortOutcome =
  | {
      readonly ok: true;
      readonly value: ReplayCohort;
      readonly consideredHistoryCount: number;
      readonly selectedMemberCount: number;
      readonly exclusions: readonly OfflineRebuildableCohortExclusion[];
      readonly p2kCEligibleButNotRebuildableCount: number;
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
      readonly exclusions: readonly OfflineRebuildableCohortExclusion[];
      readonly consideredHistoryCount: number;
      readonly p2kCEligibleButNotRebuildableCount: number;
    };

function classifyCandidates(input: {
  readonly histories: readonly EvaluationHistoryRecord[];
  readonly sidecarsByHistoryId: ReadonlyMap<
    string,
    ProjectionReplaySidecarRecord | undefined
  >;
  readonly sidecarSchemaVersion: string;
}): {
  readonly candidates: readonly EvaluationHistoryRecord[];
  readonly exclusions: readonly OfflineRebuildableCohortExclusion[];
  readonly p2kCEligibleButNotRebuildableCount: number;
} {
  const exclusions: OfflineRebuildableCohortExclusion[] = [];
  const candidates: EvaluationHistoryRecord[] = [];
  let p2kCEligibleButNotRebuildableCount = 0;

  for (const history of input.histories) {
    const sidecar = input.sidecarsByHistoryId.get(history.historyId);
    const eligibility = assessProjectionReplayEligibility({
      history,
      sidecar,
      hashContext: computeProjectionReplaySidecarContentSha256,
    });

    if (sidecar === undefined) {
      exclusions.push(
        Object.freeze({
          historyId: history.historyId,
          matchId: history.matchId,
          reason: "MISSING_SIDECAR",
          detail: "No Projection Replay Sidecar for History row.",
          p2kCReasons: eligibility.reasons,
          rebuildIssues: Object.freeze([]),
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
          rebuildIssues: Object.freeze([]),
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
          rebuildIssues: Object.freeze([]),
          featureModelVersion: sidecar.context.featureModelVersion,
        }),
      );
      continue;
    }

    const rebuild = assessSealedReplayRuleRebuild(sidecar.context);
    if (!rebuild.rebuildable) {
      p2kCEligibleButNotRebuildableCount += 1;
      const issueSummary =
        rebuild.issues.length === 0
          ? "empty rules"
          : rebuild.issues
              .map((issue) => `${issue.code}:${issue.ruleId}`)
              .join("; ");
      exclusions.push(
        Object.freeze({
          historyId: history.historyId,
          matchId: history.matchId,
          reason: "OFFLINE_RULE_RESULT_NOT_REBUILDABLE",
          detail: `P2K-C eligible but createRuleResult rebuild failed (${issueSummary}).`,
          p2kCReasons: eligibility.reasons,
          rebuildIssues: rebuild.issues,
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
    p2kCEligibleButNotRebuildableCount,
  });
}

/**
 * Seal a Replay Cohort using P2K-E primitives after excluding rows that cannot
 * survive P2K-D offline RuleResult rebuild.
 */
export async function createAndSealOfflineRebuildableReplayCohort(input: {
  readonly cohortId: string;
  readonly specification?: ReplayCohortSpecification;
  readonly historyRepository: EvaluationHistoryRepository;
  readonly sidecarRepository: ProjectionReplaySidecarRepository;
  readonly cohortRepository: ReplayCohortRepository;
  readonly clock: () => string;
  readonly sidecarSchemaVersion: string;
}): Promise<CreateAndSealOfflineRebuildableReplayCohortOutcome> {
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
    return Object.freeze({
      ok: false,
      error: Object.freeze({
        code: "EMPTY_MEMBERSHIP" as const,
        message:
          "No History+Sidecar rows are both P2K-C replayEligible and offline RuleResult-rebuildable.",
      }),
      exclusions: classified.exclusions,
      consideredHistoryCount: histories.length,
      p2kCEligibleButNotRebuildableCount:
        classified.p2kCEligibleButNotRebuildableCount,
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
      selectedMemberCount: saved.members.length,
      exclusions: classified.exclusions,
      p2kCEligibleButNotRebuildableCount:
        classified.p2kCEligibleButNotRebuildableCount,
    });
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
        exclusions: classified.exclusions,
        consideredHistoryCount: histories.length,
        p2kCEligibleButNotRebuildableCount:
          classified.p2kCEligibleButNotRebuildableCount,
      });
    }

    if (error instanceof Error && error.name === "ConflictReplayCohortError") {
      return Object.freeze({
        ok: false,
        error: Object.freeze({
          code: "COHORT_CONFLICT" as const,
          message: error.message,
        }),
        exclusions: classified.exclusions,
        consideredHistoryCount: histories.length,
        p2kCEligibleButNotRebuildableCount:
          classified.p2kCEligibleButNotRebuildableCount,
      });
    }

    if (error instanceof Error && error.name === "ReplayCohortValidationError") {
      return Object.freeze({
        ok: false,
        error: Object.freeze({
          code: "VALIDATION_ERROR" as const,
          message: error.message,
        }),
        exclusions: classified.exclusions,
        consideredHistoryCount: histories.length,
        p2kCEligibleButNotRebuildableCount:
          classified.p2kCEligibleButNotRebuildableCount,
      });
    }

    throw error;
  }
}
