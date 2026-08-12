import type {
  ReplayCohort,
  ReplayCohortSpecification,
  ReplayCohortStatus,
} from "../domain/replay-cohort.js";
import {
  REPLAY_COHORT_SCHEMA_VERSION,
  REPLAY_ELIGIBILITY_CONTRACT_VERSION,
  ReplayCohortValidationError,
} from "../domain/replay-cohort.js";
import type { ReplayCohortMembershipSelection } from "./select-replay-cohort-members.js";

const COHORT_LIMITATIONS = Object.freeze([
  "P2K-E sealed Replay Cohort — membership only; no population metrics.",
  "Membership gate is P2K-C replayEligible (replayComplete && outcomeEvaluable).",
  "Membership does not depend on Candidate A/C projection results or prediction accuracy.",
  "Does not refresh Providers, Evidence, Features, Rules, or fabricate Sidecars.",
  "Baseline A remains production Match Script default; Candidate C remains NON-DEFAULT.",
]);

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ReplayCohortValidationError(`${field} must not be empty.`);
  }
  return normalized;
}

export function buildReplayCohort(input: {
  readonly cohortId: string;
  readonly status: ReplayCohortStatus;
  readonly selection: ReplayCohortMembershipSelection;
  readonly createdAt: string;
  readonly membershipCreatedAt: string;
  readonly sealedAt?: string;
}): ReplayCohort {
  const cohortId = requireNonEmpty(input.cohortId, "cohortId");
  const createdAt = requireNonEmpty(input.createdAt, "createdAt");
  const membershipCreatedAt = requireNonEmpty(
    input.membershipCreatedAt,
    "membershipCreatedAt",
  );

  if (input.status === "SEALED") {
    if (input.sealedAt === undefined || input.sealedAt.trim().length === 0) {
      throw new ReplayCohortValidationError(
        "sealedAt is required when status is SEALED.",
      );
    }
  }

  if (
    input.selection.specification.eligibilityContractVersion !==
    REPLAY_ELIGIBILITY_CONTRACT_VERSION
  ) {
    throw new ReplayCohortValidationError(
      "Cohort selection must use the P2K-C eligibility contract version.",
    );
  }

  const specification: ReplayCohortSpecification = Object.freeze({
    ...input.selection.specification,
  });

  return Object.freeze({
    cohortId,
    schemaVersion: REPLAY_COHORT_SCHEMA_VERSION,
    status: input.status,
    specification,
    eligibilityContractVersion: REPLAY_ELIGIBILITY_CONTRACT_VERSION,
    sidecarSchemaVersion: specification.sidecarSchemaVersion,
    createdAt,
    membershipCreatedAt,
    sealedAt:
      input.status === "SEALED"
        ? requireNonEmpty(input.sealedAt ?? "", "sealedAt")
        : undefined,
    members: input.selection.members,
    membershipDigestSha256: input.selection.membershipDigestSha256,
    limitations: COHORT_LIMITATIONS,
  });
}
