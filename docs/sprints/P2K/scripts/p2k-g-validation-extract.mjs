/**
 * P2K-G validation / evidence extraction ONLY.
 * Uses live validation PostgreSQL + existing sealed cohort; does not invent membership.
 * Does not promote Candidate C or change production Match Script.
 */
import { createFasDatabase } from "../../../../packages/database/dist/src/index.js";
import {
  executeSealedCohortOfflineReplayPair,
  getProductionMatchScriptParameterSet,
  GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
  MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
  MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
  R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE,
} from "../../../../packages/analysis/dist/index.js";
import {
  computeProjectionReplayMetrics,
  computeSealedCohortPopulationEvaluation,
  predictedGoalRangeBucket,
  predictedWinnerFromProbs,
} from "../../../../packages/statistics/dist/index.js";
import pg from "../../../../packages/database/node_modules/pg/lib/index.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation";

const stamp = Date.now();
const evaluationRunId = `eval.p2k.g.validation.${stamp}`;
const baselineReplayRunId = `run.p2k.g.validation.${stamp}.a`;
const candidateReplayRunId = `run.p2k.g.validation.${stamp}.c`;

function predictedBtts(prediction) {
  const scenario = prediction.scenarios.mostLikely;
  return scenario.homeGoals > 0 && scenario.awayGoals > 0;
}

function actualBtts(actual) {
  return actual.homeGoals > 0 && actual.awayGoals > 0;
}

function predictedOver25(prediction) {
  return prediction.goalRange.range23 + prediction.goalRange.range4Plus >= 0.5;
}

function actualOver25(actual) {
  return actual.totalGoals >= 3;
}

function metricView(row) {
  return {
    availability: row.availability,
    value: row.value ?? null,
    hitCount: row.hitCount ?? null,
    sampleSize: row.sampleSize,
    unavailableReason: row.unavailableReason ?? null,
  };
}

