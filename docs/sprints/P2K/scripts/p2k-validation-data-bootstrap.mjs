/**
 * P2K Validation Data Bootstrap (Option B)
 *
 * Runs real Import → AnalyzeMatch → ReportBuilder → GenerateMatchReportUseCase
 * against fixture match-example-* IDs with attached MATCH_RESULT FT outcomes,
 * writing NEW History + Sidecar rows into fas_validation.
 *
 * Does NOT update/delete existing fixture Sidecars.
 * Does NOT promote Candidate C.
 * Does NOT run P2K-E / P2K-F / P2K-G.
 */
import {
  assessSealedReplayRuleRebuild,
  GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
  MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
  MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
  R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE,
} from "../../../../packages/analysis/dist/index.js";
import { createFasDatabase } from "../../../../packages/database/dist/src/index.js";
import {
  bootstrapValidationHistorySidecar,
  DEFAULT_VALIDATION_BOOTSTRAP_MATCH_IDS,
} from "../../../../packages/report/dist/index.js";
import {
  assessProjectionReplayEligibility,
  computeProjectionReplaySidecarContentSha256,
} from "../../../../packages/statistics/dist/index.js";
import pg from "../../../../packages/database/node_modules/pg/lib/index.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation";

async function main() {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = createFasDatabase(databaseUrl);
  await db.lifecycle.ping();

  const before = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM evaluation_history_items) AS history,
      (SELECT COUNT(*)::int FROM projection_replay_sidecar_items) AS sidecar,
      (SELECT COUNT(*)::int FROM evaluation_history_items
        WHERE match_id LIKE 'match-example%') AS example_history,
      (SELECT COUNT(*)::int FROM projection_replay_sidecar_items
        WHERE context_json::text LIKE '%rule-p2k%'
           OR context_json::text LIKE '%"ruleId": "rule-1"%'
           OR context_json::text LIKE '%"ruleId":"rule-1"%') AS invalid_fixture_sidecar
  `);
  const beforeRow = before.rows[0];

  console.log(
    JSON.stringify(
      {
        phase: "before",
        history: beforeRow.history,
        sidecar: beforeRow.sidecar,
        exampleHistory: beforeRow.example_history,
        invalidFixtureSidecar: beforeRow.invalid_fixture_sidecar,
      },
      null,
      2,
    ),
  );

  const bootstrap = await bootstrapValidationHistorySidecar({
    matchIds: DEFAULT_VALIDATION_BOOTSTRAP_MATCH_IDS,
    historyRepository: db.evaluationHistoryRepository,
    sidecarRepository: db.projectionReplaySidecarRepository,
  });

  let replayComplete = 0;
  let replayEligible = 0;
  let offlineRebuildable = 0;
  const details = [];

  for (const row of bootstrap.matchResults) {
    if (!row.ok || row.historyId === undefined) {
      details.push({
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
      details.push({
        matchId: row.matchId,
        ok: false,
        error: "persisted row missing after bootstrap",
      });
      continue;
    }

    const eligibility = assessProjectionReplayEligibility({
      history,
      sidecar,
      hashContext: computeProjectionReplaySidecarContentSha256,
    });
    const rebuild = assessSealedReplayRuleRebuild(sidecar.context);
    if (eligibility.replayComplete) replayComplete += 1;
    if (eligibility.replayEligible) replayEligible += 1;
    if (rebuild.rebuildable) offlineRebuildable += 1;

    details.push({
      matchId: row.matchId,
      ok: true,
      historyId: row.historyId,
      featureModelVersion: row.featureModelVersion,
      sidecarContentSha256: row.sidecarContentSha256,
      rules: row.rules.map((rule) => ({
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        status: rule.status,
        score: rule.score,
        weight: rule.weight,
        catalogValid: rule.catalogValid,
        passScoreEqualsWeight: rule.passScoreEqualsWeight,
      })),
      replayComplete: eligibility.replayComplete,
      replayEligible: eligibility.replayEligible,
      offlineRebuildable: rebuild.rebuildable,
    });
  }

  const after = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM evaluation_history_items) AS history,
      (SELECT COUNT(*)::int FROM projection_replay_sidecar_items) AS sidecar,
      (SELECT COUNT(*)::int FROM evaluation_history_items
        WHERE match_id LIKE 'match-example%') AS example_history,
      (SELECT COUNT(*)::int FROM projection_replay_sidecar_items
        WHERE context_json::text LIKE '%rule-p2k%'
           OR context_json::text LIKE '%"ruleId": "rule-1"%'
           OR context_json::text LIKE '%"ruleId":"rule-1"%') AS invalid_fixture_sidecar
  `);
  const afterRow = after.rows[0];

  const summary = {
    REAL_ANALYZEMATCH_BOOTSTRAP_AVAILABLE: true,
    option: bootstrap.option,
    historyCreatedOrIdempotent: bootstrap.historyCreatedOrIdempotent,
    sidecarCreatedOrIdempotent: bootstrap.sidecarCreatedOrIdempotent,
    allCatalogValid: bootstrap.allCatalogValid,
    historyAdded: afterRow.history - beforeRow.history,
    sidecarAdded: afterRow.sidecar - beforeRow.sidecar,
    exampleHistoryAfter: afterRow.example_history,
    invalidFixtureSidecarBefore: beforeRow.invalid_fixture_sidecar,
    invalidFixtureSidecarAfter: afterRow.invalid_fixture_sidecar,
    invalidFixturesUntouched:
      beforeRow.invalid_fixture_sidecar === afterRow.invalid_fixture_sidecar,
    bootstrapReplayComplete: replayComplete,
    bootstrapReplayEligible: replayEligible,
    bootstrapOfflineRebuildable: offlineRebuildable,
    candidateCProductionPromoted:
      R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE.candidateC.productionPromoted,
    productionBaselineA:
      GOVERNED_MATCH_SCRIPT_PARAMETER_SET === MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
    candidateCIsNotGoverned:
      MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET !==
      GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
    p2kHAuthorized: false,
    details,
  };

  console.log(JSON.stringify(summary, null, 2));

  await db.lifecycle.disconnect();
  await pool.end();

  if (
    !bootstrap.allCatalogValid ||
    bootstrap.historyCreatedOrIdempotent < 1 ||
    offlineRebuildable < 1 ||
    beforeRow.invalid_fixture_sidecar !== afterRow.invalid_fixture_sidecar
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
