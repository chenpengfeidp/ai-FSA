/**
 * P2K-G validation recovery — live DB inventory + optional A/C execution.
 * P2K-C eligibility remains canonical for cohort membership.
 * Offline RuleResult rebuild diagnostic classifies fixture contamination
 * without mutating History/Sidecars or changing P2K-C.
 */
import {
  assessSealedReplayRuleRebuild,
  executeSealedCohortOfflineReplayPair,
  getProductionMatchScriptParameterSet,
  GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
  MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
  MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
  R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE,
} from "../../../../packages/analysis/dist/index.js";
import { createFasDatabase } from "../../../../packages/database/dist/src/index.js";
import {
  assessProjectionReplayEligibility,
  buildReplayCohort,
  computeProjectionReplaySidecarContentSha256,
  computeReplayCohortMembershipDigestSha256,
  computeSealedCohortPopulationEvaluation,
  createDefaultReplayCohortSpecification,
  PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
  REPLAY_ELIGIBILITY_CONTRACT_VERSION,
  selectReplayCohortMembers,
} from "../../../../packages/statistics/dist/index.js";
import pg from "../../../../packages/database/node_modules/pg/lib/index.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation";

async function main() {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = createFasDatabase(databaseUrl);
  await db.lifecycle.ping();

  const historyRows = await pool.query(
    `SELECT history_id FROM evaluation_history_items ORDER BY history_id ASC`,
  );
  const sidecarCount = (
    await pool.query(
      `SELECT COUNT(*)::int AS n FROM projection_replay_sidecar_items`,
    )
  ).rows[0].n;

  const inventory = [];
  let replayComplete = 0;
  let outcomeEvaluable = 0;
  let replayEligible = 0;
  let offlineRebuildable = 0;
  let missingSidecar = 0;
  let invalidHash = 0;
  let invalidRuleId = 0;
  let invalidScore = 0;
  const reasonCounts = new Map();

  for (const row of historyRows.rows) {
    const history = await db.evaluationHistoryRepository.findByHistoryId(
      row.history_id,
    );
    if (history === undefined) {
      continue;
    }
    const sidecar = await db.projectionReplaySidecarRepository.findRecordByHistoryId(
      history.historyId,
    );
    const assessment = assessProjectionReplayEligibility({
      history,
      sidecar,
      hashContext: computeProjectionReplaySidecarContentSha256,
    });

    if (assessment.replayComplete) replayComplete += 1;
    if (assessment.outcomeEvaluable) outcomeEvaluable += 1;
    if (assessment.replayEligible) replayEligible += 1;
    for (const reason of assessment.reasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
    if (assessment.reasons.includes("MISSING_SIDECAR")) missingSidecar += 1;
    if (assessment.reasons.includes("INVALID_SIDECAR_HASH")) invalidHash += 1;

    let rebuild = null;
    if (sidecar !== undefined) {
      rebuild = assessSealedReplayRuleRebuild(sidecar.context);
      if (rebuild.rebuildable) offlineRebuildable += 1;
      for (const issue of rebuild.issues) {
        if (issue.code === "INVALID_RULE_ID") invalidRuleId += 1;
        if (issue.code === "INVALID_SCORE") invalidScore += 1;
      }
    }

    inventory.push({
      historyId: history.historyId,
      matchId: history.matchId,
      homeTeam: history.homeTeam,
      awayTeam: history.awayTeam,
      replayComplete: assessment.replayComplete,
      outcomeEvaluable: assessment.outcomeEvaluable,
      replayEligible: assessment.replayEligible,
      p2kCReasons: assessment.reasons,
      offlineRuleRebuildable: rebuild?.rebuildable ?? false,
      offlineRuleIssues: rebuild?.issues ?? [],
      validationClass:
        assessment.replayEligible && rebuild?.rebuildable === true
          ? "OFFLINE_REPLAY_ELIGIBLE"
          : assessment.replayEligible && rebuild?.rebuildable === false
            ? "REPLAY_INELIGIBLE_INVALID_RULE_CONTRACT"
            : "REPLAY_INELIGIBLE",
    });
  }

  const offlineEligibleHistories = [];
  for (const row of inventory) {
    if (row.validationClass !== "OFFLINE_REPLAY_ELIGIBLE") continue;
    const history = await db.evaluationHistoryRepository.findByHistoryId(
      row.historyId,
    );
    if (history !== undefined) offlineEligibleHistories.push(history);
  }

  const distinctRules = (
    await pool.query(`
      SELECT r->>'ruleId' AS rule_id, r->>'ruleName' AS rule_name, COUNT(*)::int AS n
      FROM projection_replay_sidecar_items s,
           jsonb_array_elements(s.context_json->'rules') r
      GROUP BY 1,2 ORDER BY n DESC`)
  ).rows;

  let stoppedReason = null;
  let cohortResult = null;
  let pairResult = null;
  let evaluationResult = null;
  let governanceClassification = "A_NO_EVIDENCE";

  if (offlineEligibleHistories.length === 0) {
    stoppedReason =
      "Case C: zero History+Sidecar rows are both P2K-C replayEligible and offline RuleResult-rebuildable. No sealed cohort created; A/C Replay not executed; P2K-G metrics NOT_AVAILABLE.";
  } else {
    // Build a SEALED cohort ONLY from offline-rebuildable histories using
    // existing P2K-E primitives (select + build + save). Still requires each
    // member to pass P2K-C inside selectReplayCohortMembers.
    const stamp = Date.now();
    const cohortId = `p2k.g.validation.real.${stamp}`;
    const specification = createDefaultReplayCohortSpecification({
      sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
    });
    const sidecarsByHistoryId = new Map();
    for (const history of offlineEligibleHistories) {
      sidecarsByHistoryId.set(
        history.historyId,
        await db.projectionReplaySidecarRepository.findRecordByHistoryId(
          history.historyId,
        ),
      );
    }
    const selection = selectReplayCohortMembers({
      histories: offlineEligibleHistories,
      sidecarsByHistoryId,
      specification,
    });
    const now = new Date().toISOString();
    const cohort = buildReplayCohort({
      cohortId,
      status: "SEALED",
      selection,
      createdAt: now,
      membershipCreatedAt: now,
      sealedAt: now,
    });
    // Digest recompute check
    const digest = computeReplayCohortMembershipDigestSha256({
      specification: cohort.specification,
      members: cohort.members,
    });
    const saved = await db.replayCohortRepository.save(cohort);
    cohortResult = {
      cohortId: saved.cohortId,
      status: saved.status,
      memberCount: saved.members.length,
      membershipDigestSha256: saved.membershipDigestSha256,
      digestMatches: saved.membershipDigestSha256 === digest,
      eligibilityContractVersion: REPLAY_ELIGIBILITY_CONTRACT_VERSION,
    };

    if (saved.members.length === 0) {
      stoppedReason =
        "Offline-rebuildable histories produced empty P2K-C selection; no cohort members.";
    } else {
      try {
        const pair = await executeSealedCohortOfflineReplayPair({
          cohortId: saved.cohortId,
          baselineReplayRunId: `run.p2k.g.recovery.${stamp}.a`,
          candidateReplayRunId: `run.p2k.g.recovery.${stamp}.c`,
          cohortRepository: db.replayCohortRepository,
          historyRepository: db.evaluationHistoryRepository,
          sidecarRepository: db.projectionReplaySidecarRepository,
          replayRunRepository: db.replayRunRepository,
          clock: () => new Date().toISOString(),
        });
        if (!pair.ok) {
          pairResult = {
            ok: false,
            error: { code: pair.error.code, message: pair.error.message },
          };
          stoppedReason = "P2K-F pair failed closed.";
        } else {
          pairResult = {
            ok: true,
            baselineReplayRunId: pair.baseline.replayRunId,
            candidateReplayRunId: pair.candidate.replayRunId,
            baselineLabel: pair.baseline.matchScriptCalibrationLabel,
            candidateLabel: pair.candidate.matchScriptCalibrationLabel,
            baselineSuccess: pair.baseline.successCount,
            baselineFailure: pair.baseline.failureCount,
            candidateSuccess: pair.candidate.successCount,
            candidateFailure: pair.candidate.failureCount,
            pairedSameContext: pair.pairs.every(
              (p) =>
                p.baseline.status !== "success" ||
                p.candidate.status !== "success" ||
                p.sameHistoricalContext,
            ),
            productionPromotedBaseline: pair.baseline.productionPromoted,
            productionPromotedCandidate: pair.candidate.productionPromoted,
          };

          const evaluation = await computeSealedCohortPopulationEvaluation({
            evaluationRunId: `eval.p2k.g.recovery.${stamp}`,
            cohortId: saved.cohortId,
            baselineReplayRunId: pair.baseline.replayRunId,
            candidateReplayRunId: pair.candidate.replayRunId,
            computedAt: new Date().toISOString(),
            cohortRepository: db.replayCohortRepository,
            replayRunRepository: db.replayRunRepository,
            historyRepository: db.evaluationHistoryRepository,
            populationEvaluationRepository: db.populationEvaluationRepository,
          });
          if (!evaluation.ok) {
            evaluationResult = {
              ok: false,
              error: {
                code: evaluation.error.code,
                message: evaluation.error.message,
              },
            };
            stoppedReason = "P2K-G evaluation failed closed.";
          } else {
            const n = evaluation.value.coverage.finalEvaluationSampleSize;
            governanceClassification =
              n === 0
                ? "A_NO_EVIDENCE"
                : n < 30
                  ? "B_INSUFFICIENT_EVIDENCE"
                  : "C_DESCRIPTIVE_EVIDENCE";
            evaluationResult = {
              ok: true,
              evaluationRunId: evaluation.value.evaluationRunId,
              coverage: evaluation.value.coverage,
              comparisons: evaluation.value.comparisons.map((row) => ({
                metricId: row.metricId,
                baseline: row.baseline,
                candidate: row.candidate,
                deltaCMinusA: row.delta ?? null,
              })),
              winnerBreakdown: evaluation.value.winnerBreakdown,
              candidateCProductionPromoted:
                evaluation.value.candidateCProductionPromoted,
              productionMatchScriptUnchanged:
                evaluation.value.productionMatchScriptUnchanged,
              checksum: evaluation.value.checksum,
              limitations: evaluation.value.limitations,
            };
          }
        }
      } catch (error) {
        pairResult = {
          ok: false,
          threw: true,
          error: {
            name: error?.name ?? "Error",
            message: error?.message ?? String(error),
          },
        };
        stoppedReason =
          "P2K-F threw (not silently skipped). See error; historical Sidecars were not repaired.";
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        environment: {
          host: new URL(databaseUrl).host,
          database: new URL(databaseUrl).pathname.replace(/^\//, ""),
          executedAt: new Date().toISOString(),
        },
        population: {
          historyRowsInspected: historyRows.rows.length,
          sidecarRowsInspected: sidecarCount,
          replayComplete,
          outcomeEvaluable,
          replayEligibleP2kC: replayEligible,
          offlineRuleRebuildable: offlineRebuildable,
          offlineReplayEligible: offlineEligibleHistories.length,
          missingSidecar,
          invalidHash,
          invalidRuleIdIssueCount: invalidRuleId,
          invalidScoreIssueCount: invalidScore,
          p2kCReasonCounts: Object.fromEntries(reasonCounts),
          distinctStoredRules: distinctRules,
        },
        inventoryClasses: {
          OFFLINE_REPLAY_ELIGIBLE: inventory.filter(
            (r) => r.validationClass === "OFFLINE_REPLAY_ELIGIBLE",
          ).length,
          REPLAY_INELIGIBLE_INVALID_RULE_CONTRACT: inventory.filter(
            (r) => r.validationClass === "REPLAY_INELIGIBLE_INVALID_RULE_CONTRACT",
          ).length,
          REPLAY_INELIGIBLE: inventory.filter(
            (r) => r.validationClass === "REPLAY_INELIGIBLE",
          ).length,
        },
        inventory: inventory.map((row) => ({
          historyId: row.historyId,
          matchId: row.matchId,
          replayComplete: row.replayComplete,
          outcomeEvaluable: row.outcomeEvaluable,
          replayEligible: row.replayEligible,
          validationClass: row.validationClass,
          offlineRuleIssues: row.offlineRuleIssues.map((issue) => ({
            code: issue.code,
            ruleId: issue.ruleId,
            message: issue.message,
          })),
          p2kCReasons: row.p2kCReasons,
        })),
        stoppedReason,
        cohortResult,
        pairResult,
        evaluationResult,
        governanceClassification,
        production: {
          governedIsBaselineA:
            GOVERNED_MATCH_SCRIPT_PARAMETER_SET ===
            MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
          productionResolverIsBaselineA:
            getProductionMatchScriptParameterSet() ===
            MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
          candidateCDistinct:
            MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET !==
            GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
          candidateCProductionPromoted:
            R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE.candidateC.productionPromoted,
        },
        p2kHAuthorized: false,
        candidateCNotPromoted: true,
      },
      null,
      2,
    ),
  );

  await db.lifecycle.disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
