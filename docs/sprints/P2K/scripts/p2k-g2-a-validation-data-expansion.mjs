/**
 * P2K-G2-A — Validation Dataset Diversity Expansion + V2 Bootstrap (live).
 *
 * Writes NEW match-p2kg-expansion-v2-* History+Sidecar rows via real AnalyzeMatch
 * with projectionPolicyPin=v2. Audits P2K-C eligibility, offlineReplayExecutability,
 * prediction-profile / confidence / goal-range / outcome coverage. Does NOT create a
 * cohort and does NOT run P2K-E / F / G / H.
 */
import {
  assessOfflineReplayExecutability,
  GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
  MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
  MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
  R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE,
  runOfflineMatchScriptReplay,
} from "../../../../packages/analysis/dist/index.js";
import { createFasDatabase } from "../../../../packages/database/dist/src/index.js";
import {
  bootstrapExpansionV2ValidationHistorySidecar,
  EXPANSION_V2_MATCH_IDS,
  EXPANSION_V2_OUTCOMES,
} from "../../../../packages/report/dist/index.js";
import {
  assessProjectionReplayEligibility,
  computeProjectionReplayMetrics,
  computeProjectionReplaySidecarContentSha256,
  predictedWinnerFromProbs,
} from "../../../../packages/statistics/dist/index.js";
import pg from "../../../../packages/database/node_modules/pg/lib/index.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation";

const V1_COHORT_ID = "p2k.e.validation.bootstrap.analyzematch.v1";
const V1_DIGEST = "abdd11ec5c230655dc61800d6f2462a3237f2acb57ca22ef23374e9d9b9bfb7c";
const RECOVERY_COHORT_ID = "p2k.e.validation.recovery.v2.analyzematch.v1";
const RECOVERY_DIGEST =
  "3b707860341fb268ac68377b7796c7c235ccd9caeb19b0ceb9b6ace76f7f6439";

function predictedWinner(p) {
  return predictedWinnerFromProbs(p.pHome, p.pDraw, p.pAway);
}
function predictedGoalRange(g) {
  if (g.range01 >= g.range23 && g.range01 >= g.range4Plus) {
    return "range01";
  }
  if (g.range23 >= g.range01 && g.range23 >= g.range4Plus) {
    return "range23";
  }
  return "range4Plus";
}
function roundProfile(p) {
  return [p.pHome, p.pDraw, p.pAway].map((v) => Math.round(v * 1e6) / 1e6).join("|");
}
function predictedBtts(scenarios) {
  return scenarios.mostLikely.homeGoals > 0 && scenarios.mostLikely.awayGoals > 0;
}
function predictedOver25(g) {
  return g.range23 + g.range4Plus >= 0.5;
}

