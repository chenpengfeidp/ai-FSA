/**
 * P2K-E live validation — seal offline-rebuildable Replay Cohort only.
 *
 * Gate: P2K-C replayEligible AND offline RuleResult-rebuildable.
 * Does NOT run P2K-F / P2K-G / P2K-H.
 * Does NOT mutate History / Sidecar / Production Match Script.
 */
import {
  createAndSealOfflineRebuildableReplayCohort,
  GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
  MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
  MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
  R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE,
} from "../../../../packages/analysis/dist/index.js";
import { createFasDatabase } from "../../../../packages/database/dist/src/index.js";
import {
  computeReplayCohortMembershipDigestSha256,
  PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
  REPLAY_ELIGIBILITY_CONTRACT_VERSION,
  SealedReplayCohortImmutableError,
} from "../../../../packages/statistics/dist/index.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation";

const COHORT_ID = "p2k.e.validation.bootstrap.analyzematch.v1";

async function main() {
  const db = createFasDatabase(databaseUrl);
  await db.lifecycle.ping();

  const sealedAt = "2026-08-12T14:30:00.000Z";
  const result = await createAndSealOfflineRebuildableReplayCohort({
    cohortId: COHORT_ID,
    historyRepository: db.evaluationHistoryRepository,
    sidecarRepository: db.projectionReplaySidecarRepository,
    cohortRepository: db.replayCohortRepository,
    sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
    clock: () => sealedAt,
  });

  if (!result.ok) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          error: result.error,
          consideredHistoryCount: result.consideredHistoryCount,
          p2kCEligibleButNotRebuildableCount:
            result.p2kCEligibleButNotRebuildableCount,
          exclusionReasonCounts: countReasons(result.exclusions),
        },
        null,
        2,
      ),
    );
    await db.lifecycle.disconnect();
    process.exitCode = 1;
    return;
  }

  const reloaded = await db.replayCohortRepository.findByCohortId(COHORT_ID);
  const digestMatches =
    reloaded !== undefined &&
    reloaded.membershipDigestSha256 ===
      computeReplayCohortMembershipDigestSha256({
        specification: reloaded.specification,
        members: reloaded.members,
      }) &&
    reloaded.membershipDigestSha256 === result.value.membershipDigestSha256;

  let immutabilityHeld = false;
  if (reloaded !== undefined) {
    const mutated = Object.freeze({
      ...reloaded,
      members: Object.freeze([
        Object.freeze({
          historyId: "eval-history:mutated:forbidden",
          matchId: "match-mutated-forbidden",
          position: 0,
        }),
      ]),
      membershipDigestSha256: "f".repeat(64),
    });
    try {
      await db.replayCohortRepository.save(mutated);
      immutabilityHeld = false;
    } catch (error) {
      immutabilityHeld = error instanceof SealedReplayCohortImmutableError;
    }
  }

  const idempotent = await createAndSealOfflineRebuildableReplayCohort({
    cohortId: COHORT_ID,
    historyRepository: db.evaluationHistoryRepository,
    sidecarRepository: db.projectionReplaySidecarRepository,
    cohortRepository: db.replayCohortRepository,
    sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
    clock: () => sealedAt,
  });

  const exclusionReasonCounts = countReasons(result.exclusions);
  const fixtureExclusions = result.exclusions.filter(
    (row) => row.reason === "OFFLINE_RULE_RESULT_NOT_REBUILDABLE",
  );

  const summary = {
    ok: true,
    cohortId: result.value.cohortId,
    status: result.value.status,
    selectedMemberCount: result.selectedMemberCount,
    selectedHistoryIds: result.value.members.map((member) => member.historyId),
    selectedMatchIds: result.value.members.map((member) => member.matchId),
    members: result.value.members,
    membershipDigestSha256: result.value.membershipDigestSha256,
    digestMatches,
    eligibilityContractVersion: result.value.eligibilityContractVersion,
    expectedEligibilityContractVersion: REPLAY_ELIGIBILITY_CONTRACT_VERSION,
    sidecarSchemaVersion: result.value.sidecarSchemaVersion,
    expectedSidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
    ordering: result.value.specification.ordering,
    consideredHistoryCount: result.consideredHistoryCount,
    excludedCount: result.exclusions.length,
    excludedFixtureCount: fixtureExclusions.length,
    p2kCEligibleButNotRebuildableCount: result.p2kCEligibleButNotRebuildableCount,
    exclusionReasonCounts,
    processDatabaseRoundTrip:
      reloaded !== undefined &&
      reloaded.status === "SEALED" &&
      reloaded.members.length === result.value.members.length &&
      digestMatches,
    sealedImmutabilityValidation: immutabilityHeld,
    idempotentReseal:
      idempotent.ok &&
      idempotent.value.membershipDigestSha256 ===
        result.value.membershipDigestSha256,
    candidateCProductionPromoted:
      R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE.candidateC.productionPromoted,
    productionBaselineA:
      GOVERNED_MATCH_SCRIPT_PARAMETER_SET === MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
    candidateCIsNotGoverned:
      MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET !==
      GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
    p2kFExecuted: false,
    p2kGExecuted: false,
    p2kHAuthorized: false,
  };

  console.log(JSON.stringify(summary, null, 2));

  await db.lifecycle.disconnect();

  if (
    !summary.processDatabaseRoundTrip ||
    !summary.sealedImmutabilityValidation ||
    !summary.idempotentReseal ||
    summary.selectedMemberCount < 1 ||
    summary.candidateCProductionPromoted ||
    !summary.productionBaselineA
  ) {
    process.exitCode = 1;
  }
}

function countReasons(exclusions) {
  const counts = {};
  for (const row of exclusions) {
    counts[row.reason] = (counts[row.reason] ?? 0) + 1;
  }
  return counts;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
