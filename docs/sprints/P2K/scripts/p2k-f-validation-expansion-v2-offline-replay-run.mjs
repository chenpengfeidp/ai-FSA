/**
 * P2K-F live validation — A/C offline Replay Runs on SEALED expansion v2 cohort.
 *
 * Cohort: p2k.e.validation.expansion.v2.analyzematch.v1
 * Strictly reuses P2K-F / P2K-D primitives (executeSealedCohortOfflineReplayPair,
 * runOfflineMatchScriptReplay). No new engine code.
 * Does NOT run P2K-E / P2K-G / P2K-H. No population metrics. No promotion.
 * Does NOT mutate History / Sidecar / cohort membership.
 */
import {
  executeSealedCohortOfflineReplayPair,
  GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
  MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
  MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
  R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE,
} from "../../../../packages/analysis/dist/index.js";
import { createFasDatabase } from "../../../../packages/database/dist/src/index.js";
import {
  computeReplayCohortMembershipDigestSha256,
  validateSealedCohortForOfflineRun,
} from "../../../../packages/statistics/dist/index.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation";

const COHORT_ID = "p2k.e.validation.expansion.v2.analyzematch.v1";
const EXPECTED_DIGEST =
  "03b52d71078dee7746796fd1de722e22e2a66382ea7202556299990a5714e997";
const EXPECTED_MEMBER_COUNT = 30;
const EXPECTED_MEMBERS = Object.freeze([
  "eval-history:match-p2kg-expansion-v2-10:a53e2628:5a2e3623",
  "eval-history:match-p2kg-expansion-v2-11:55422ea3:7aadf53a",
  "eval-history:match-p2kg-expansion-v2-12:020bbb60:df66dd56",
  "eval-history:match-p2kg-expansion-v2-13:445e9c8f:31281c54",
  "eval-history:match-p2kg-expansion-v2-14:e9aa5f7d:7adb4ee7",
  "eval-history:match-p2kg-expansion-v2-15:89919b0a:bc01f328",
  "eval-history:match-p2kg-expansion-v2-16:2dc19291:cc0af41c",
  "eval-history:match-p2kg-expansion-v2-17:87ef3a71:55a1a15a",
  "eval-history:match-p2kg-expansion-v2-18:124ed3fe:7418179e",
  "eval-history:match-p2kg-expansion-v2-19:aba699d7:74df99ad",
  "eval-history:match-p2kg-expansion-v2-1:e6ca0b7b:38478169",
  "eval-history:match-p2kg-expansion-v2-20:cf794ea3:e25226cd",
  "eval-history:match-p2kg-expansion-v2-21:037ab615:7b6d63d6",
  "eval-history:match-p2kg-expansion-v2-22:1992b77e:f7488821",
  "eval-history:match-p2kg-expansion-v2-23:56fb9674:fedfcb84",
  "eval-history:match-p2kg-expansion-v2-24:d59f09dc:24a2fa9f",
  "eval-history:match-p2kg-expansion-v2-25:6844ae8a:b93756ae",
  "eval-history:match-p2kg-expansion-v2-26:5f06606c:03cc2c2f",
  "eval-history:match-p2kg-expansion-v2-27:c73e94e9:e6f38222",
  "eval-history:match-p2kg-expansion-v2-28:08a7da3c:35a34038",
  "eval-history:match-p2kg-expansion-v2-29:951a9a44:b6ffaf51",
  "eval-history:match-p2kg-expansion-v2-2:e48455d5:a0152867",
  "eval-history:match-p2kg-expansion-v2-30:1e1969ab:f198214f",
  "eval-history:match-p2kg-expansion-v2-3:d7d03b9b:4e1efdce",
  "eval-history:match-p2kg-expansion-v2-4:7bddbde9:21626f87",
  "eval-history:match-p2kg-expansion-v2-5:38535889:48fc060d",
  "eval-history:match-p2kg-expansion-v2-6:239a52fd:b1413fe5",
  "eval-history:match-p2kg-expansion-v2-7:2429e3ae:fde5539d",
  "eval-history:match-p2kg-expansion-v2-8:02ce4134:e9221c77",
  "eval-history:match-p2kg-expansion-v2-9:dc0ae568:005df279",
]);
const OLD_V1_COHORT_ID = "p2k.e.validation.bootstrap.analyzematch.v1";
const OLD_V1_DIGEST =
  "abdd11ec5c230655dc61800d6f2462a3237f2acb57ca22ef23374e9d9b9bfb7c";
