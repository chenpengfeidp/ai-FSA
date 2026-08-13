/**
 * P2K-G-RECOVERY — Projection V2 Validation Data Bootstrap (live).
 *
 * Writes NEW match-p2kg-recovery-v2-* History+Sidecar rows via AnalyzeMatch
 * with projectionPolicyPin=v2. Inventories eligibility / offline executability.
 * Does NOT create cohort / run P2K-E / F / G population / H.
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
  bootstrapProjectionV2ValidationHistorySidecar,
  P2KG_RECOVERY_V2_MATCH_IDS,
} from "../../../../packages/report/dist/index.js";
import {
  assessProjectionReplayEligibility,
  computeProjectionReplaySidecarContentSha256,
} from "../../../../packages/statistics/dist/index.js";
import pg from "../../../../packages/database/node_modules/pg/lib/index.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation";

const V1_COHORT_ID = "p2k.e.validation.bootstrap.analyzematch.v1";
const V1_DIGEST = "abdd11ec5c230655dc61800d6f2462a3237f2acb57ca22ef23374e9d9b9bfb7c";
const V1_MATCH_PREFIX = "match-example-";

async function main() {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = createFasDatabase(databaseUrl);
  await db.lifecycle.ping();

  const before = await pool.query(
    `
    SELECT
      (SELECT COUNT(*)::int FROM evaluation_history_items) AS history,
      (SELECT COUNT(*)::int FROM projection_replay_sidecar_items) AS sidecar,
      (SELECT COUNT(*)::int FROM evaluation_history_items
        WHERE match_id LIKE 'match-example%') AS v1_example_history,
      (SELECT COUNT(*)::int FROM evaluation_history_items
        WHERE match_id LIKE 'match-p2kg-recovery-v2-%') AS recovery_history,
      (SELECT membership_digest_sha256 FROM replay_cohort_items
        WHERE cohort_id = $1) AS cohort_digest,
      (SELECT status FROM replay_cohort_items WHERE cohort_id = $1) AS cohort_status
  `,
    [V1_COHORT_ID],
  );
  const beforeRow = before.rows[0];

  const bootstrap = await bootstrapProjectionV2ValidationHistorySidecar({
    matchIds: P2KG_RECOVERY_V2_MATCH_IDS,
    historyRepository: db.evaluationHistoryRepository,
    sidecarRepository: db.projectionReplaySidecarRepository,
  });

  const inventory = [];
  let replayComplete = 0;
  let outcomeEvaluable = 0;
  let replayEligible = 0;
  let ruleRebuildable = 0;
  let parameterComplete = 0;
  let offlineExecutable = 0;
  let offlineASmokeOk = 0;

  for (const row of bootstrap.matchResults) {
    if (!row.ok || row.historyId === undefined) {
      inventory.push({
        matchId: row.matchId,
        ok: false,
        error: row.error,
      });
      continue;
    }

    const history = await db.evaluationHistoryRepository.findByHistoryId(
      row.historyId,
    );
    const sidecar = await db.projectionReplaySidecarRepository.findRecordByHistoryId(
      row.historyId,
    );
    if (history === undefined || sidecar === undefined) {
      inventory.push({
        matchId: row.matchId,
        ok: false,
        error: "missing persisted history/sidecar after bootstrap",
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
    if (p2kC.outcomeEvaluable) outcomeEvaluable += 1;
    if (p2kC.replayEligible) replayEligible += 1;
    if (executable.ruleResultRebuildable) ruleRebuildable += 1;
    if (executable.parameterProvenance.complete) parameterComplete += 1;
    if (executable.offlineReplayExecutable) offlineExecutable += 1;
    if (offlineA.ok) offlineASmokeOk += 1;

    inventory.push({
      matchId: row.matchId,
      historyId: row.historyId,
      ok: true,
      featureModelVersion: row.featureModelVersion,
      parameterProvenance: row.parameterProvenance,
      replayComplete: p2kC.replayComplete,
      outcomeEvaluable: p2kC.outcomeEvaluable,
      replayEligible: p2kC.replayEligible,
      ruleResultRebuildable: executable.ruleResultRebuildable,
      offlineReplayExecutable: executable.offlineReplayExecutable,
      offlineExecReasons: executable.reasons,
      offlineASmokeOk: offlineA.ok,
      catalogRuleSample: row.rules.slice(0, 3).map((rule) => ({
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        status: rule.status,
        score: rule.score,
        weight: rule.weight,
      })),
    });
  }

  const after = await pool.query(
    `
    SELECT
      (SELECT COUNT(*)::int FROM evaluation_history_items) AS history,
      (SELECT COUNT(*)::int FROM projection_replay_sidecar_items) AS sidecar,
      (SELECT COUNT(*)::int FROM evaluation_history_items
        WHERE match_id LIKE 'match-example%') AS v1_example_history,
      (SELECT COUNT(*)::int FROM evaluation_history_items
        WHERE match_id LIKE 'match-p2kg-recovery-v2-%') AS recovery_history,
      (SELECT membership_digest_sha256 FROM replay_cohort_items
        WHERE cohort_id = $1) AS cohort_digest,
      (SELECT status FROM replay_cohort_items WHERE cohort_id = $1) AS cohort_status,
      (SELECT COUNT(*)::int FROM replay_cohort_member_items m
        JOIN replay_cohort_items c ON c.cohort_id = m.cohort_id
        WHERE c.cohort_id = $1) AS cohort_member_count
  `,
    [V1_COHORT_ID],
  );
  const afterRow = after.rows[0];

  const readyForNewSealedCohort =
    bootstrap.allCatalogValid &&
    bootstrap.allParameterProvenanceComplete &&
    offlineExecutable === bootstrap.historyCreatedOrIdempotent &&
    offlineExecutable >= 1 &&
    offlineASmokeOk === offlineExecutable;

  const summary = {
    slice: "P2K-G-RECOVERY",
    projectionPolicyPin: bootstrap.projectionPolicyPin,
    historyCreatedOrIdempotent: bootstrap.historyCreatedOrIdempotent,
    sidecarCreatedOrIdempotent: bootstrap.sidecarCreatedOrIdempotent,
    historyAdded: afterRow.history - beforeRow.history,
    sidecarAdded: afterRow.sidecar - beforeRow.sidecar,
    recoveryHistoryAfter: afterRow.recovery_history,
    allCatalogValid: bootstrap.allCatalogValid,
    allParameterProvenanceComplete: bootstrap.allParameterProvenanceComplete,
    inventoryCounts: {
      replayComplete,
      outcomeEvaluable,
      replayEligible,
      ruleResultRebuildable: ruleRebuildable,
      parameterProvenanceComplete: parameterComplete,
      offlineReplayExecutable: offlineExecutable,
      offlineASmokeOk,
    },
    readyForNewSealedCohort,
    cohortAutoCreated: false,
    p2kEExecuted: false,
    p2kFExecuted: false,
    p2kGPopulationExecuted: false,
    p2kHAuthorized: false,
    oldV1Untouched: {
      exampleHistoryBefore: beforeRow.v1_example_history,
      exampleHistoryAfter: afterRow.v1_example_history,
      exampleHistoryUnchanged:
        beforeRow.v1_example_history === afterRow.v1_example_history,
      sealedCohortId: V1_COHORT_ID,
      sealedCohortStatus: afterRow.cohort_status,
      sealedCohortDigestUnchanged: afterRow.cohort_digest === V1_DIGEST,
      sealedCohortMemberCount: afterRow.cohort_member_count,
      noRecoveryIdsInV1Namespace: P2KG_RECOVERY_V2_MATCH_IDS.every(
        (id) => !id.startsWith(V1_MATCH_PREFIX),
      ),
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
    },
    inventory,
  };

  console.log(JSON.stringify(summary, null, 2));

  await db.lifecycle.disconnect();
  await pool.end();

  if (
    !readyForNewSealedCohort ||
    !summary.oldV1Untouched.exampleHistoryUnchanged ||
    !summary.oldV1Untouched.sealedCohortDigestUnchanged ||
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
