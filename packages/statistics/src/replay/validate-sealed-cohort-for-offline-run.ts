import type { ReplayCohort } from "../domain/replay-cohort.js";
import { SealedCohortOfflineReplayRunValidationError } from "../domain/sealed-cohort-offline-replay-run.js";
import { computeReplayCohortMembershipDigestSha256 } from "./compute-replay-cohort-membership-digest.js";

/**
 * Fail-closed validation before offline Replay Run execution.
 * Never mutates or repairs the cohort.
 */
export function validateSealedCohortForOfflineRun(
  cohort: ReplayCohort | undefined,
): ReplayCohort {
  if (cohort === undefined) {
    throw new SealedCohortOfflineReplayRunValidationError(
      "COHORT_NOT_FOUND",
      "Sealed Replay Cohort was not found.",
    );
  }

  if (cohort.status !== "SEALED") {
    throw new SealedCohortOfflineReplayRunValidationError(
      "COHORT_NOT_SEALED",
      `Replay Cohort "${cohort.cohortId}" must be SEALED (status=${cohort.status}).`,
    );
  }

  const historyIds = cohort.members.map((member) => member.historyId);
  if (new Set(historyIds).size !== historyIds.length) {
    throw new SealedCohortOfflineReplayRunValidationError(
      "DUPLICATE_MEMBERSHIP",
      `Replay Cohort "${cohort.cohortId}" has duplicate historyId membership.`,
    );
  }

  const recomputed = computeReplayCohortMembershipDigestSha256({
    specification: cohort.specification,
    members: cohort.members,
  });

  if (recomputed !== cohort.membershipDigestSha256) {
    throw new SealedCohortOfflineReplayRunValidationError(
      "MEMBERSHIP_DIGEST_MISMATCH",
      `Replay Cohort "${cohort.cohortId}" membership digest does not match sealed members.`,
    );
  }

  return cohort;
}
