/**
 * P2K-F live validation — A/C offline Replay Runs on SEALED bootstrap cohort.
 *
 * Cohort: p2k.e.validation.bootstrap.analyzematch.v1
 * Does NOT run P2K-G / P2K-H.
 * Does NOT mutate History / Sidecar / cohort membership.
 * Does NOT compute population metrics.
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

const COHORT_ID = "p2k.e.validation.bootstrap.analyzematch.v1";
const EXPECTED_DIGEST =
  "abdd11ec5c230655dc61800d6f2462a3237f2acb57ca22ef23374e9d9b9bfb7c";
const BASELINE_RUN_ID = "run.p2k.f.validation.bootstrap.analyzematch.v1.a";
const CANDIDATE_RUN_ID = "run.p2k.f.validation.bootstrap.analyzematch.v1.c";
const CLOCK = () => "2026-08-13T07:00:00.000Z";

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
    historicalContextIdentity: {
      contentSha256: result.historicalReplayContext.contentSha256,
      featureBundleChecksum: result.historicalReplayContext.featureBundleChecksum,
      featureModelVersion: result.historicalReplayContext.featureModelVersion,
      generatedAt: result.historicalReplayContext.generatedAt,
      schemaVersion: result.historicalReplayContext.schemaVersion,
      ruleIds: result.historicalReplayContext.ruleIds,
    },
  };
}

async function main() {
  const db = createFasDatabase(databaseUrl);
  await db.lifecycle.ping();

  const loaded = await db.replayCohortRepository.findByCohortId(COHORT_ID);
  let cohortValidation;
  try {
    const cohort = validateSealedCohortForOfflineRun(loaded);
    const recomputed = computeReplayCohortMembershipDigestSha256({
      specification: cohort.specification,
      members: cohort.members,
    });
    cohortValidation = {
      ok: true,
      cohortId: cohort.cohortId,
      status: cohort.status,
      memberCount: cohort.members.length,
      membershipDigestSha256: cohort.membershipDigestSha256,
      digestMatchesExpected: cohort.membershipDigestSha256 === EXPECTED_DIGEST,
      digestRecomputes: cohort.membershipDigestSha256 === recomputed,
      uniqueHistoryIds:
        new Set(cohort.members.map((member) => member.historyId)).size ===
        cohort.members.length,
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

  const pairChecks = pair.pairs.map((row) => {
    const bothSuccess =
      row.baseline.status === "success" && row.candidate.status === "success";
    const labelsDiffer =
      bothSuccess &&
      row.baseline.matchScriptCalibrationLabel !==
        row.candidate.matchScriptCalibrationLabel;
    const artifactsDiffer =
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
      bothSuccess,
      labelsDiffer,
      artifactsDiffer,
      baseline: summarizeMember(row.baseline),
      candidate: summarizeMember(row.candidate),
    };
  });

  const pairedSuccessCount = pairChecks.filter(
    (row) => row.bothSuccess && row.sameHistoricalContext,
  ).length;
  const sameContextFailures = pairChecks.filter(
    (row) => row.bothSuccess && !row.sameHistoricalContext,
  );

  const summary = {
    ok:
      pair.baseline.failureCount === 0 &&
      pair.candidate.failureCount === 0 &&
      sameContextFailures.length === 0 &&
      pairedSuccessCount === cohortValidation.memberCount &&
      cohortValidation.digestMatchesExpected &&
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
      createdAt: pair.baseline.createdAt,
      completedAt: pair.baseline.completedAt,
      sampleParameterProvenance:
        pair.baseline.results[0]?.status === "success"
          ? {
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
      createdAt: pair.candidate.createdAt,
      completedAt: pair.candidate.completedAt,
      sampleParameterProvenance:
        pair.candidate.results[0]?.status === "success"
          ? {
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
    labelsAlwaysDifferWhenSuccess: pairChecks.every(
      (row) => !row.bothSuccess || row.labelsDiffer,
    ),
    artifactsAlwaysDifferWhenSuccess: pairChecks.every(
      (row) => !row.bothSuccess || row.artifactsDiffer,
    ),
    pairs: pairChecks,
    postgresRoundTrip: {
      baselineReloaded: reloadedBaseline !== undefined,
      candidateReloaded: reloadedCandidate !== undefined,
      baselineStatus: reloadedBaseline?.status,
      candidateStatus: reloadedCandidate?.status,
      baselineSuccessCount: reloadedBaseline?.successCount,
      candidateSuccessCount: reloadedCandidate?.successCount,
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
