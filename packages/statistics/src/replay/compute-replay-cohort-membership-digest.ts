import { createHash } from "node:crypto";

import type {
  ReplayCohortMember,
  ReplayCohortSpecification,
} from "../domain/replay-cohort.js";
import { REPLAY_COHORT_SCHEMA_VERSION } from "../domain/replay-cohort.js";

/** Canonical JSON for membership digest (stable key order). */
export function canonicalReplayCohortMembershipJson(input: {
  readonly specification: ReplayCohortSpecification;
  readonly members: readonly ReplayCohortMember[];
}): string {
  return JSON.stringify({
    schemaVersion: REPLAY_COHORT_SCHEMA_VERSION,
    eligibilityContractVersion: input.specification.eligibilityContractVersion,
    sidecarSchemaVersion: input.specification.sidecarSchemaVersion,
    ordering: input.specification.ordering,
    maxSampleSize: input.specification.maxSampleSize ?? null,
    recordedAtFromInclusive: input.specification.recordedAtFromInclusive ?? null,
    recordedAtToExclusive: input.specification.recordedAtToExclusive ?? null,
    members: input.members.map((member) => ({
      position: member.position,
      historyId: member.historyId,
      matchId: member.matchId,
    })),
  });
}

/**
 * SHA-256 hex over canonical ordered membership.
 * Same hashing style as Projection Replay Sidecar content digests.
 */
export function computeReplayCohortMembershipDigestSha256(input: {
  readonly specification: ReplayCohortSpecification;
  readonly members: readonly ReplayCohortMember[];
}): string {
  return createHash("sha256")
    .update(canonicalReplayCohortMembershipJson(input), "utf8")
    .digest("hex");
}
