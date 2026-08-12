import { assessSealedReplayRuleRebuild } from "@fas/analysis";
import {
  GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
  MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
  MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
  R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE,
} from "@fas/analysis";
import {
  assessProjectionReplayEligibility,
  computeProjectionReplaySidecarContentSha256,
  InMemoryEvaluationHistoryRepository,
  InMemoryProjectionReplaySidecarRepository,
} from "@fas/statistics";
import { describe, expect, it } from "vitest";

import {
  bootstrapValidationHistorySidecar,
  DEFAULT_VALIDATION_BOOTSTRAP_MATCH_IDS,
  VALIDATION_BOOTSTRAP_MATCH_RESULT_PROVIDER_SOURCE,
} from "../src/index.js";

describe("P2K Validation Data Bootstrap (Option B)", () => {
  it("uses real AnalyzeMatch path and persists catalog-valid History + Sidecar", async () => {
    const historyRepository = new InMemoryEvaluationHistoryRepository();
    const sidecarRepository = new InMemoryProjectionReplaySidecarRepository();

    const first = await bootstrapValidationHistorySidecar({
      matchIds: ["match-example-2", "match-example-3"],
      historyRepository,
      sidecarRepository,
    });

    expect(first.option).toBe("B");
    expect(first.realAnalyzeMatchPath).toBe(true);
    expect(first.historyCreatedOrIdempotent).toBe(2);
    expect(first.sidecarCreatedOrIdempotent).toBe(2);
    expect(first.allCatalogValid).toBe(true);
    expect(first.existingFixturesUntouched).toBe(true);
    expect(first.candidateCProductionPromoted).toBe(false);
    expect(first.productionMatchScriptUnchanged).toBe(true);

    for (const row of first.matchResults) {
      expect(row.ok).toBe(true);
      expect(row.historyId).toBeTruthy();
      expect(row.featureModelVersion).toMatch(/^feature\.v2\./);
      expect(row.featureModelVersion).not.toBe("feature.v2.test");
      expect(row.sidecarContentSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.rules.length).toBeGreaterThan(0);
      expect(row.rules.every((rule) => rule.ruleId.startsWith("rule:"))).toBe(true);
      for (const rule of row.rules) {
        expect(rule.catalogValid).toBe(true);
        expect(rule.ruleId === "rule-1" || rule.ruleId === "rule-p2k").toBe(false);
        if (rule.status === "PASS") {
          expect(rule.passScoreEqualsWeight).toBe(true);
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

      expect(sidecar.matchId).toBe(history.matchId);
      expect(sidecar.contentSha256).toBe(
        computeProjectionReplaySidecarContentSha256(sidecar.context),
      );

      const eligibility = assessProjectionReplayEligibility({
        history,
        sidecar,
        hashContext: computeProjectionReplaySidecarContentSha256,
      });
      expect(eligibility.replayComplete).toBe(true);
      expect(eligibility.outcomeEvaluable).toBe(true);
      expect(eligibility.replayEligible).toBe(true);
      expect(assessSealedReplayRuleRebuild(sidecar.context).rebuildable).toBe(true);
    }

    const second = await bootstrapValidationHistorySidecar({
      matchIds: ["match-example-2", "match-example-3"],
      historyRepository,
      sidecarRepository,
    });
    expect(second.historyCreatedOrIdempotent).toBe(2);
    expect(second.matchResults.map((row) => row.historyId)).toEqual(
      first.matchResults.map((row) => row.historyId),
    );

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

  it("default match set is isolated from persistence-test match-p2k-* ids", () => {
    for (const matchId of DEFAULT_VALIDATION_BOOTSTRAP_MATCH_IDS) {
      expect(matchId.startsWith("match-example-")).toBe(true);
      expect(matchId.includes("p2k")).toBe(false);
    }
    expect(VALIDATION_BOOTSTRAP_MATCH_RESULT_PROVIDER_SOURCE).toBe(
      "validation-bootstrap",
    );
  });
});