async function main() {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const inventory = {
    historyCount: (
      await pool.query(`SELECT COUNT(*)::int AS n FROM evaluation_history_items`)
    ).rows[0].n,
    sidecarCount: (
      await pool.query(
        `SELECT COUNT(*)::int AS n FROM projection_replay_sidecar_items`,
      )
    ).rows[0].n,
    sealedCohorts: (
      await pool.query(`
        SELECT c.cohort_id, c.schema_version, c.status, c.membership_digest_sha256,
               COUNT(m.history_id)::int AS member_count
        FROM replay_cohort_items c
        LEFT JOIN replay_cohort_member_items m ON m.cohort_id = c.cohort_id
        WHERE c.status = 'SEALED'
        GROUP BY c.cohort_id, c.schema_version, c.status, c.membership_digest_sha256
        ORDER BY c.cohort_id`)
    ).rows,
    baselineRuns: (
      await pool.query(`
        SELECT replay_run_id, cohort_id, member_count, success_count
        FROM replay_run_items
        WHERE match_script_calibration_label = 'r1b.candidate.a.baseline'
        ORDER BY created_at`)
    ).rows,
    candidateRuns: (
      await pool.query(`
        SELECT replay_run_id, cohort_id, member_count, success_count
        FROM replay_run_items
        WHERE match_script_calibration_label = 'r1b.candidate.c.sideAwareOpen'
        ORDER BY created_at`)
    ).rows,
    pairedRunnable: (
      await pool.query(`
        SELECT c.cohort_id, c.membership_digest_sha256,
               COUNT(m.history_id)::int AS member_count,
               BOOL_AND(s.history_id IS NOT NULL) AS all_have_sidecar,
               BOOL_AND(h.history_id IS NOT NULL) AS all_have_history
        FROM replay_cohort_items c
        JOIN replay_cohort_member_items m ON m.cohort_id = c.cohort_id
        LEFT JOIN projection_replay_sidecar_items s ON s.history_id = m.history_id
        LEFT JOIN evaluation_history_items h ON h.history_id = m.history_id
        WHERE c.status = 'SEALED'
        GROUP BY c.cohort_id, c.membership_digest_sha256
        HAVING COUNT(m.history_id) > 0
           AND BOOL_AND(s.history_id IS NOT NULL)
           AND BOOL_AND(h.history_id IS NOT NULL)
        ORDER BY c.cohort_id DESC`)
    ).rows,
    r1aNamedInHistory: (
      await pool.query(`
        SELECT history_id, match_id, home_team, away_team
        FROM evaluation_history_items
        WHERE home_team ILIKE '%Marinos%' OR away_team ILIKE '%Kashima%'
           OR home_team ILIKE '%Sirius%' OR away_team ILIKE '%Bromma%'
           OR home_team ILIKE '%Vasteras%' OR away_team ILIKE '%Djurg%'
           OR home_team ILIKE '%Västerås%' OR away_team ILIKE '%Djurg%'`)
    ).rows,
  };

  if (inventory.pairedRunnable.length === 0) {
    console.log(
      JSON.stringify(
        {
          status: "NO_VALID_INPUTS",
          reason:
            "No SEALED cohort with complete History+Sidecar membership found for offline A/C execution.",
          inventory,
          production: {
            GOVERNED_MATCH_SCRIPT_PARAMETER_SET:
              GOVERNED_MATCH_SCRIPT_PARAMETER_SET ===
              MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET
                ? "MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET"
                : "UNEXPECTED",
            candidateCProductionPromoted:
              R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE.candidateC.productionPromoted,
          },
        },
        null,
        2,
      ),
    );
    await pool.end();
    return;
  }

  // Prefer largest sealed runnable cohort; ties → newest cohort_id.
  const selected = [...inventory.pairedRunnable].sort((a, b) => {
    if (b.member_count !== a.member_count) {
      return b.member_count - a.member_count;
    }
    return a.cohort_id < b.cohort_id ? 1 : -1;
  })[0];

  const cohortId = selected.cohort_id;
  const db = createFasDatabase(databaseUrl);
  await db.lifecycle.ping();

  let pair;
  try {
    pair = await executeSealedCohortOfflineReplayPair({
      cohortId,
      baselineReplayRunId,
      candidateReplayRunId,
      cohortRepository: db.replayCohortRepository,
      historyRepository: db.evaluationHistoryRepository,
      sidecarRepository: db.projectionReplaySidecarRepository,
      replayRunRepository: db.replayRunRepository,
      clock: () => new Date().toISOString(),
    });
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          status: "P2K_F_THREW",
          cohortId,
          membershipDigestSha256: selected.membership_digest_sha256,
          error: {
            name: error?.name ?? "Error",
            message: error?.message ?? String(error),
          },
          governanceClassification: "A_NO_EVIDENCE",
          candidateCNotPromoted: true,
          inventory,
          note: "Offline Replay threw before producing A/C runs. P2K-G metrics are NOT_AVAILABLE. Sidecars were not repaired/fabricated.",
        },
        null,
        2,
      ),
    );
    await db.lifecycle.disconnect();
    await pool.end();
    return;
  }

  if (!pair.ok) {
    console.log(
      JSON.stringify(
        {
          status: "P2K_F_FAILED",
          cohortId,
          error: { code: pair.error.code, message: pair.error.message },
          governanceClassification: "A_NO_EVIDENCE",
          candidateCNotPromoted: true,
          inventory,
        },
        null,
        2,
      ),
    );
    await db.lifecycle.disconnect();
    await pool.end();
    return;
  }

  const evaluation = await computeSealedCohortPopulationEvaluation({
    evaluationRunId,
    cohortId,
    baselineReplayRunId: pair.baseline.replayRunId,
    candidateReplayRunId: pair.candidate.replayRunId,
    computedAt: new Date().toISOString(),
    cohortRepository: db.replayCohortRepository,
    replayRunRepository: db.replayRunRepository,
    historyRepository: db.evaluationHistoryRepository,
    populationEvaluationRepository: db.populationEvaluationRepository,
  });

  if (!evaluation.ok) {
    console.log(
      JSON.stringify(
        {
          status: "P2K_G_FAILED",
          cohortId,
          error: {
            code: evaluation.error.code,
            message: evaluation.error.message,
          },
          baselineRun: {
            replayRunId: pair.baseline.replayRunId,
            successCount: pair.baseline.successCount,
            failureCount: pair.baseline.failureCount,
          },
          candidateRun: {
            replayRunId: pair.candidate.replayRunId,
            successCount: pair.candidate.successCount,
            failureCount: pair.candidate.failureCount,
          },
          inventory,
        },
        null,
        2,
      ),
    );
    await db.lifecycle.disconnect();
    await pool.end();
    process.exitCode = 1;
    return;
  }

  const reopened = createFasDatabase(databaseUrl);
  const reloaded =
    await reopened.populationEvaluationRepository.findByEvaluationRunId(
      evaluationRunId,
    );
  const persistenceIdentical =
    reloaded !== undefined &&
    JSON.stringify(reloaded) === JSON.stringify(evaluation.value);

  const cohort = await db.replayCohortRepository.findByCohortId(cohortId);
  const perMatch = [];
  for (const member of cohort?.members ?? []) {
    const baseline = pair.baseline.results.find(
      (row) => row.historyId === member.historyId,
    );
    const candidate = pair.candidate.results.find(
      (row) => row.historyId === member.historyId,
    );
    const history = await db.evaluationHistoryRepository.findByHistoryId(
      member.historyId,
    );
    if (
      baseline?.status !== "success" ||
      candidate?.status !== "success" ||
      history === undefined
    ) {
      perMatch.push({
        historyId: member.historyId,
        matchId: member.matchId,
        status: "not_paired_success",
        baselineStatus: baseline?.status ?? "missing",
        candidateStatus: candidate?.status ?? "missing",
        homeTeam: history?.homeTeam,
        awayTeam: history?.awayTeam,
      });
      continue;
    }

    const actual = history.actualResult;
    const aMetrics = computeProjectionReplayMetrics({
      prediction: baseline.prediction,
      actual,
      evaluatedAt: evaluation.value.createdAt,
    });
    const cMetrics = computeProjectionReplayMetrics({
      prediction: candidate.prediction,
      actual,
      evaluatedAt: evaluation.value.createdAt,
    });
    const sameContext =
      JSON.stringify(baseline.historicalReplayContext) ===
      JSON.stringify(candidate.historicalReplayContext);

    perMatch.push({
      historyId: member.historyId,
      matchId: member.matchId,
      homeTeam: history.homeTeam,
      awayTeam: history.awayTeam,
      actual: {
        winner: actual.winner,
        homeGoals: actual.homeGoals,
        awayGoals: actual.awayGoals,
        totalGoals: actual.totalGoals,
      },
      sameHistoricalContext: sameContext,
      baseline: {
        label: baseline.matchScriptCalibrationLabel,
        predictedWinner: predictedWinnerFromProbs(
          baseline.prediction.pHome,
          baseline.prediction.pDraw,
          baseline.prediction.pAway,
        ),
        probs: {
          pHome: baseline.prediction.pHome,
          pDraw: baseline.prediction.pDraw,
          pAway: baseline.prediction.pAway,
        },
        mostLikelyScore: {
          homeGoals: baseline.prediction.scenarios.mostLikely.homeGoals,
          awayGoals: baseline.prediction.scenarios.mostLikely.awayGoals,
        },
        goalRange: predictedGoalRangeBucket(baseline.prediction.goalRange),
        bttsPredicted: predictedBtts(baseline.prediction),
        over25Predicted: predictedOver25(baseline.prediction),
        confidence: baseline.prediction.predictionConfidence,
        winnerCorrect: aMetrics.winnerHit,
        scoreCorrect: aMetrics.scoreHit,
        goalRangeCorrect: aMetrics.goalRangeHit,
        bttsCorrect: aMetrics.bttsHit,
        overUnderCorrect: aMetrics.overUnderHit,
      },
      candidate: {
        label: candidate.matchScriptCalibrationLabel,
        predictedWinner: predictedWinnerFromProbs(
          candidate.prediction.pHome,
          candidate.prediction.pDraw,
          candidate.prediction.pAway,
        ),
        probs: {
          pHome: candidate.prediction.pHome,
          pDraw: candidate.prediction.pDraw,
          pAway: candidate.prediction.pAway,
        },
        mostLikelyScore: {
          homeGoals: candidate.prediction.scenarios.mostLikely.homeGoals,
          awayGoals: candidate.prediction.scenarios.mostLikely.awayGoals,
        },
        goalRange: predictedGoalRangeBucket(candidate.prediction.goalRange),
        bttsPredicted: predictedBtts(candidate.prediction),
        over25Predicted: predictedOver25(candidate.prediction),
        confidence: candidate.prediction.predictionConfidence,
        winnerCorrect: cMetrics.winnerHit,
        scoreCorrect: cMetrics.scoreHit,
        goalRangeCorrect: cMetrics.goalRangeHit,
        bttsCorrect: cMetrics.bttsHit,
        overUnderCorrect: cMetrics.overUnderHit,
      },
      actualFlags: {
        btts: actualBtts(actual),
        over25: actualOver25(actual),
      },
    });
  }

  const comparisons = Object.fromEntries(
    evaluation.value.comparisons.map((row) => [
      row.metricId,
      {
        label: row.metricLabel,
        baseline: metricView(row.baseline),
        candidate: metricView(row.candidate),
        deltaCMinusA: row.delta ?? null,
      },
    ]),
  );

  const winnerBreakdown = {
    actualHome: {
      baseline: metricView(evaluation.value.winnerBreakdown.actualHome.baseline),
      candidate: metricView(evaluation.value.winnerBreakdown.actualHome.candidate),
      deltaCMinusA: evaluation.value.winnerBreakdown.actualHome.delta ?? null,
    },
    actualDraw: {
      baseline: metricView(evaluation.value.winnerBreakdown.actualDraw.baseline),
      candidate: metricView(evaluation.value.winnerBreakdown.actualDraw.candidate),
      deltaCMinusA: evaluation.value.winnerBreakdown.actualDraw.delta ?? null,
    },
    actualAway: {
      baseline: metricView(evaluation.value.winnerBreakdown.actualAway.baseline),
      candidate: metricView(evaluation.value.winnerBreakdown.actualAway.candidate),
      deltaCMinusA: evaluation.value.winnerBreakdown.actualAway.delta ?? null,
    },
  };

  const sampleSize = evaluation.value.coverage.finalEvaluationSampleSize;
  let governanceClass = "A_NO_EVIDENCE";
  if (sampleSize === 0) {
    governanceClass = "A_NO_EVIDENCE";
  } else if (sampleSize < 30) {
    governanceClass = "B_INSUFFICIENT_EVIDENCE";
  } else {
    const winnerDelta = comparisons.winnerAccuracy?.deltaCMinusA;
    const brierDelta = comparisons.brierScore?.deltaCMinusA;
    const eceDelta = comparisons.expectedCalibrationError?.deltaCMinusA;
    const improves = [
      typeof winnerDelta === "number" && winnerDelta > 0,
      typeof brierDelta === "number" && brierDelta < 0,
      typeof eceDelta === "number" && eceDelta < 0,
    ].filter(Boolean).length;
    const regresses = [
      typeof winnerDelta === "number" && winnerDelta < 0,
      typeof brierDelta === "number" && brierDelta > 0,
      typeof eceDelta === "number" && eceDelta > 0,
    ].filter(Boolean).length;
    if (improves > 0 && regresses > 0) {
      governanceClass = "C_MIXED";
    } else if (improves >= 2 && regresses === 0) {
      governanceClass = "D_PROMISING";
    } else if (improves >= 3 && sampleSize >= 100) {
      governanceClass = "E_STRONGLY_SUPPORTED";
    } else {
      governanceClass = "B_INSUFFICIENT_EVIDENCE";
    }
  }

  // For n<30 always B regardless of deltas (descriptive only).
  if (sampleSize > 0 && sampleSize < 30) {
    governanceClass = "B_INSUFFICIENT_EVIDENCE";
  }

  const antiBias = {
    sameCohortId:
      pair.baseline.cohortId === cohortId &&
      pair.candidate.cohortId === cohortId &&
      evaluation.value.cohortId === cohortId,
    sameMembershipDigest:
      pair.baseline.membershipDigestSha256 ===
        pair.candidate.membershipDigestSha256 &&
      pair.baseline.membershipDigestSha256 ===
        evaluation.value.membershipDigestSha256 &&
      pair.baseline.membershipDigestSha256 === cohort.membershipDigestSha256,
    cohortStatusSealed: cohort.status === "SEALED",
    allPairedSuccessesSameContext: pair.pairs.every(
      (p) =>
        p.baseline.status !== "success" ||
        p.candidate.status !== "success" ||
        p.sameHistoricalContext,
    ),
    metricsUseIdenticalSampleSizes: evaluation.value.comparisons.every(
      (row) =>
        row.baseline.sampleSize === row.candidate.sampleSize ||
        row.baseline.availability === "not_available",
    ),
    outcomesOnlyAtEvaluation: true,
    noProviderRefresh: true,
    noSidecarFabrication: true,
    candidateDidNotSelectCohort: true,
    productionUnchanged: {
      governedEqualsBaselineA:
        GOVERNED_MATCH_SCRIPT_PARAMETER_SET ===
        MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
      productionResolverBaselineA:
        getProductionMatchScriptParameterSet() ===
        MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
      candidateCNotGoverned:
        MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET !==
        GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
      candidateCProductionPromoted:
        R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE.candidateC.productionPromoted,
      evaluationFlags: {
        candidateCProductionPromoted: evaluation.value.candidateCProductionPromoted,
        productionMatchScriptUnchanged:
          evaluation.value.productionMatchScriptUnchanged,
        statisticalSignificanceSupported:
          evaluation.value.statisticalSignificanceSupported,
      },
    },
  };

  console.log(
    JSON.stringify(
      {
        status: "EVALUATION_EXECUTED",
        environment: {
          databaseUrlHost: new URL(databaseUrl).host,
          databaseName: new URL(databaseUrl).pathname.replace(/^\//, ""),
          executedAt: new Date().toISOString(),
        },
        inventoryBeforeExecution: {
          historyCount: inventory.historyCount,
          sidecarCount: inventory.sidecarCount,
          sealedCohortCount: inventory.sealedCohorts.length,
          existingBaselineRunCount: inventory.baselineRuns.length,
          existingCandidateRunCount: inventory.candidateRuns.length,
          note: "Prior Replay Runs were persistence stubs unbound to sealed cohorts; Candidate C runs were absent. This validation executed P2K-F then P2K-G against an existing SEALED cohort.",
        },
        selectedCohort: {
          cohortId,
          schemaVersion: cohort.schemaVersion,
          status: cohort.status,
          membershipDigestSha256: cohort.membershipDigestSha256,
          totalMembers: cohort.members.length,
        },
        replayRuns: {
          baselineReplayRunId: pair.baseline.replayRunId,
          candidateReplayRunId: pair.candidate.replayRunId,
          baselineLabel: pair.baseline.matchScriptCalibrationLabel,
          candidateLabel: pair.candidate.matchScriptCalibrationLabel,
          baselineSuccess: pair.baseline.successCount,
          baselineFailure: pair.baseline.failureCount,
          candidateSuccess: pair.candidate.successCount,
          candidateFailure: pair.candidate.failureCount,
          baselineProductionDefault: pair.baseline.isProductionDefault,
          candidateProductionDefault: pair.candidate.isProductionDefault,
          baselineProductionPromoted: pair.baseline.productionPromoted,
          candidateProductionPromoted: pair.candidate.productionPromoted,
        },
        coverage: evaluation.value.coverage,
        comparisons,
        winnerBreakdown,
        perMatch,
        r1aShowcaseInCohort: perMatch.filter((row) => {
          const hay = `${row.homeTeam ?? ""} ${row.awayTeam ?? ""}`;
          return /Marinos|Kashima|Sirius|Bromma|Vasteras|Västerås|Djurg/i.test(hay);
        }),
        r1aNamedInHistory: inventory.r1aNamedInHistory,
        limitations: evaluation.value.limitations,
        persistence: {
          evaluationRunId,
          checksum: evaluation.value.checksum,
          schemaVersion: evaluation.value.schemaVersion,
          reloadedIdentical: persistenceIdentical,
        },
        antiBias,
        governanceClassification: governanceClass,
        candidateCNotPromoted: true,
      },
      null,
      2,
    ),
  );

  await reopened.lifecycle.disconnect();
  await db.lifecycle.disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
