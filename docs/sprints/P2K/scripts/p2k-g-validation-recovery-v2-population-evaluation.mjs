/**
 * P2K-G live validation — Population Evaluation on Recovery V2 dataset ONLY.
 *
 * Consumes existing durable artifacts:
 * - SEALED cohort: p2k.e.validation.recovery.v2.analyzematch.v1
 * - Baseline A run: run.p2k.f.validation.recovery.v2.analyzematch.v1.a
 * - Candidate C run: run.p2k.f.validation.recovery.v2.analyzematch.v1.c
 *
 * Does NOT:
 * - re-execute P2K-E / P2K-F
 * - mutate History / Sidecar / cohort membership
 * - regenerate Replay Runs
 * - compute promotion / start P2K-H
 * - claim Candidate C is better (n=6 descriptive only)
 */
import {
  GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
  MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
  MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
  R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE,
} from "../../../../packages/analysis/dist/index.js";
import { createFasDatabase } from "../../../../packages/database/dist/src/index.js";
import {
  computeReplayCohortMembershipDigestSha256,
  computeSealedCohortPopulationEvaluation,
  validateSealedCohortForOfflineRun,
} from "../../../../packages/statistics/dist/index.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation";

const COHORT_ID = "p2k.e.validation.recovery.v2.analyzematch.v1";
const EXPECTED_DIGEST =
  "3b707860341fb268ac68377b7796c7c235ccd9caeb19b0ceb9b6ace76f7f6439";
const BASELINE_RUN_ID = "run.p2k.f.validation.recovery.v2.analyzematch.v1.a";
const CANDIDATE_RUN_ID = "run.p2k.f.validation.recovery.v2.analyzematch.v1.c";
const EVALUATION_RUN_ID = "eval.p2k.g.validation.recovery.v2.analyzematch.v1";
const EXPECTED_MEMBERS = Object.freeze([
  "eval-history:match-p2kg-recovery-v2-1:1d7c579c:ffb31e47",
  "eval-history:match-p2kg-recovery-v2-2:47be3bd9:595aa351",
  "eval-history:match-p2kg-recovery-v2-3:02dd458e:5f66a6e0",
  "eval-history:match-p2kg-recovery-v2-4:9b7944b7:69df5c14",
  "eval-history:match-p2kg-recovery-v2-5:7ed08122:054376cc",
  "eval-history:match-p2kg-recovery-v2-6:53db7b2b:5e9048db",
]);
const OLD_V1_COHORT_ID = "p2k.e.validation.bootstrap.analyzematch.v1";
const OLD_V1_DIGEST =
  "abdd11ec5c230655dc61800d6f2462a3237f2acb57ca22ef23374e9d9b9bfb7c";
const COMPUTED_AT = "2026-08-14T03:00:00.000Z";

function metricView(row) {
  return {
    availability: row.availability,
    value: row.value ?? null,
    hitCount: row.hitCount ?? null,
    sampleSize: row.sampleSize,
    unavailableReason: row.unavailableReason ?? null,
  };
}

function comparisonView(row) {
  return {
    metricId: row.metricId,
    metricLabel: row.metricLabel,
    baseline: metricView(row.baseline),
    candidate: metricView(row.candidate),
    deltaCMinusA: row.delta ?? null,
  };
}

function findComparison(evaluation, metricId) {
  const row = evaluation.comparisons.find((entry) => entry.metricId === metricId);
  if (row === undefined) {
    throw new Error(`Missing comparison metricId=${metricId}`);
  }
  return comparisonView(row);
}

