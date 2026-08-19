/**
 * P2K-CAL-2 offline replay validation — Production baseline vs calibration candidate.
 *
 * Consumes SEALED Expansion V2 cohort + durable History/Sidecar only.
 * Does NOT mutate cohort, History, Sidecar, or existing Evaluation artifacts.
 */
import {
  buildFeatureBundleFromSealedReplayContext,
  buildRuleResultsFromSealedReplayContext,
  computeMatchProjection,
  PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT,
  PROJECTION_CALIBRATION_CANDIDATE1_VERSION_LABEL,
  PROJECTION_CALIBRATION_GOVERNANCE,
  PROJECTION_PARAMETER_VERSION_REPLAY,
  resolveOfflineProjectionCalibrationArtifact,
  runOfflineProjectionCalibrationReplay,
} from "../../../../packages/analysis/dist/index.js";
import { createFasDatabase } from "../../../../packages/database/dist/src/index.js";
import {
  computeReplayCohortMembershipDigestSha256,
  goalRangeBucket,
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
const EXPECTED_MEMBER_COUNT = 30;

function round6(value) {
  return Math.round(value * 1e6) / 1e6;
}

function increment(counter, key) {
  counter[key] = (counter[key] ?? 0) + 1;
}

function sortedCounts(counter) {
  return Object.fromEntries(
    Object.entries(counter).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function mean(values) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function accuracy(hits, total) {
  if (total === 0) {
    return null;
  }
  return hits / total;
}

function brierScore(probs, outcomes) {
  if (probs.length === 0) {
    return null;
  }
  let total = 0;
  for (let index = 0; index < probs.length; index += 1) {
    const prob = probs[index];
    const outcome = outcomes[index];
    total += (prob - outcome) ** 2;
  }
  return total / probs.length;
}

function ece(probs, outcomes, bins = 10) {
  if (probs.length === 0) {
    return null;
  }
  let total = 0;
  for (let bin = 0; bin < bins; bin += 1) {
    const lower = bin / bins;
    const upper = (bin + 1) / bins;
    const indices = probs
      .map((prob, index) => ({ prob, index }))
      .filter((entry) => entry.prob >= lower && entry.prob < upper)
      .map((entry) => entry.index);
    if (indices.length === 0) {
      continue;
    }
    const binProb =
      indices.reduce((sum, index) => sum + probs[index], 0) / indices.length;
    const binOutcome =
      indices.reduce((sum, index) => sum + outcomes[index], 0) / indices.length;
    total += (indices.length / probs.length) * Math.abs(binProb - binOutcome);
  }
  return total;
}

async function main() {
  const db = createFasDatabase(databaseUrl);
  await db.lifecycle.ping();

  const loadedCohort = await db.replayCohortRepository.findByCohortId(COHORT_ID);
  if (loadedCohort === undefined) {
    throw new Error(`Missing cohort ${COHORT_ID}`);
  }

  const cohort = validateSealedCohortForOfflineRun(loadedCohort);
  const digest = computeReplayCohortMembershipDigestSha256({
    specification: cohort.specification,
    members: cohort.members,
  });
  if (digest !== EXPECTED_DIGEST) {
    throw new Error(
      `Cohort digest mismatch: expected ${EXPECTED_DIGEST}, got ${digest}`,
    );
  }
  if (cohort.members.length !== EXPECTED_MEMBER_COUNT) {
    throw new Error(
      `Cohort member count mismatch: expected ${EXPECTED_MEMBER_COUNT}, got ${cohort.members.length}`,
    );
  }

  const histories = [];
  for (const member of cohort.members) {
    const history = await db.evaluationHistoryRepository.findByHistoryId(
      member.historyId,
    );
    if (history === undefined) {
      throw new Error(`Missing history ${member.historyId}`);
    }
    const sidecar = await db.projectionReplaySidecarRepository.findRecordByHistoryId(
      member.historyId,
    );
    if (sidecar === undefined) {
      throw new Error(`Missing sidecar for ${member.historyId}`);
    }
    histories.push({ history, sidecar });
  }

  const baselineRows = [];
  const candidateRows = [];

  for (const { history, sidecar } of histories) {
    const baselineResolved = resolveOfflineProjectionCalibrationArtifact({
      calibrationLabel: PROJECTION_PARAMETER_VERSION_REPLAY,
    });
    const candidateResolved = resolveOfflineProjectionCalibrationArtifact({
      calibrationLabel: PROJECTION_CALIBRATION_CANDIDATE1_VERSION_LABEL,
    });
    if (!baselineResolved.ok || !candidateResolved.ok) {
      throw new Error("Failed to resolve calibration artifacts");
    }

    const context = sidecar.context;
    const featureBundle = buildFeatureBundleFromSealedReplayContext(context);
    const ruleResults = buildRuleResultsFromSealedReplayContext(context);

    const baseline = runOfflineProjectionCalibrationReplay({
      history,
      sidecar,
      projectionCalibrationLabel: PROJECTION_PARAMETER_VERSION_REPLAY,
    });
    const candidate = runOfflineProjectionCalibrationReplay({
      history,
      sidecar,
      projectionCalibrationLabel: PROJECTION_CALIBRATION_CANDIDATE1_VERSION_LABEL,
    });

    if (!baseline.ok) {
      throw new Error(
        `Baseline replay failed ${history.historyId}: ${baseline.error.message}`,
      );
    }
    if (!candidate.ok) {
      throw new Error(
        `Candidate replay failed ${history.historyId}: ${candidate.error.message}`,
      );
    }

    const baselineProjection = computeMatchProjection({
      featureBundle,
      ruleResults,
      requiredEvidencePresentCount: context.requiredEvidencePresentCount,
      projectionPolicyPin: "v2",
      parameters: baselineResolved.value,
    });
    const candidateProjection = computeMatchProjection({
      featureBundle,
      ruleResults,
      requiredEvidencePresentCount: context.requiredEvidencePresentCount,
      projectionPolicyPin: "v2",
      parameters: candidateResolved.value,
    });

    baselineRows.push({
      history,
      replay: baseline.value,
      projection: baselineProjection.projection,
    });
    candidateRows.push({
      history,
      replay: candidate.value,
      projection: candidateProjection.projection,
    });
  }

  function summarizeRows(rows) {
    const predictedWinner = {};
    const predictedGoalRange = {};
    const actualWinner = {};
    const actualGoalRange = {};
    const pHome = [];
    const pDraw = [];
    const pAway = [];
    const lambdaHome = [];
    const lambdaAway = [];
    const expectedGoals = [];
    let winnerHits = 0;
    let goalRangeHits = 0;
    let exactScoreHits = 0;
    let bttsHits = 0;
    let overHits = 0;
    const homeBrier = [];
    const homeOutcomes = [];
    const drawBrier = [];
    const drawOutcomes = [];
    const awayBrier = [];
    const awayOutcomes = [];

    for (const row of rows) {
      const prediction = row.replay.prediction;
      const projection = row.projection;
      const actual = row.history.actualResult;
      const predictedWinnerValue = predictedWinnerFromProbs(
        prediction.pHome,
        prediction.pDraw,
        prediction.pAway,
      );
      const predictedRange = predictedGoalRangeBucket(prediction.goalRange);
      const actualRange = goalRangeBucket(actual.homeGoals + actual.awayGoals);

      increment(predictedWinner, predictedWinnerValue);
      increment(predictedGoalRange, predictedRange);
      increment(actualWinner, actual.winner);
      increment(actualGoalRange, actualRange);

      pHome.push(prediction.pHome);
      pDraw.push(prediction.pDraw);
      pAway.push(prediction.pAway);
      lambdaHome.push(projection.lambdaHome);
      lambdaAway.push(projection.lambdaAway);
      expectedGoals.push(projection.lambdaHome + projection.lambdaAway);

      const top = prediction.topScorelines[0];

      if (predictedWinnerValue === actual.winner) {
        winnerHits += 1;
      }
      if (predictedRange === actualRange) {
        goalRangeHits += 1;
      }
      if (
        top !== undefined &&
        top.homeGoals === actual.homeGoals &&
        top.awayGoals === actual.awayGoals
      ) {
        exactScoreHits += 1;
      }

      const bttsActual = actual.homeGoals > 0 && actual.awayGoals > 0 ? 1 : 0;
      const bttsPredicted =
        prediction.topScorelines.some(
          (scoreline) => scoreline.homeGoals > 0 && scoreline.awayGoals > 0,
        ) === true
          ? 1
          : 0;
      if (bttsPredicted === bttsActual) {
        bttsHits += 1;
      }

      const overActual = actual.homeGoals + actual.awayGoals >= 3 ? 1 : 0;
      const overPredicted =
        prediction.goalRange.range23 + prediction.goalRange.range4Plus;
      if ((overPredicted >= 0.5 ? 1 : 0) === overActual) {
        overHits += 1;
      }

      homeBrier.push(prediction.pHome);
      drawBrier.push(prediction.pDraw);
      awayBrier.push(prediction.pAway);
      homeOutcomes.push(actual.winner === "home" ? 1 : 0);
      drawOutcomes.push(actual.winner === "draw" ? 1 : 0);
      awayOutcomes.push(actual.winner === "away" ? 1 : 0);
    }

    const sampleSize = rows.length;
    return {
      sampleSize,
      winnerAccuracy: accuracy(winnerHits, sampleSize),
      exactScoreAccuracy: accuracy(exactScoreHits, sampleSize),
      goalRangeAccuracy: accuracy(goalRangeHits, sampleSize),
      bttsAccuracy: accuracy(bttsHits, sampleSize),
      overUnderAccuracy: accuracy(overHits, sampleSize),
      brierScore:
        (brierScore(homeBrier, homeOutcomes) +
          brierScore(drawBrier, drawOutcomes) +
          brierScore(awayBrier, awayOutcomes)) /
        3,
      ece:
        (ece(homeBrier, homeOutcomes) +
          ece(drawBrier, drawOutcomes) +
          ece(awayBrier, awayOutcomes)) /
        3,
      meanPHome: mean(pHome),
      meanPDraw: mean(pDraw),
      meanPAway: mean(pAway),
      meanLambdaHome: mean(lambdaHome),
      meanLambdaAway: mean(lambdaAway),
      meanExpectedTotalGoals: mean(expectedGoals),
      predictedWinnerDistribution: sortedCounts(predictedWinner),
      predictedGoalRangeDistribution: sortedCounts(predictedGoalRange),
      actualWinnerDistribution: sortedCounts(actualWinner),
      actualGoalRangeDistribution: sortedCounts(actualGoalRange),
    };
  }

  const baselineSummary = summarizeRows(baselineRows);
  const candidateSummary = summarizeRows(candidateRows);

  const report = {
    modelVersion: "p2kCal2OfflineValidation.v1",
    computedAt: new Date().toISOString(),
    cohortId: COHORT_ID,
    cohortDigest: digest,
    baselineReferenceRunId: BASELINE_RUN_ID,
    governance: {
      productionDefault: PROJECTION_PARAMETER_VERSION_REPLAY,
      candidateVersionLabel: PROJECTION_CALIBRATION_CANDIDATE1_VERSION_LABEL,
      candidateArtifactId: PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT.artifactId,
      candidateChecksum: PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT.checksum,
      productionPromoted:
        PROJECTION_CALIBRATION_GOVERNANCE.candidate1.productionPromoted,
      promotionDecision: "NON-DEFAULT / NOT PROMOTED",
    },
    baseline: baselineSummary,
    candidate: candidateSummary,
    distributionDelta: {
      range4PlusPredictedBaseline:
        baselineSummary.predictedGoalRangeDistribution.range4Plus ?? 0,
      range4PlusPredictedCandidate:
        candidateSummary.predictedGoalRangeDistribution.range4Plus ?? 0,
      drawPredictedBaseline: baselineSummary.predictedWinnerDistribution.draw ?? 0,
      drawPredictedCandidate: candidateSummary.predictedWinnerDistribution.draw ?? 0,
      meanExpectedGoalsBaseline: round6(baselineSummary.meanExpectedTotalGoals ?? 0),
      meanExpectedGoalsCandidate: round6(
        candidateSummary.meanExpectedTotalGoals ?? 0,
      ),
      meanPDrawBaseline: round6(baselineSummary.meanPDraw ?? 0),
      meanPDrawCandidate: round6(candidateSummary.meanPDraw ?? 0),
    },
    limitations: [
      "Offline replay on sealed Expansion V2 cohort (n=30); descriptive only.",
      "Does not mutate History, Sidecar, cohort, or existing Evaluation artifacts.",
      "Candidate remains NON-DEFAULT / NOT production promoted.",
    ],
  };

  console.log(JSON.stringify(report, null, 2));
  await db.lifecycle.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
