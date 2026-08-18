/**
 * P2K-G live validation — Population Evaluation on Expansion V2 dataset ONLY.
 *
 * Consumes existing durable artifacts:
 * - SEALED cohort: p2k.e.validation.expansion.v2.analyzematch.v1
 * - Baseline A run: run.p2k.f.validation.expansion.v2.analyzematch.v1.a
 * - Candidate C run: run.p2k.f.validation.expansion.v2.analyzematch.v1.c
 *
 * Does NOT:
 * - re-execute P2K-E / P2K-F
 * - mutate History / Sidecar / cohort membership
 * - regenerate Replay Runs
 * - compute promotion / start P2K-H
 * - claim Candidate C is better (n=30 descriptive only)
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
  goalRangeBucket,
  MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE,
  MINIMUM_QUALIFIED_REPORT_SAMPLE_SIZE,
  predictedGoalRangeBucket,
  predictedWinnerFromProbs,
  validateSealedCohortForOfflineRun,
} from "../../../../packages/statistics/dist/index.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation";

const COHORT_ID = "p2k.e.validation.expansion.v2.analyzematch.v1";
const EXPECTED_DIGEST =
  "03b52d71078dee7746796fd1de722e22e2a66382ea7202556299990a5714e997";
const BASELINE_RUN_ID = "run.p2k.f.validation.expansion.v2.analyzematch.v1.a";
const CANDIDATE_RUN_ID = "run.p2k.f.validation.expansion.v2.analyzematch.v1.c";
const EVALUATION_RUN_ID = "eval.p2k.g.validation.expansion.v2.analyzematch.v1";
const EXPECTED_MEMBER_COUNT = 30;
const MATCH_ID_PREFIX = "match-p2kg-expansion-v2-";

const OLD_V1_COHORT_ID = "p2k.e.validation.bootstrap.analyzematch.v1";
const OLD_V1_DIGEST =
  "abdd11ec5c230655dc61800d6f2462a3237f2acb57ca22ef23374e9d9b9bfb7c";
const RECOVERY_V2_COHORT_ID = "p2k.e.validation.recovery.v2.analyzematch.v1";
const RECOVERY_V2_DIGEST =
  "3b707860341fb268ac68377b7796c7c235ccd9caeb19b0ceb9b6ace76f7f6439";
const RECOVERY_V2_EVAL_ID = "eval.p2k.g.validation.recovery.v2.analyzematch.v1";
const COMPUTED_AT = "2026-08-17T11:00:00.000Z";

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

function roundProfile(prediction) {
  return [prediction.pHome, prediction.pDraw, prediction.pAway]
    .map((value) => Math.round(value * 1e6) / 1e6)
    .join("|");
}

function increment(counter, key) {
  counter[key] = (counter[key] ?? 0) + 1;
}

function sortedCounts(counter) {
  return Object.fromEntries(
    Object.entries(counter).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function insufficientKeys(counter, minimum) {
  return Object.entries(counter)
    .filter(([, count]) => count > 0 && count < minimum)
    .map(([key, count]) => ({ key, count, minimum }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function buildDistributions(input) {
  const { baselineRun, candidateRun, historiesById } = input;

  const confidenceBandA = {};
  const confidenceBandC = {};
  const predictedGoalRangeA = {};
  const predictedGoalRangeC = {};
  const predictedWinnerA = {};
  const predictedWinnerC = {};
  const actualWinner = {};
  const actualGoalRange = {};
  const profilesA = new Set();
  const profilesC = new Set();

  for (const result of baselineRun.results) {
    if (result.status !== "success") {
      continue;
    }
    const prediction = result.prediction;
    increment(confidenceBandA, prediction.confidenceBand);
    increment(predictedGoalRangeA, predictedGoalRangeBucket(prediction.goalRange));
    increment(
      predictedWinnerA,
      predictedWinnerFromProbs(prediction.pHome, prediction.pDraw, prediction.pAway),
    );
    profilesA.add(roundProfile(prediction));

    const history = historiesById.get(result.historyId);
    if (history !== undefined) {
      increment(actualWinner, history.actualResult.winner);
      increment(
        actualGoalRange,
        goalRangeBucket(
          history.actualResult.homeGoals + history.actualResult.awayGoals,
        ),
      );
    }
  }

  for (const result of candidateRun.results) {
    if (result.status !== "success") {
      continue;
    }
    const prediction = result.prediction;
    increment(confidenceBandC, prediction.confidenceBand);
    increment(predictedGoalRangeC, predictedGoalRangeBucket(prediction.goalRange));
    increment(
      predictedWinnerC,
      predictedWinnerFromProbs(prediction.pHome, prediction.pDraw, prediction.pAway),
    );
    profilesC.add(roundProfile(prediction));
  }

  return {
    confidenceBandDistribution: {
      baseline: sortedCounts(confidenceBandA),
      candidate: sortedCounts(confidenceBandC),
    },
    predictedGoalRangeDistribution: {
      baseline: sortedCounts(predictedGoalRangeA),
      candidate: sortedCounts(predictedGoalRangeC),
    },
    predictedWinnerDistribution: {
      baseline: sortedCounts(predictedWinnerA),
      candidate: sortedCounts(predictedWinnerC),
    },
    actualOutcomeDistribution: {
      winner: sortedCounts(actualWinner),
      goalRange: sortedCounts(actualGoalRange),
    },
    predictionProfileCount: {
      baseline: profilesA.size,
      candidate: profilesC.size,
    },
    subgroupSampleInsufficiency: {
      minimumQualifiedBucketSampleSize: MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE,
      confidenceBandBaseline: insufficientKeys(
        confidenceBandA,
        MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE,
      ),
      confidenceBandCandidate: insufficientKeys(
        confidenceBandC,
        MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE,
      ),
      predictedGoalRangeBaseline: insufficientKeys(
        predictedGoalRangeA,
        MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE,
      ),
      predictedGoalRangeCandidate: insufficientKeys(
        predictedGoalRangeC,
        MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE,
      ),
      predictedWinnerBaseline: insufficientKeys(
        predictedWinnerA,
        MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE,
      ),
      predictedWinnerCandidate: insufficientKeys(
        predictedWinnerC,
        MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE,
      ),
      actualWinner: insufficientKeys(
        actualWinner,
        MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE,
      ),
      actualGoalRange: insufficientKeys(
        actualGoalRange,
        MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE,
      ),
    },
  };
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
  const recoveryBefore =
    await db.replayCohortRepository.findByCohortId(RECOVERY_V2_COHORT_ID);
  const recoveryEvalBefore =
    await db.populationEvaluationRepository.findByEvaluationRunId(
      RECOVERY_V2_EVAL_ID,
    );

  let cohortValidation;
  try {
    const cohort = validateSealedCohortForOfflineRun(loadedCohort);
    const recomputed = computeReplayCohortMembershipDigestSha256({
      specification: cohort.specification,
      members: cohort.members,
    });
    const historyIds = cohort.members.map((member) => member.historyId);
    const matchIds = cohort.members.map((member) => member.matchId);
    cohortValidation = {
      ok: true,
      cohortId: cohort.cohortId,
      status: cohort.status,
      memberCount: cohort.members.length,
      membershipDigestSha256: cohort.membershipDigestSha256,
      digestMatchesExpected: cohort.membershipDigestSha256 === EXPECTED_DIGEST,
      digestRecomputes: cohort.membershipDigestSha256 === recomputed,
      exactMemberCount: cohort.members.length === EXPECTED_MEMBER_COUNT,
      uniqueHistoryIds: new Set(historyIds).size === cohort.members.length,
      allInNamespace: matchIds.every((matchId) =>
        matchId.startsWith(MATCH_ID_PREFIX),
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
    !cohortValidation.exactMemberCount ||
    !cohortValidation.allInNamespace
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
            "Expansion V2 SEALED cohort + durable A/C Replay Runs must already exist. P2K-G does not regenerate them.",
        },
        null,
        2,
      ),
    );
    await db.lifecycle.disconnect();
    process.exitCode = 1;
    return;
  }

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

  const value = evaluation.value;
  const reloaded =
    await db.populationEvaluationRepository.findByEvaluationRunId(EVALUATION_RUN_ID);
  const baselineAfter =
    await db.replayRunRepository.findByReplayRunId(BASELINE_RUN_ID);
  const candidateAfter =
    await db.replayRunRepository.findByReplayRunId(CANDIDATE_RUN_ID);
  const cohortAfter = await db.replayCohortRepository.findByCohortId(COHORT_ID);
  const oldV1After =
    await db.replayCohortRepository.findByCohortId(OLD_V1_COHORT_ID);
  const recoveryAfter =
    await db.replayCohortRepository.findByCohortId(RECOVERY_V2_COHORT_ID);
  const recoveryEvalAfter =
    await db.populationEvaluationRepository.findByEvaluationRunId(
      RECOVERY_V2_EVAL_ID,
    );

  const historiesById = new Map();
  for (const member of cohortAfter?.members ?? []) {
    const history = await db.evaluationHistoryRepository.findByHistoryId(
      member.historyId,
    );
    if (history !== undefined) {
      historiesById.set(member.historyId, history);
    }
  }

  const distributions = buildDistributions({
    baselineRun: baselineBefore,
    candidateRun: candidateBefore,
    historiesById,
  });

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

  const calibrationQualificationStatus = {
    minimumQualifiedReportSampleSize: MINIMUM_QUALIFIED_REPORT_SAMPLE_SIZE,
    sampleMeetsMinimumQualifiedThreshold:
      value.coverage.finalEvaluationSampleSize >=
      MINIMUM_QUALIFIED_REPORT_SAMPLE_SIZE,
    limitationNotes: value.limitations.filter(
      (line) =>
        line.includes("A2 calibration") ||
        line.includes("calibration qualification"),
    ),
    candidateSuperiorityClaimed: false,
    note: "Calibration qualification and Candidate C superiority are distinct concepts.",
  };

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
      cohortValidation.exactMemberCount &&
      value.coverage.pairedSuccessfulCount === EXPECTED_MEMBER_COUNT &&
      value.coverage.finalEvaluationSampleSize === EXPECTED_MEMBER_COUNT &&
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
    distributions,
    calibrationQualificationStatus,
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
      baselineSuccessUnchanged: baselineAfter?.successCount === 30,
      candidateSuccessUnchanged: candidateAfter?.successCount === 30,
      baselineFailureUnchanged: baselineAfter?.failureCount === 0,
      candidateFailureUnchanged: candidateAfter?.failureCount === 0,
    },
    priorArtifactsUntouched: {
      oldV1: {
        cohortId: OLD_V1_COHORT_ID,
        existedBefore: oldV1Before !== undefined,
        existedAfter: oldV1After !== undefined,
        digestUnchanged:
          oldV1Before?.membershipDigestSha256 === OLD_V1_DIGEST &&
          oldV1After?.membershipDigestSha256 === OLD_V1_DIGEST,
        status: oldV1After?.status,
      },
      recoveryV2: {
        cohortId: RECOVERY_V2_COHORT_ID,
        existedBefore: recoveryBefore !== undefined,
        existedAfter: recoveryAfter !== undefined,
        digestUnchanged:
          recoveryBefore?.membershipDigestSha256 === RECOVERY_V2_DIGEST &&
          recoveryAfter?.membershipDigestSha256 === RECOVERY_V2_DIGEST,
        status: recoveryAfter?.status,
        evaluationUntouched:
          recoveryEvalBefore?.checksum === recoveryEvalAfter?.checksum,
      },
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
      descriptiveOnlyNEquals30: true,
      statisticalSignificanceClaimed: false,
      candidateCBetterClaimed: false,
      calibrationQualificationIsNotSuperiority: true,
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
      predictionProfileCountA: distributions.predictionProfileCount.baseline,
      predictionProfileCountC: distributions.predictionProfileCount.candidate,
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
