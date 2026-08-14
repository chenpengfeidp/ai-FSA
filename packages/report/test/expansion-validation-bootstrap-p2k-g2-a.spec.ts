import {
  assessOfflineReplayExecutability,
  GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
  MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
  MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
  R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE,
  runOfflineMatchScriptReplay,
} from "@fas/analysis";
import {
  assessProjectionReplayEligibility,
  computeProjectionReplaySidecarContentSha256,
  InMemoryEvaluationHistoryRepository,
  InMemoryProjectionReplaySidecarRepository,
} from "@fas/statistics";
import { describe, expect, it } from "vitest";

import {
  EXPANSION_V2_MATCH_IDS,
  EXPANSION_V2_OUTCOMES,
  EXPANSION_V2_PROJECTION_POLICY_PIN,
  EXPANSION_V2_TEMPLATES,
  bootstrapExpansionV2ValidationHistorySidecar,
} from "../src/index.js";

describe("P2K-G2-A Validation Dataset Diversity Expansion Bootstrap", () => {
  it("persists catalog-valid Sidecars with parameter provenance via AnalyzeMatch v2", async () => {
    const historyRepository = new InMemoryEvaluationHistoryRepository();
    const sidecarRepository = new InMemoryProjectionReplaySidecarRepository();

    const result = await bootstrapExpansionV2ValidationHistorySidecar({
      matchIds: ["match-p2kg-expansion-v2-1", "match-p2kg-expansion-v2-2"],
      historyRepository,
      sidecarRepository,
    });

    expect(result.slice).toBe("P2K-G2-A");
    expect(result.projectionPolicyPin).toBe(EXPANSION_V2_PROJECTION_POLICY_PIN);
    expect(result.realAnalyzeMatchPath).toBe(true);
    expect(result.historyCreatedOrIdempotent).toBe(2);
    expect(result.sidecarCreatedOrIdempotent).toBe(2);
    expect(result.allCatalogValid).toBe(true);
    expect(result.allParameterProvenanceComplete).toBe(true);
    expect(result.existingFixturesUntouched).toBe(true);
    expect(result.cohortCreated).toBe(false);
    expect(result.p2kEExecuted).toBe(false);
    expect(result.p2kFExecuted).toBe(false);
    expect(result.p2kGPopulationExecuted).toBe(false);
    expect(result.p2kHAuthorized).toBe(false);

    for (const row of result.matchResults) {
      expect(row.ok).toBe(true);
      expect(row.matchId.startsWith("match-p2kg-expansion-v2-")).toBe(true);
      expect(row.matchId.startsWith("match-example-")).toBe(false);
      expect(row.matchId.startsWith("match-p2kg-recovery-v2-")).toBe(false);
      expect(row.historyId).toBeTruthy();
      expect(row.parameterProvenance?.complete).toBe(true);
      expect(row.parameterProvenance?.parameterVersionLabel).toBeTruthy();
      expect(row.parameterProvenance?.parameterArtifactId).toBeTruthy();
      expect(row.parameterProvenance?.parameterArtifactChecksum).toBeTruthy();
      expect(row.rules.every((rule) => rule.catalogValid)).toBe(true);
      for (const rule of row.rules) {
        if (rule.status === "PASS") {
          expect(rule.score).toBe(rule.weight);
        }
      }

      const historyId = row.historyId;
      expect(historyId).toBeTruthy();
      if (historyId === undefined) {
        continue;
      }
      const history = await historyRepository.findByHistoryId(historyId);
      const sidecar = await sidecarRepository.findRecordByHistoryId(historyId);
      expect(history).toBeDefined();
      expect(sidecar).toBeDefined();
      if (history === undefined || sidecar === undefined) {
        continue;
      }

      const p2kC = assessProjectionReplayEligibility({
        history,
        sidecar,
        hashContext: computeProjectionReplaySidecarContentSha256,
      });
      expect(p2kC.replayComplete).toBe(true);
      expect(p2kC.outcomeEvaluable).toBe(true);
      expect(p2kC.replayEligible).toBe(true);

      const executable = assessOfflineReplayExecutability({ history, sidecar });
      expect(executable.offlineReplayExecutable).toBe(true);
      expect(executable.ruleResultRebuildable).toBe(true);
      expect(executable.parameterProvenance.complete).toBe(true);
      expect(executable.reasons).toEqual([]);

      const offlineA = runOfflineMatchScriptReplay({
        history,
        sidecar,
        matchScriptCalibrationLabel: "r1b.candidate.a.baseline",
      });
      expect(offlineA.ok).toBe(true);
    }

    expect(GOVERNED_MATCH_SCRIPT_PARAMETER_SET).toBe(
      MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
    );
    expect(MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET).not.toBe(
      GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
    );
    expect(
      R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE.candidateC.productionPromoted,
    ).toBe(false);
  });

  it("defines 30 distinct templates with a balanced deterministic outcome map", () => {
    expect(EXPANSION_V2_MATCH_IDS).toHaveLength(30);
    expect(new Set(EXPANSION_V2_MATCH_IDS).size).toBe(30);

    const home = Object.values(EXPANSION_V2_OUTCOMES).filter(
      (outcome) => outcome.winner === "home",
    ).length;
    const draw = Object.values(EXPANSION_V2_OUTCOMES).filter(
      (outcome) => outcome.winner === "draw",
    ).length;
    const away = Object.values(EXPANSION_V2_OUTCOMES).filter(
      (outcome) => outcome.winner === "away",
    ).length;
    expect(home).toBeGreaterThanOrEqual(7);
    expect(draw).toBeGreaterThanOrEqual(6);
    expect(away).toBeGreaterThanOrEqual(7);

    const totals = new Set(
      Object.values(EXPANSION_V2_OUTCOMES).map(
        (outcome) => outcome.homeGoals + outcome.awayGoals,
      ),
    );
    expect(totals.has(0)).toBe(true);
    expect(totals.has(1)).toBe(true);
    expect(totals.has(2)).toBe(true);
    expect(totals.has(3)).toBe(true);
    expect([...totals].some((total) => total >= 4)).toBe(true);

    // Every template is a distinct shape (home/away/form/stats/odds differ).
    const shapes = EXPANSION_V2_MATCH_IDS.map(
      (matchId) => EXPANSION_V2_TEMPLATES[matchId],
    );
    expect(shapes.every((shape) => shape !== undefined)).toBe(true);
    const keys = shapes.map((shape) =>
      JSON.stringify({
        home: shape.home,
        away: shape.away,
        teamForm: shape.teamForm,
        statistics: shape.statistics,
        headToHead: shape.headToHead,
        odds: shape.odds,
      }),
    );
    expect(new Set(keys).size).toBe(30);
  });

  it("uses isolated expansion namespace (no reuse of legacy namespaces)", () => {
    for (const matchId of EXPANSION_V2_MATCH_IDS) {
      expect(matchId.startsWith("match-p2kg-expansion-v2-")).toBe(true);
      expect(matchId.includes("match-example")).toBe(false);
      expect(matchId.includes("match-p2kg-recovery-v2")).toBe(false);
    }
  });
});
