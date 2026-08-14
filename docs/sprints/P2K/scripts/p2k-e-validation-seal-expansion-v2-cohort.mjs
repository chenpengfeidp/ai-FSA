/**
 * P2K-E live validation — NEW SEALED cohort from match-p2kg-expansion-v2-* only.
 *
 * Gates: P2K-C replayEligible AND independent offlineReplayExecutable
 * (createAndSealOfflineExecutableReplayCohort — unchanged orchestration).
 * Does NOT mutate old v1 / recovery-v2 cohorts, History, or Sidecars.
 * Does NOT run P2K-F / P2K-G / P2K-H.
 */
import {
  createAndSealOfflineExecutableReplayCohort,
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

const NEW_COHORT_ID = "p2k.e.validation.expansion.v2.analyzematch.v1";
const MATCH_ID_PREFIX = "match-p2kg-expansion-v2-";
const OLD_V1_COHORT_ID = "p2k.e.validation.bootstrap.analyzematch.v1";
const OLD_V1_DIGEST =
  "abdd11ec5c230655dc61800d6f2462a3237f2acb57ca22ef23374e9d9b9bfb7c";
const RECOVERY_V2_COHORT_ID = "p2k.e.validation.recovery.v2.analyzematch.v1";
const RECOVERY_V2_DIGEST =
  "3b707860341fb268ac68377b7796c7c235ccd9caeb19b0ceb9b6ace76f7f6439";
const SEALED_AT = "2026-08-16T14:30:00.000Z";

function countReasons(exclusions) {
  const counts = {};
  for (const row of exclusions) {
    counts[row.reason] = (counts[row.reason] ?? 0) + 1;
  }
  return counts;
}

async function main() {
  const db = createFasDatabase(databaseUrl);
  await db.lifecycle.ping();

  const oldV1Before =
    await db.replayCohortRepository.findByCohortId(OLD_V1_COHORT_ID);
  const oldRecoveryBefore =
    await db.replayCohortRepository.findByCohortId(RECOVERY_V2_COHORT_ID);

  const result = await createAndSealOfflineExecutableReplayCohort({
    cohortId: NEW_COHORT_ID,
    matchIdPrefix: MATCH_ID_PREFIX,
    historyRepository: db.evaluationHistoryRepository,
    sidecarRepository: db.projectionReplaySidecarRepository,
    cohortRepository: db.replayCohortRepository,
    sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
    clock: () => SEALED_AT,
  });

  if (!result.ok) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          error: result.error,
          consideredHistoryCount: result.consideredHistoryCount,
          namespaceHistoryCount: result.namespaceHistoryCount,
          p2kCEligibleCount: result.p2kCEligibleCount,
          offlineReplayExecutableCount: result.offlineReplayExecutableCount,
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

  const reloaded = await db.replayCohortRepository.findByCohortId(NEW_COHORT_ID);
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

  const idempotent = await createAndSealOfflineExecutableReplayCohort({
    cohortId: NEW_COHORT_ID,
    matchIdPrefix: MATCH_ID_PREFIX,
    historyRepository: db.evaluationHistoryRepository,
    sidecarRepository: db.projectionReplaySidecarRepository,
    cohortRepository: db.replayCohortRepository,
    sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
    clock: () => SEALED_AT,
  });

  const oldV1After =
    await db.replayCohortRepository.findByCohortId(OLD_V1_COHORT_ID);
  const oldRecoveryAfter =
    await db.replayCohortRepository.findByCohortId(RECOVERY_V2_COHORT_ID);

  const membersOutsideNamespace = result.value.members.filter(
    (member) => !member.matchId.startsWith(MATCH_ID_PREFIX),
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
    namespaceHistoryCount: result.namespaceHistoryCount,
    p2kCEligibleCount: result.p2kCEligibleCount,
    offlineReplayExecutableCount: result.offlineReplayExecutableCount,
    excludedCount: result.exclusions.length,
    exclusionReasonCounts: countReasons(result.exclusions),
    membersOutsideNamespace: membersOutsideNamespace.length,
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
    oldV1Untouched: {
      cohortId: OLD_V1_COHORT_ID,
      existedBefore: oldV1Before !== undefined,
      existedAfter: oldV1After !== undefined,
      status: oldV1After?.status,
      digestUnchanged:
        oldV1After?.membershipDigestSha256 === OLD_V1_DIGEST &&
        oldV1Before?.membershipDigestSha256 === oldV1After?.membershipDigestSha256,
      memberCountUnchanged:
        oldV1Before?.members.length === oldV1After?.members.length,
    },
    oldRecoveryV2Untouched: {
      cohortId: RECOVERY_V2_COHORT_ID,
      existedBefore: oldRecoveryBefore !== undefined,
      existedAfter: oldRecoveryAfter !== undefined,
      status: oldRecoveryAfter?.status,
      digestUnchanged:
        oldRecoveryAfter?.membershipDigestSha256 === RECOVERY_V2_DIGEST &&
        oldRecoveryBefore?.membershipDigestSha256 ===
          oldRecoveryAfter?.membershipDigestSha256,
      memberCountUnchanged:
        oldRecoveryBefore?.members.length === oldRecoveryAfter?.members.length,
    },
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
    summary.membersOutsideNamespace !== 0 ||
    !summary.oldV1Untouched.digestUnchanged ||
    !summary.oldRecoveryV2Untouched.digestUnchanged ||
    summary.candidateCProductionPromoted ||
    !summary.productionBaselineA
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