const OLD_V1_BASELINE_RUN_ID = "run.p2k.f.validation.bootstrap.analyzematch.v1.a";
const OLD_V1_CANDIDATE_RUN_ID = "run.p2k.f.validation.bootstrap.analyzematch.v1.c";
const OLD_RECOVERY_COHORT_ID = "p2k.e.validation.recovery.v2.analyzematch.v1";
const OLD_RECOVERY_DIGEST =
  "3b707860341fb268ac68377b7796c7c235ccd9caeb19b0ceb9b6ace76f7f6439";
const OLD_RECOVERY_BASELINE_RUN_ID =
  "run.p2k.f.validation.recovery.v2.analyzematch.v1.a";
const OLD_RECOVERY_CANDIDATE_RUN_ID =
  "run.p2k.f.validation.recovery.v2.analyzematch.v1.c";
const BASELINE_RUN_ID = "run.p2k.f.validation.expansion.v2.analyzematch.v1.a";
const CANDIDATE_RUN_ID = "run.p2k.f.validation.expansion.v2.analyzematch.v1.c";
const EXPECTED_PARAMETER_VERSION_LABEL = "projection.v3.replay";
const EXPECTED_PARAMETER_ARTIFACT_ID = "projectionParams:v3.1:matchScript";
const EXPECTED_PARAMETER_ARTIFACT_CHECKSUM = "d7b2f4fd";
const CLOCK = () => "2026-08-16T15:00:00.000Z";

function jsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function summarizeMember(result) {
  if (result.status !== "success") {
    return {
      status: result.status,
      historyId: result.historyId,
      matchId: result.matchId,
      reasonCode: result.reasonCode,
      message: result.message,
    };
  }
  return {
    status: result.status,
    historyId: result.historyId,
    matchId: result.matchId,
    matchScriptCalibrationLabel: result.matchScriptCalibrationLabel,
    isProductionDefault: result.isProductionDefault,
    productionPromoted: result.productionPromoted,
    offlineParameterArtifactId: result.offlineParameterArtifactId,
    offlineParameterArtifactChecksum: result.offlineParameterArtifactChecksum,
    projectionChecksum: result.projectionChecksum,
    sidecarContentSha256: result.sidecarContentSha256,
    historicalReplayContext: {
      contentSha256: result.historicalReplayContext.contentSha256,
      featureBundleChecksum: result.historicalReplayContext.featureBundleChecksum,
      featureModelVersion: result.historicalReplayContext.featureModelVersion,
      generatedAt: result.historicalReplayContext.generatedAt,
      schemaVersion: result.historicalReplayContext.schemaVersion,
      ruleIds: result.historicalReplayContext.ruleIds,
      parameterVersionLabel: result.historicalReplayContext.parameterVersionLabel,
      parameterArtifactId: result.historicalReplayContext.parameterArtifactId,
      parameterArtifactChecksum:
        result.historicalReplayContext.parameterArtifactChecksum,
    },
  };
}