async function main() {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = createFasDatabase(databaseUrl);
  await db.lifecycle.ping();

  const counts = async (sql, params) =>
    (await pool.query(sql, params ?? [])).rows[0];
  const before = await counts(
    `
    SELECT
      (SELECT COUNT(*)::int FROM evaluation_history_items) AS history,
      (SELECT COUNT(*)::int FROM projection_replay_sidecar_items) AS sidecar,
      (SELECT COUNT(*)::int FROM evaluation_history_items WHERE match_id LIKE 'match-example%') AS example_history,
      (SELECT COUNT(*)::int FROM evaluation_history_items WHERE match_id LIKE 'match-p2kg-recovery-v2-%') AS recovery_history,
      (SELECT COUNT(*)::int FROM evaluation_history_items WHERE match_id LIKE 'match-p2kg-expansion-v2-%') AS expansion_history,
      (SELECT membership_digest_sha256 FROM replay_cohort_items WHERE cohort_id = $1) AS v1_digest,
      (SELECT status FROM replay_cohort_items WHERE cohort_id = $1) AS v1_status,
      (SELECT membership_digest_sha256 FROM replay_cohort_items WHERE cohort_id = $2) AS recovery_digest,
      (SELECT status FROM replay_cohort_items WHERE cohort_id = $2) AS recovery_status
  `,
    [V1_COHORT_ID, RECOVERY_COHORT_ID],
  );

  const bootstrap = await bootstrapExpansionV2ValidationHistorySidecar({
    matchIds: EXPANSION_V2_MATCH_IDS,
    historyRepository: db.evaluationHistoryRepository,
    sidecarRepository: db.projectionReplaySidecarRepository,
  });

  const rows = [];
  let replayComplete = 0;
  let replayEligible = 0;
  let offlineExecutable = 0;
  let offlineASmokeOk = 0;

  for (const row of bootstrap.matchResults) {
    if (!row.ok || row.historyId === undefined) {
      rows.push({ matchId: row.matchId, ok: false, error: row.error });
      continue;
    }
    const history = await db.evaluationHistoryRepository.findByHistoryId(
      row.historyId,
    );
    const sidecar = await db.projectionReplaySidecarRepository.findRecordByHistoryId(
      row.historyId,
    );
    if (history === undefined || sidecar === undefined) {
      rows.push({
        matchId: row.matchId,
        ok: false,
        error: "missing persisted history/sidecar",
      });
      continue;
    }

    const p2kC = assessProjectionReplayEligibility({
      history,
      sidecar,
      hashContext: computeProjectionReplaySidecarContentSha256,
    });
    const executable = assessOfflineReplayExecutability({ history, sidecar });
    const offlineA = runOfflineMatchScriptReplay({
      history,
      sidecar,
      matchScriptCalibrationLabel: "r1b.candidate.a.baseline",
    });

    if (p2kC.replayComplete) replayComplete += 1;
    if (p2kC.replayEligible) replayEligible += 1;
    if (executable.offlineReplayExecutable) offlineExecutable += 1;
    if (offlineA.ok) offlineASmokeOk += 1;

    const prediction = history.predictionSnapshot;
    const actual = history.actualResult;
    const profile = roundProfile(prediction);
    const winnerClass = predictedWinner(prediction);
    const goalRangeClass = predictedGoalRange(prediction.goalRange);
    const bttsClass = predictedBtts(prediction.scenarios);
    const ouClass = predictedOver25(prediction.goalRange);
    const metrics = computeProjectionReplayMetrics({
      prediction,
      actual,
      evaluatedAt: history.recordedAt,
    });

    rows.push({
      matchId: row.matchId,
      homeTeam: history.homeTeam,
      awayTeam: history.awayTeam,
      historyId: row.historyId,
      ok: true,
      profile,
      pHome: prediction.pHome,
      pDraw: prediction.pDraw,
      pAway: prediction.pAway,
      predictedWinner: winnerClass,
      predictedGoalRange: goalRangeClass,
      predictedBtts: bttsClass,
      predictedOver25: ouClass,
      confidenceBand: history.confidence.confidenceBand,
      predictionConfidence: history.confidence.predictionConfidence,
      actualWinner: actual.winner,
      actualGoals: actual.homeGoals + actual.awayGoals,
      actualScore: `${actual.homeGoals}-${actual.awayGoals}`,
      metrics: {
        winnerHit: metrics.winnerHit,
        scoreHit: metrics.scoreHit,
        goalRangeHit: metrics.goalRangeHit,
        bttsHit: metrics.bttsHit,
        overUnderHit: metrics.overUnderHit,
      },
      p2kC: {
        replayComplete: p2kC.replayComplete,
        outcomeEvaluable: p2kC.outcomeEvaluable,
        replayEligible: p2kC.replayEligible,
        reasons: p2kC.reasons,
      },
      offline: {
        offlineReplayExecutable: executable.offlineReplayExecutable,
        ruleResultRebuildable: executable.ruleResultRebuildable,
        parameterProvenanceComplete: executable.parameterProvenance.complete,
        registryRecognized: executable.parameterProvenance.registryRecognized,
        reasons: executable.reasons,
        offlineASmokeOk: offlineA.ok,
      },
      provenance: row.parameterProvenance,
    });
  }

  const okRows = rows.filter((r) => r.ok);
  const profileCount = new Set(okRows.map((r) => r.profile)).size;
  const winnerClasses = new Set(okRows.map((r) => r.predictedWinner));
  const goalRangeClasses = new Set(okRows.map((r) => r.predictedGoalRange));
  const bandClasses = new Set(okRows.map((r) => r.confidenceBand));
  const bttsClasses = new Set(okRows.map((r) => String(r.predictedBtts)));
  const ouClasses = new Set(okRows.map((r) => String(r.predictedOver25)));
  const actualWinners = okRows.reduce((acc, r) => {
    acc[r.actualWinner] = (acc[r.actualWinner] ?? 0) + 1;
    return acc;
  }, {});
  const actualGoalTotals = okRows.reduce((acc, r) => {
    acc[r.actualGoals] = (acc[r.actualGoals] ?? 0) + 1;
    return acc;
  }, {});

  const after = await counts(
    `
    SELECT
      (SELECT COUNT(*)::int FROM evaluation_history_items) AS history,
      (SELECT COUNT(*)::int FROM projection_replay_sidecar_items) AS sidecar,
      (SELECT COUNT(*)::int FROM evaluation_history_items WHERE match_id LIKE 'match-example%') AS example_history,
      (SELECT COUNT(*)::int FROM evaluation_history_items WHERE match_id LIKE 'match-p2kg-recovery-v2-%') AS recovery_history,
      (SELECT COUNT(*)::int FROM evaluation_history_items WHERE match_id LIKE 'match-p2kg-expansion-v2-%') AS expansion_history,
      (SELECT membership_digest_sha256 FROM replay_cohort_items WHERE cohort_id = $1) AS v1_digest,
      (SELECT status FROM replay_cohort_items WHERE cohort_id = $1) AS v1_status,
      (SELECT membership_digest_sha256 FROM replay_cohort_items WHERE cohort_id = $2) AS recovery_digest,
      (SELECT status FROM replay_cohort_items WHERE cohort_id = $2) AS recovery_status
  `,
    [V1_COHORT_ID, RECOVERY_COHORT_ID],
  );

  const gates = {
    distinctPredictionProfiles: profileCount,
    predictedWinnerClasses: [...winnerClasses],
    predictedGoalRangeClasses: [...goalRangeClasses],
    confidenceBands: [...bandClasses],
    predictedBttsClasses: [...bttsClasses],
    predictedOver25Classes: [...ouClasses],
    actualWinnerDistribution: actualWinners,
    actualGoalTotalDistribution: actualGoalTotals,
    pass: {
      minimumCandidateRows: okRows.length >= 20,
      distinctProfilesGte6: profileCount >= 6,
      winnerClassesGte2: winnerClasses.size >= 2,
      goalRangeClassesGte3: goalRangeClasses.size >= 3,
      confidenceBandsGte2: bandClasses.size >= 2,
      actualHomeGte7: (actualWinners.home ?? 0) >= 7,
      actualDrawGte6: (actualWinners.draw ?? 0) >= 6,
      actualAwayGte7: (actualWinners.away ?? 0) >= 7,
      goalTotalsCovered:
        [0, 1, 2, 3].every((t) => (actualGoalTotals[t] ?? 0) > 0) &&
        [4, 5, 6].some((t) => (actualGoalTotals[t] ?? 0) > 0),
      allP2kCEligible: replayEligible === okRows.length,
      allOfflineReplayExecutable: offlineExecutable === okRows.length,
      allProvenanceComplete: okRows.every((r) => r.provenance?.complete === true),
      offlineASmokeAllOk: offlineASmokeOk === okRows.length,
    },
  };
  const allGatesPass = Object.values(gates.pass).every(Boolean);

  const summary = {
    slice: "P2K-G2-A",
    projectionPolicyPin: bootstrap.projectionPolicyPin,
    templateCount: EXPANSION_V2_MATCH_IDS.length,
    outcomeMapCount: Object.keys(EXPANSION_V2_OUTCOMES).length,
    historyCreatedOrIdempotent: bootstrap.historyCreatedOrIdempotent,
    sidecarCreatedOrIdempotent: bootstrap.sidecarCreatedOrIdempotent,
    historyBefore: before.history,
    historyAfter: after.history,
    historyAdded: after.history - before.history,
    sidecarBefore: before.sidecar,
    sidecarAfter: after.sidecar,
    sidecarAdded: after.sidecar - before.sidecar,
    expansionHistoryAfter: after.expansion_history,
    allCatalogValid: bootstrap.allCatalogValid,
    allParameterProvenanceComplete: bootstrap.allParameterProvenanceComplete,
    auditCounts: {
      rowsOk: okRows.length,
      replayComplete,
      replayEligible,
      offlineReplayExecutable: offlineExecutable,
      offlineASmokeOk,
    },
    coverage: {
      distinctPredictionProfiles: profileCount,
      predictedWinnerDistribution: okRows.reduce((acc, r) => {
        acc[r.predictedWinner] = (acc[r.predictedWinner] ?? 0) + 1;
        return acc;
      }, {}),
      predictedGoalRangeDistribution: okRows.reduce((acc, r) => {
        acc[r.predictedGoalRange] = (acc[r.predictedGoalRange] ?? 0) + 1;
        return acc;
      }, {}),
      predictedBttsDistribution: okRows.reduce((acc, r) => {
        const k = r.predictedBtts ? "btts" : "no-btts";
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {}),
      predictedOverUnderDistribution: okRows.reduce((acc, r) => {
        const k = r.predictedOver25 ? "over" : "under";
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {}),
      confidenceBandDistribution: okRows.reduce((acc, r) => {
        acc[r.confidenceBand] = (acc[r.confidenceBand] ?? 0) + 1;
        return acc;
      }, {}),
      actualWinnerDistribution: actualWinners,
      actualGoalTotalDistribution: actualGoalTotals,
    },
    gates,
    allGatesPass,
    oldDataUntouched: {
      exampleHistoryBefore: before.example_history,
      exampleHistoryAfter: after.example_history,
      exampleHistoryUnchanged: before.example_history === after.example_history,
      recoveryHistoryBefore: before.recovery_history,
      recoveryHistoryAfter: after.recovery_history,
      recoveryHistoryUnchanged: before.recovery_history === after.recovery_history,
      v1CohortId: V1_COHORT_ID,
      v1CohortStatus: after.v1_status,
      v1CohortDigestUnchanged: after.v1_digest === V1_DIGEST,
      recoveryCohortId: RECOVERY_COHORT_ID,
      recoveryCohortStatus: after.recovery_status,
      recoveryCohortDigestUnchanged: after.recovery_digest === RECOVERY_DIGEST,
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
      cohortCreated: false,
      p2kEExecuted: false,
      p2kFExecuted: false,
      p2kGPopulationExecuted: false,
      p2kHAuthorized: false,
    },
    rows,
  };

  console.log(JSON.stringify(summary, null, 2));

  await db.lifecycle.disconnect();
  await pool.end();

  const failedRows = rows.filter((r) => !r.ok);
  if (
    !allGatesPass ||
    !bootstrap.allCatalogValid ||
    !bootstrap.allParameterProvenanceComplete ||
    failedRows.length > 0 ||
    !summary.oldDataUntouched.exampleHistoryUnchanged ||
    !summary.oldDataUntouched.recoveryHistoryUnchanged ||
    !summary.oldDataUntouched.v1CohortDigestUnchanged ||
    !summary.oldDataUntouched.recoveryCohortDigestUnchanged ||
    summary.governance.candidateCProductionPromoted ||
    !summary.governance.productionBaselineA
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
