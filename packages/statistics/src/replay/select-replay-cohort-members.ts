import type { EvaluationHistoryRecord } from "../domain/evaluation-history.js";
import type {
  ReplayCohortMember,
  ReplayCohortSpecification,
} from "../domain/replay-cohort.js";
import {
  REPLAY_ELIGIBILITY_CONTRACT_VERSION,
  ReplayCohortValidationError,
} from "../domain/replay-cohort.js";
import type { ProjectionReplaySidecarRecord } from "./projection-replay-sidecar-record.js";
import { assessProjectionReplayEligibility } from "./assess-projection-replay-eligibility.js";
import { computeProjectionReplaySidecarContentSha256 } from "./sidecar-content-sha256.js";
import { computeReplayCohortMembershipDigestSha256 } from "./compute-replay-cohort-membership-digest.js";

export interface ReplayCohortMembershipSelection {
  readonly specification: ReplayCohortSpecification;
  readonly members: readonly ReplayCohortMember[];
  readonly membershipDigestSha256: string;
  readonly consideredHistoryIds: readonly string[];
  readonly rejectedHistoryIds: readonly string[];
}

function validateSpecification(
  specification: ReplayCohortSpecification,
): ReplayCohortSpecification {
  if (
    specification.eligibilityContractVersion !== REPLAY_ELIGIBILITY_CONTRACT_VERSION
  ) {
    throw new ReplayCohortValidationError(
      `Unsupported eligibilityContractVersion: ${specification.eligibilityContractVersion}`,
    );
  }

  if (specification.ordering !== "historyId_asc") {
    throw new ReplayCohortValidationError(
      `Unsupported cohort ordering: ${specification.ordering}`,
    );
  }

  const sidecarSchemaVersion = specification.sidecarSchemaVersion.trim();
  if (sidecarSchemaVersion.length === 0) {
    throw new ReplayCohortValidationError("sidecarSchemaVersion must not be empty.");
  }

  if (
    specification.maxSampleSize !== undefined &&
    (!Number.isInteger(specification.maxSampleSize) ||
      specification.maxSampleSize < 1)
  ) {
    throw new ReplayCohortValidationError(
      "maxSampleSize must be a positive integer when provided.",
    );
  }

  if (
    specification.recordedAtFromInclusive !== undefined &&
    specification.recordedAtFromInclusive.trim().length === 0
  ) {
    throw new ReplayCohortValidationError(
      "recordedAtFromInclusive must not be empty when provided.",
    );
  }

  if (
    specification.recordedAtToExclusive !== undefined &&
    specification.recordedAtToExclusive.trim().length === 0
  ) {
    throw new ReplayCohortValidationError(
      "recordedAtToExclusive must not be empty when provided.",
    );
  }

  return Object.freeze({
    ...specification,
    sidecarSchemaVersion,
  });
}

/**
 * Pure, deterministic membership selection.
 *
 * Gate: P2K-C `replayEligible === true` via assessProjectionReplayEligibility.
 * Does not inspect prediction correctness or actual score/winner for ranking.
 */
export function selectReplayCohortMembers(input: {
  readonly histories: readonly EvaluationHistoryRecord[];
  readonly sidecarsByHistoryId: ReadonlyMap<
    string,
    ProjectionReplaySidecarRecord | undefined
  >;
  readonly specification: ReplayCohortSpecification;
}): ReplayCohortMembershipSelection {
  const specification = validateSpecification(input.specification);
  const consideredHistoryIds: string[] = [];
  const rejectedHistoryIds: string[] = [];
  const eligible: Array<{ historyId: string; matchId: string }> = [];

  for (const history of input.histories) {
    consideredHistoryIds.push(history.historyId);

    if (
      specification.recordedAtFromInclusive !== undefined &&
      history.recordedAt < specification.recordedAtFromInclusive
    ) {
      rejectedHistoryIds.push(history.historyId);
      continue;
    }

    if (
      specification.recordedAtToExclusive !== undefined &&
      history.recordedAt >= specification.recordedAtToExclusive
    ) {
      rejectedHistoryIds.push(history.historyId);
      continue;
    }

    const sidecar = input.sidecarsByHistoryId.get(history.historyId);
    const eligibility = assessProjectionReplayEligibility({
      history,
      sidecar,
      hashContext: computeProjectionReplaySidecarContentSha256,
    });

    if (!eligibility.replayEligible) {
      rejectedHistoryIds.push(history.historyId);
      continue;
    }

    if (
      sidecar === undefined ||
      sidecar.schemaVersion !== specification.sidecarSchemaVersion
    ) {
      rejectedHistoryIds.push(history.historyId);
      continue;
    }

    eligible.push({
      historyId: history.historyId,
      matchId: history.matchId,
    });
  }

  eligible.sort((left, right) =>
    left.historyId < right.historyId ? -1 : left.historyId > right.historyId ? 1 : 0,
  );

  const capped =
    specification.maxSampleSize === undefined
      ? eligible
      : eligible.slice(0, specification.maxSampleSize);

  const members = Object.freeze(
    capped.map((item, position) =>
      Object.freeze({
        historyId: item.historyId,
        matchId: item.matchId,
        position,
      }),
    ),
  );

  const membershipDigestSha256 = computeReplayCohortMembershipDigestSha256({
    specification,
    members,
  });

  consideredHistoryIds.sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  rejectedHistoryIds.sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );

  return Object.freeze({
    specification,
    members,
    membershipDigestSha256,
    consideredHistoryIds: Object.freeze(consideredHistoryIds),
    rejectedHistoryIds: Object.freeze(rejectedHistoryIds),
  });
}