function historicalIdentityChecks(baseline, candidate) {
  if (baseline.status !== "success" || candidate.status !== "success") {
    return {
      comparable: false,
      historyId: baseline.historyId === candidate.historyId,
      matchId: baseline.matchId === candidate.matchId,
    };
  }

  const left = baseline.historicalReplayContext;
  const right = candidate.historicalReplayContext;
  return {
    comparable: true,
    historyId: baseline.historyId === candidate.historyId,
    matchId: baseline.matchId === candidate.matchId,
    sidecarChecksum:
      baseline.sidecarContentSha256 === candidate.sidecarContentSha256,
    featureModelVersion: left.featureModelVersion === right.featureModelVersion,
    featureBundleChecksum:
      left.featureBundleChecksum === right.featureBundleChecksum,
    evidenceRefs: jsonEqual(left.evidenceRefs, right.evidenceRefs),
    features: jsonEqual(left.featureNames, right.featureNames),
    rules: jsonEqual(left.ruleIds, right.ruleIds),
    historicalParameterProvenance:
      left.parameterVersionLabel === right.parameterVersionLabel &&
      left.parameterArtifactId === right.parameterArtifactId &&
      left.parameterArtifactChecksum === right.parameterArtifactChecksum,
    expectedHistoricalParameterPin:
      left.parameterVersionLabel === EXPECTED_PARAMETER_VERSION_LABEL &&
      left.parameterArtifactId === EXPECTED_PARAMETER_ARTIFACT_ID &&
      left.parameterArtifactChecksum === EXPECTED_PARAMETER_ARTIFACT_CHECKSUM &&
      right.parameterVersionLabel === EXPECTED_PARAMETER_VERSION_LABEL &&
      right.parameterArtifactId === EXPECTED_PARAMETER_ARTIFACT_ID &&
      right.parameterArtifactChecksum === EXPECTED_PARAMETER_ARTIFACT_CHECKSUM,
  };
}

function identityAllPass(checks) {
  if (!checks.comparable) {
    return false;
  }
  return (
    checks.historyId &&
    checks.matchId &&
    checks.sidecarChecksum &&
    checks.featureModelVersion &&
    checks.featureBundleChecksum &&
    checks.evidenceRefs &&
    checks.features &&
    checks.rules &&
    checks.historicalParameterProvenance &&
    checks.expectedHistoricalParameterPin
  );
}