async function main() {
  const db = createFasDatabase(databaseUrl);
  await db.lifecycle.ping();

  const loadedCohort = await db.replayCohortRepository.findByCohortId(COHORT_ID);
  const baselineBefore =
    await db.replayRunRepository.findByReplayRunId(BASELINE_RUN_ID);
  const candidateBefore =
    await db.replayRunRepository.findByReplayRunId(CANDIDATE_RUN_ID);
  const oldV1Before =
    await db.replayCohortRepository.findByCohortId(OLD_V1_COHORT_ID);

  let cohortValidation;
  try {
    const cohort = validateSealedCohortForOfflineRun(loadedCohort);
    const recomputed = computeReplayCohortMembershipDigestSha256({
      specification: cohort.specification,
      members: cohort.members,
    });
    const historyIds = cohort.members.map((member) => member.historyId);
    cohortValidation = {
      ok: true,
      cohortId: cohort.cohortId,
      status: cohort.status,
      memberCount: cohort.members.length,
      membershipDigestSha256: cohort.membershipDigestSha256,
      digestMatchesExpected: cohort.membershipDigestSha256 === EXPECTED_DIGEST,
      digestRecomputes: cohort.membershipDigestSha256 === recomputed,
      exactMembers:
        historyIds.length === EXPECTED_MEMBERS.length &&
        historyIds.every(
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

  if (
    baselineBefore === undefined ||
    candidateBefore === undefined ||
    !cohortValidation.digestMatchesExpected ||
    !cohortValidation.exactMembers
  ) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          phase: "precondition",
          cohortValidation,
          baselinePresent: baselineBefore !== undefined,
          candidatePresent: candidateBefore !== undefined,
          message:
            "Recovery V2 SEALED cohort + durable A/C Replay Runs must already exist. P2K-G does not regenerate them.",
        },
        null,
        2,
      ),
    );
    await db.lifecycle.disconnect();
    process.exitCode = 1;
    return;
  }

  const runPreconditions = {
    baseline: {
      replayRunId: baselineBefore.replayRunId,
      cohortId: baselineBefore.cohortId,
      membershipDigestSha256: baselineBefore.membershipDigestSha256,
      matchScriptCalibrationLabel: baselineBefore.matchScriptCalibrationLabel,
      isProductionDefault: baselineBefore.isProductionDefault,
      productionPromoted: baselineBefore.productionPromoted,
      status: baselineBefore.status,
      successCount: baselineBefore.successCount,
      failureCount: baselineBefore.failureCount,
      memberCount: baselineBefore.memberCount,
    },
    candidate: {
      replayRunId: candidateBefore.replayRunId,
      cohortId: candidateBefore.cohortId,
      membershipDigestSha256: candidateBefore.membershipDigestSha256,
      matchScriptCalibrationLabel: candidateBefore.matchScriptCalibrationLabel,
      isProductionDefault: candidateBefore.isProductionDefault,
      productionPromoted: candidateBefore.productionPromoted,
      status: candidateBefore.status,
      successCount: candidateBefore.successCount,
      failureCount: candidateBefore.failureCount,
      memberCount: candidateBefore.memberCount,
    },
  };

  const evaluation = await computeSealedCohortPopulationEvaluation({
    evaluationRunId: EVALUATION_RUN_ID,
    cohortId: COHORT_ID,
    baselineReplayRunId: BASELINE_RUN_ID,
    candidateReplayRunId: CANDIDATE_RUN_ID,
    computedAt: COMPUTED_AT,
    cohortRepository: db.replayCohortRepository,
    replayRunRepository: db.replayRunRepository,
    historyRepository: db.evaluationHistoryRepository,
    populationEvaluationRepository: db.populationEvaluationRepository,
  });

  if (!evaluation.ok) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          phase: "population_evaluation",
          cohortValidation,
          runPreconditions,
          error: {
            code: evaluation.error.code,
            message: evaluation.error.message,
          },
        },
        null,
        2,
      ),
    );
    await db.lifecycle.disconnect();
    process.exitCode = 1;
    return;
  }

  const reloaded =
    await db.populationEvaluationRepository.findByEvaluationRunId(EVALUATION_RUN_ID);
  const baselineAfter =
    await db.replayRunRepository.findByReplayRunId(BASELINE_RUN_ID);
  const candidateAfter =
    await db.replayRunRepository.findByReplayRunId(CANDIDATE_RUN_ID);
  const cohortAfter = await db.replayCohortRepository.findByCohortId(COHORT_ID);
  const oldV1After =
    await db.replayCohortRepository.findByCohortId(OLD_V1_COHORT_ID);

  const value = evaluation.value;
  const metrics = {
    winnerAccuracy: findComparison(value, "winnerAccuracy"),
    exactScoreAccuracy: findComparison(value, "exactScoreAccuracy"),
    goalRangeAccuracy: findComparison(value, "goalRangeAccuracy"),
    bttsAccuracy: findComparison(value, "bttsAccuracy"),
    overUnderAccuracy: findComparison(value, "overUnderAccuracy"),
    brierScore: findComparison(value, "brierScore"),
    expectedCalibrationError: findComparison(value, "expectedCalibrationError"),
    confidenceCorrelation: findComparison(value, "confidenceCorrelation"),
  };

  const winnerBreakdown = {
    actualHome: comparisonView(value.winnerBreakdown.actualHome),
    actualDraw: comparisonView(value.winnerBreakdown.actualDraw),
    actualAway: comparisonView(value.winnerBreakdown.actualAway),
  };

  const noAvailableUndefined = [
    ...value.comparisons,
    value.winnerBreakdown.actualHome,
    value.winnerBreakdown.actualDraw,
    value.winnerBreakdown.actualAway,
  ].every((row) => {
    const check = (side) =>
      !(side.availability === "available" && side.value === undefined);
    return check(row.baseline) && check(row.candidate);
  });

  const postgresRoundTripIdentical =
    reloaded !== undefined &&
    reloaded.checksum === value.checksum &&
    reloaded.evaluationRunId === value.evaluationRunId &&
    reloaded.cohortId === value.cohortId &&
    reloaded.membershipDigestSha256 === value.membershipDigestSha256 &&
    reloaded.baselineReplayRunId === value.baselineReplayRunId &&
    reloaded.candidateReplayRunId === value.candidateReplayRunId &&
    reloaded.coverage.finalEvaluationSampleSize ===
      value.coverage.finalEvaluationSampleSize &&
    reloaded.coverage.pairedSuccessfulCount ===
      value.coverage.pairedSuccessfulCount &&
    reloaded.candidateCProductionPromoted === value.candidateCProductionPromoted &&
    reloaded.productionMatchScriptUnchanged ===
      value.productionMatchScriptUnchanged &&
    reloaded.comparisons.length === value.comparisons.length;

  const summary = {
    ok:
      postgresRoundTripIdentical &&
      cohortValidation.digestMatchesExpected &&
      cohortValidation.exactMembers &&
      value.coverage.pairedSuccessfulCount === 6 &&
      value.coverage.finalEvaluationSampleSize === 6 &&
      value.candidateCProductionPromoted === false &&
      value.productionMatchScriptUnchanged === true &&
      value.statisticalSignificanceSupported === false &&
      noAvailableUndefined,
    evaluationRunId: value.evaluationRunId,
    schemaVersion: value.schemaVersion,
    cohortId: value.cohortId,
    membershipDigestSha256: value.membershipDigestSha256,
    baselineReplayRunId: value.baselineReplayRunId,
    candidateReplayRunId: value.candidateReplayRunId,
    baselineCalibrationLabel: value.baselineCalibrationLabel,
    candidateCalibrationLabel: value.candidateCalibrationLabel,
    coverage: value.coverage,
    metrics,
    winnerBreakdown,
    checksum: value.checksum,
    createdAt: value.createdAt,
    limitations: value.limitations,
    candidateCProductionPromoted: value.candidateCProductionPromoted,
    productionMatchScriptUnchanged: value.productionMatchScriptUnchanged,
    statisticalSignificanceSupported: value.statisticalSignificanceSupported,
    noAvailableUndefined,
    postgresRoundTrip: {
      reloaded: reloaded !== undefined,
      identical: postgresRoundTripIdentical,
      reloadedChecksum: reloaded?.checksum,
      checksumMatches: reloaded?.checksum === value.checksum,
    },
    durableInputsUntouched: {
      cohortDigestUnchanged: cohortAfter?.membershipDigestSha256 === EXPECTED_DIGEST,
      cohortStatusUnchanged: cohortAfter?.status === "SEALED",
      baselineSuccessUnchanged: baselineAfter?.successCount === 6,
      candidateSuccessUnchanged: candidateAfter?.successCount === 6,
      baselineFailureUnchanged: baselineAfter?.failureCount === 0,
      candidateFailureUnchanged: candidateAfter?.failureCount === 0,
    },
    oldV1Untouched: {
      cohortId: OLD_V1_COHORT_ID,
      existedBefore: oldV1Before !== undefined,
      existedAfter: oldV1After !== undefined,
      digestUnchanged:
        oldV1Before?.membershipDigestSha256 === OLD_V1_DIGEST &&
        oldV1After?.membershipDigestSha256 === OLD_V1_DIGEST,
      status: oldV1After?.status,
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
      descriptiveOnlyNEquals6: true,
      statisticalSignificanceClaimed: false,
      candidateCBetterClaimed: false,
      p2kEReexecuted: false,
      p2kFReexecuted: false,
      p2kHAuthorized: false,
      historySidecarMutated: false,
      providerRefresh: false,
      evidenceFeatureRuleRegeneration: false,
    },
    machineReadable: {
      aSuccess: baselineBefore.successCount,
      aFailure: baselineBefore.failureCount,
      cSuccess: candidateBefore.successCount,
      cFailure: candidateBefore.failureCount,
      pairedSample: value.coverage.finalEvaluationSampleSize,
      winnerAccuracyA: metrics.winnerAccuracy.baseline.value,
      winnerAccuracyC: metrics.winnerAccuracy.candidate.value,
      winnerDelta: metrics.winnerAccuracy.deltaCMinusA,
      exactScoreA: metrics.exactScoreAccuracy.baseline.value,
      exactScoreC: metrics.exactScoreAccuracy.candidate.value,
      exactScoreDelta: metrics.exactScoreAccuracy.deltaCMinusA,
      goalRangeA: metrics.goalRangeAccuracy.baseline.value,
      goalRangeC: metrics.goalRangeAccuracy.candidate.value,
      goalRangeDelta: metrics.goalRangeAccuracy.deltaCMinusA,
      bttsA: metrics.bttsAccuracy.baseline.value,
      bttsC: metrics.bttsAccuracy.candidate.value,
      bttsDelta: metrics.bttsAccuracy.deltaCMinusA,
      ouA: metrics.overUnderAccuracy.baseline.value,
      ouC: metrics.overUnderAccuracy.candidate.value,
      ouDelta: metrics.overUnderAccuracy.deltaCMinusA,
      brierA: metrics.brierScore.baseline.value,
      brierC: metrics.brierScore.candidate.value,
      brierDelta: metrics.brierScore.deltaCMinusA,
      eceA: metrics.expectedCalibrationError.baseline.value,
      eceC: metrics.expectedCalibrationError.candidate.value,
      eceDelta: metrics.expectedCalibrationError.deltaCMinusA,
      confidenceCorrA: metrics.confidenceCorrelation.baseline.value,
      confidenceCorrC: metrics.confidenceCorrelation.candidate.value,
      confidenceCorrDelta: metrics.confidenceCorrelation.deltaCMinusA,
      candidateCPromotion: false,
      productionBaselineA: true,
      p2kH: "NOT_AUTHORIZED",
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
