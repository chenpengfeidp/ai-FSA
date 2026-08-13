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
  bootstrapProjectionV2ValidationHistorySidecar,
  P2KG_RECOVERY_V2_MATCH_IDS,
  P2KG_RECOVERY_V2_PROJECTION_POLICY_PIN,
} from "../src/index.js";

describe("P2K-G-RECOVERY Projection V2 Validation Data Bootstrap", () => {
  it("persists catalog-valid Sidecars with parameter provenance via AnalyzeMatch v2", async () => {
    const historyRepository = new InMemoryEvaluationHistoryRepository();
    const sidecarRepository = new InMemoryProjectionReplaySidecarRepository();

    const result = await bootstrapProjectionV2ValidationHistorySidecar({
      matchIds: ["match-p2kg-recovery-v2-1", "match-p2kg-recovery-v2-2"],
      historyRepository,
      sidecarRepository,
    });

    expect(result.slice).toBe("P2K-G-RECOVERY");
    expect(result.projectionPolicyPin).toBe(P2KG_RECOVERY_V2_PROJECTION_POLICY_PIN);
    expect(result.realAnalyzeMatchPath).toBe(true);
    expect(result.historyCreatedOrIdempotent).toBe(2);
    expect(result.sidecarCreatedOrIdempotent).toBe(2);
    expect(result.allCatalogValid).toBe(true);
    expect(result.allParameterProvenanceComplete).toBe(true);
    expect(result.existingV1BootstrapUntouched).toBe(true);
    expect(result.cohortCreated).toBe(false);
    expect(result.p2kEExecuted).toBe(false);
    expect(result.p2kFExecuted).toBe(false);
    expect(result.p2kGPopulationExecuted).toBe(false);

    for (const row of result.matchResults) {
      expect(row.ok).toBe(true);
      expect(row.matchId.startsWith("match-p2kg-recovery-v2-")).toBe(true);
      expect(row.matchId.startsWith("match-example-")).toBe(false);
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

  it("uses isolated recovery match namespace", () => {
    for (const matchId of P2KG_RECOVERY_V2_MATCH_IDS) {
      expect(matchId.startsWith("match-p2kg-recovery-v2-")).toBe(true);
      expect(matchId.includes("match-example")).toBe(false);
    }
  });
});