async function main() {
  const db = createFasDatabase(databaseUrl);
  await db.lifecycle.ping();

  const loaded = await db.replayCohortRepository.findByCohortId(COHORT_ID);
  const oldV1Before =
    await db.replayCohortRepository.findByCohortId(OLD_V1_COHORT_ID);
  const oldV1BaselineBefore = await db.replayRunRepository.findByReplayRunId(
    OLD_V1_BASELINE_RUN_ID,
  );
  const oldV1CandidateBefore = await db.replayRunRepository.findByReplayRunId(
    OLD_V1_CANDIDATE_RUN_ID,
  );
  const oldRecoveryBefore = await db.replayCohortRepository.findByCohortId(
    OLD_RECOVERY_COHORT_ID,
  );
  const oldRecoveryBaselineBefore = await db.replayRunRepository.findByReplayRunId(
    OLD_RECOVERY_BASELINE_RUN_ID,
  );
  const oldRecoveryCandidateBefore = await db.replayRunRepository.findByReplayRunId(
    OLD_RECOVERY_CANDIDATE_RUN_ID,
  );

  let cohortValidation;
  try {
    const cohort = validateSealedCohortForOfflineRun(loaded);
    const recomputed = computeReplayCohortMembershipDigestSha256({
      specification: cohort.specification,
      members: cohort.members,
    });
    const actualHistoryIds = cohort.members.map((member) => member.historyId);
    cohortValidation = {
      ok: true,
      cohortId: cohort.cohortId,
      status: cohort.status,
      memberCount: cohort.members.length,
      membershipDigestSha256: cohort.membershipDigestSha256,
      digestMatchesExpected: cohort.membershipDigestSha256 === EXPECTED_DIGEST,
      digestRecomputes: cohort.membershipDigestSha256 === recomputed,
      uniqueHistoryIds: new Set(actualHistoryIds).size === cohort.members.length,
      exactMembers:
        actualHistoryIds.length === EXPECTED_MEMBERS.length &&
        actualHistoryIds.every(
          (historyId, index) => historyId === EXPECTED_MEMBERS[index],
        ),
    };
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          phase: "cohort_validation",
          error:
            error instanceof Error
              ? { name: error.name, message: error.message, code: error.code }
              : String(error),
        },
        null,
        2,
      ),
    );
    await db.lifecycle.disconnect();
    process.exitCode = 1;
    return;
  }

  const pair = await executeSealedCohortOfflineReplayPair({
    cohortId: COHORT_ID,
    baselineReplayRunId: BASELINE_RUN_ID,
    candidateReplayRunId: CANDIDATE_RUN_ID,
    cohortRepository: db.replayCohortRepository,
    historyRepository: db.evaluationHistoryRepository,
    sidecarRepository: db.projectionReplaySidecarRepository,
    replayRunRepository: db.replayRunRepository,
    clock: CLOCK,
  });

  if (!pair.ok) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          phase: "execute_pair",
          cohortValidation,
          error: pair.error,
        },
        null,
        2,
      ),
    );
    await db.lifecycle.disconnect();
    process.exitCode = 1;
    return;
  }

  const reloadedBaseline =
    await db.replayRunRepository.findByReplayRunId(BASELINE_RUN_ID);
  const reloadedCandidate =
    await db.replayRunRepository.findByReplayRunId(CANDIDATE_RUN_ID);
  const cohortAfter = await db.replayCohortRepository.findByCohortId(COHORT_ID);
  const oldV1After =
    await db.replayCohortRepository.findByCohortId(OLD_V1_COHORT_ID);
  const oldV1BaselineAfter = await db.replayRunRepository.findByReplayRunId(
    OLD_V1_BASELINE_RUN_ID,
  );
  const oldV1CandidateAfter = await db.replayRunRepository.findByReplayRunId(
    OLD_V1_CANDIDATE_RUN_ID,
  );
  const oldRecoveryAfter = await db.replayCohortRepository.findByCohortId(
    OLD_RECOVERY_COHORT_ID,
  );
  const oldRecoveryBaselineAfter = await db.replayRunRepository.findByReplayRunId(
    OLD_RECOVERY_BASELINE_RUN_ID,
  );
  const oldRecoveryCandidateAfter = await db.replayRunRepository.findByReplayRunId(
    OLD_RECOVERY_CANDIDATE_RUN_ID,
  );

  const pairChecks = pair.pairs.map((row) => {
    const bothSuccess =
      row.baseline.status === "success" && row.candidate.status === "success";
    const identity = historicalIdentityChecks(row.baseline, row.candidate);
    const labelsDiffer =
      bothSuccess &&
      row.baseline.matchScriptCalibrationLabel !==
        row.candidate.matchScriptCalibrationLabel;
    const offlineArtifactsDiffer =
      bothSuccess &&
      (row.baseline.offlineParameterArtifactId !==
        row.candidate.offlineParameterArtifactId ||
        row.baseline.offlineParameterArtifactChecksum !==
          row.candidate.offlineParameterArtifactChecksum);
    return {
      position: row.position,
      historyId: row.historyId,
      matchId: row.matchId,
      sameHistoricalContext: row.sameHistoricalContext,
      identity,
      identityAllPass: identityAllPass(identity),
      bothSuccess,
      labelsDiffer,
      offlineArtifactsDiffer,
      baseline: summarizeMember(row.baseline),
      candidate: summarizeMember(row.candidate),
    };
  });

  const pairedSuccessCount = pairChecks.filter(
    (row) => row.bothSuccess && row.sameHistoricalContext && row.identityAllPass,
  ).length;
  const sameContextFailures = pairChecks.filter(
    (row) => row.bothSuccess && (!row.sameHistoricalContext || !row.identityAllPass),
  );
  const failureReasons = pairChecks.flatMap((row) => {
    const reasons = [];
    if (row.baseline.status !== "success") {
      reasons.push({
        role: "baseline",
        historyId: row.historyId,
        matchId: row.matchId,
        reasonCode: row.baseline.reasonCode,
        message: row.baseline.message,
      });
    }
    if (row.candidate.status !== "success") {
      reasons.push({
        role: "candidate",
        historyId: row.historyId,
        matchId: row.matchId,
        reasonCode: row.candidate.reasonCode,
        message: row.candidate.message,
      });
    }
    return reasons;
  });

  const summary = {
    ok:
      pair.baseline.failureCount === 0 &&
      pair.candidate.failureCount === 0 &&
      sameContextFailures.length === 0 &&
      pairedSuccessCount === cohortValidation.memberCount &&
      cohortValidation.digestMatchesExpected &&
      cohortValidation.exactMembers &&
      reloadedBaseline !== undefined &&
      reloadedCandidate !== undefined,
    cohortValidation,
    baseline: {
      replayRunId: pair.baseline.replayRunId,
      cohortId: pair.baseline.cohortId,
      membershipDigestSha256: pair.baseline.membershipDigestSha256,
      matchScriptCalibrationLabel: pair.baseline.matchScriptCalibrationLabel,
      isProductionDefault: pair.baseline.isProductionDefault,
      productionPromoted: pair.baseline.productionPromoted,
      status: pair.baseline.status,
      memberCount: pair.baseline.memberCount,
      successCount: pair.baseline.successCount,
      failureCount: pair.baseline.failureCount,
      schemaVersion: pair.baseline.schemaVersion,
      createdAt: pair.baseline.createdAt,
      completedAt: pair.baseline.completedAt,
      limitations: pair.baseline.limitations,
      sampleParameterProvenance:
        pair.baseline.results[0]?.status === "success"
          ? {
              historical: {
                parameterVersionLabel:
                  pair.baseline.results[0].historicalReplayContext
                    .parameterVersionLabel,
                parameterArtifactId:
                  pair.baseline.results[0].historicalReplayContext
                    .parameterArtifactId,
                parameterArtifactChecksum:
                  pair.baseline.results[0].historicalReplayContext
                    .parameterArtifactChecksum,
              },
              offlineParameterArtifactId:
                pair.baseline.results[0].offlineParameterArtifactId,
              offlineParameterArtifactChecksum:
                pair.baseline.results[0].offlineParameterArtifactChecksum,
            }
          : null,
    },
    candidate: {
      replayRunId: pair.candidate.replayRunId,
      cohortId: pair.candidate.cohortId,
      membershipDigestSha256: pair.candidate.membershipDigestSha256,
      matchScriptCalibrationLabel: pair.candidate.matchScriptCalibrationLabel,
      isProductionDefault: pair.candidate.isProductionDefault,
      productionPromoted: pair.candidate.productionPromoted,
      status: pair.candidate.status,
      memberCount: pair.candidate.memberCount,
      successCount: pair.candidate.successCount,
      failureCount: pair.candidate.failureCount,
      schemaVersion: pair.candidate.schemaVersion,
      createdAt: pair.candidate.createdAt,
      completedAt: pair.candidate.completedAt,
      limitations: pair.candidate.limitations,
      sampleParameterProvenance:
        pair.candidate.results[0]?.status === "success"
          ? {
              historical: {
                parameterVersionLabel:
                  pair.candidate.results[0].historicalReplayContext
                    .parameterVersionLabel,
                parameterArtifactId:
                  pair.candidate.results[0].historicalReplayContext
                    .parameterArtifactId,
                parameterArtifactChecksum:
                  pair.candidate.results[0].historicalReplayContext
                    .parameterArtifactChecksum,
              },
              offlineParameterArtifactId:
                pair.candidate.results[0].offlineParameterArtifactId,
              offlineParameterArtifactChecksum:
                pair.candidate.results[0].offlineParameterArtifactChecksum,
            }
          : null,
    },
    pairedSuccessCount,
    sameHistoricalContextAll:
      sameContextFailures.length === 0 &&
      pairChecks.every((row) => !row.bothSuccess || row.sameHistoricalContext),
    identityAllPass:
      sameContextFailures.length === 0 &&
      pairChecks.every((row) => !row.bothSuccess || row.identityAllPass),
    labelsAlwaysDifferWhenSuccess: pairChecks.every(
      (row) => !row.bothSuccess || row.labelsDiffer,
    ),
    offlineArtifactsAlwaysDifferWhenSuccess: pairChecks.every(
      (row) => !row.bothSuccess || row.offlineArtifactsDiffer,
    ),
    failureReasons,
    pairs: pairChecks,
    postgresRoundTrip: {
      baselineReloaded: reloadedBaseline !== undefined,
      candidateReloaded: reloadedCandidate !== undefined,
      baselineStatus: reloadedBaseline?.status,
      candidateStatus: reloadedCandidate?.status,
      baselineSuccessCount: reloadedBaseline?.successCount,
      candidateSuccessCount: reloadedCandidate?.successCount,
      baselineFailureCount: reloadedBaseline?.failureCount,
      candidateFailureCount: reloadedCandidate?.failureCount,
      baselineMemberCount: reloadedBaseline?.memberCount,
      candidateMemberCount: reloadedCandidate?.memberCount,
      baselineDigest: reloadedBaseline?.membershipDigestSha256,
      candidateDigest: reloadedCandidate?.membershipDigestSha256,
    },
    cohortUntouched: {
      digestUnchanged: cohortAfter?.membershipDigestSha256 === EXPECTED_DIGEST,
      statusUnchanged: cohortAfter?.status === "SEALED",
      memberCountUnchanged: cohortAfter?.members.length === EXPECTED_MEMBER_COUNT,
    },
    oldV1Untouched: {
      cohortId: OLD_V1_COHORT_ID,
      existedBefore: oldV1Before !== undefined,
      existedAfter: oldV1After !== undefined,
      status: oldV1After?.status,
      digestUnchanged:
        oldV1After?.membershipDigestSha256 === OLD_V1_DIGEST &&
        oldV1Before?.membershipDigestSha256 === OLD_V1_DIGEST,
      memberCountUnchanged:
        oldV1Before?.members.length === oldV1After?.members.length,
      baselineRunUntouched:
        oldV1BaselineBefore?.replayRunId === oldV1BaselineAfter?.replayRunId &&
        oldV1BaselineBefore?.status === oldV1BaselineAfter?.status,
      candidateRunUntouched:
        oldV1CandidateBefore?.replayRunId === oldV1CandidateAfter?.replayRunId &&
        oldV1CandidateBefore?.status === oldV1CandidateAfter?.status,
    },
    oldRecoveryV2Untouched: {
      cohortId: OLD_RECOVERY_COHORT_ID,
      existedBefore: oldRecoveryBefore !== undefined,
      existedAfter: oldRecoveryAfter !== undefined,
      status: oldRecoveryAfter?.status,
      digestUnchanged:
        oldRecoveryAfter?.membershipDigestSha256 === OLD_RECOVERY_DIGEST &&
        oldRecoveryBefore?.membershipDigestSha256 === OLD_RECOVERY_DIGEST,
      memberCountUnchanged:
        oldRecoveryBefore?.members.length === oldRecoveryAfter?.members.length,
      baselineRunUntouched:
        oldRecoveryBaselineBefore?.replayRunId ===
          oldRecoveryBaselineAfter?.replayRunId &&
        oldRecoveryBaselineBefore?.status === oldRecoveryBaselineAfter?.status,
      candidateRunUntouched:
        oldRecoveryCandidateBefore?.replayRunId ===
          oldRecoveryCandidateAfter?.replayRunId &&
        oldRecoveryCandidateBefore?.status === oldRecoveryCandidateAfter?.status,
    },
    governance: {
      candidateCProductionPromoted:
        R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE.candidateC.productionPromoted,
      productionBaselineA:
        GOVERNED_MATCH_SCRIPT_PARAMETER_SET ===
        MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
      candidateCIsNotGoverned:
        MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET !==
        GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
      cohortMutated: false,
      providerRefresh: false,
      evidenceFeatureRuleRegeneration: false,
      p2kEReexecuted: false,
      p2kGExecuted: false,
      p2kHAuthorized: false,
      populationMetricsComputed: false,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
  await db.lifecycle.disconnect();
  if (!summary.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
