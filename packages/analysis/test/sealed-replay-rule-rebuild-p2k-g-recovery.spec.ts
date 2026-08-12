import { createMatchId } from "@fas/match";
import { createRuleResult, RuleResultValidationError } from "@fas/rule";
import {
  PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
  type SealedProjectionReplayContext,
} from "@fas/statistics";
import { describe, expect, it } from "vitest";

import {
  assessSealedReplayRuleRebuild,
  buildRuleResultsFromSealedReplayContext,
} from "../src/index.js";

function fixtureContext(
  overrides: Partial<SealedProjectionReplayContext> &
    Pick<SealedProjectionReplayContext, "rules">,
): SealedProjectionReplayContext {
  return Object.freeze({
    matchId: "match-rule-rebuild",
    featureModelVersion: "feature.v2.test",
    featureBundleChecksum: "fb",
    featureBundleStatus: "completed_nonempty",
    evidenceRefs: Object.freeze(["ev-1"]),
    features: Object.freeze([
      Object.freeze({ name: "attackRatingHome", value: 1.1 }),
    ]),
    requiredEvidencePresentCount: 5,
    generatedAt: "2026-08-12T12:00:00.000Z",
    parameterArtifactId: "artifact-1",
    parameterVersionLabel: "projection.v3.replay",
    parameterArtifactChecksum: "param-1",
    ...overrides,
  });
}

describe("P2K-G recovery — RuleResult rebuild root cause", () => {
  it("rejects persistence-fixture ruleId rule-1 (live validation failure)", () => {
    const context = fixtureContext({
      rules: Object.freeze([
        Object.freeze({
          ruleId: "rule-1",
          ruleName: "HOME_ATTACK_EDGE",
          status: "PASS" as const,
          channel: "home+" as const,
          weight: 1,
          score: 0.3,
        }),
      ]),
    });

    expect(() => buildRuleResultsFromSealedReplayContext(context)).toThrow(
      RuleResultValidationError,
    );
    expect(() => buildRuleResultsFromSealedReplayContext(context)).toThrow(
      /ruleId is invalid/,
    );

    const assessment = assessSealedReplayRuleRebuild(context);
    expect(assessment.rebuildable).toBe(false);
    expect(assessment.issues[0]?.code).toBe("INVALID_RULE_ID");
    expect(assessment.issues[0]?.ruleId).toBe("rule-1");
  });

  it("rejects persistence-fixture ruleId rule-p2k", () => {
    const context = fixtureContext({
      rules: Object.freeze([
        Object.freeze({
          ruleId: "rule-p2k",
          ruleName: "HOME_ATTACK_EDGE",
          status: "PASS" as const,
          channel: "home+" as const,
          weight: 1,
          score: 0.3,
        }),
      ]),
    });

    const assessment = assessSealedReplayRuleRebuild(context);
    expect(assessment.rebuildable).toBe(false);
    expect(assessment.issues.map((issue) => issue.code)).toContain(
      "INVALID_RULE_ID",
    );
  });

  it("accepts catalog ruleId rule:home-attack-edge:v1 with PASS score=weight", () => {
    const context = fixtureContext({
      rules: Object.freeze([
        Object.freeze({
          ruleId: "rule:home-attack-edge:v1",
          ruleName: "HOME_ATTACK_EDGE",
          status: "PASS" as const,
          channel: "home+" as const,
          weight: 1,
          score: 1,
        }),
      ]),
    });

    const rebuilt = buildRuleResultsFromSealedReplayContext(context);
    expect(rebuilt).toHaveLength(1);
    expect(rebuilt[0]?.ruleId).toBe("rule:home-attack-edge:v1");
    expect(assessSealedReplayRuleRebuild(context).rebuildable).toBe(true);
  });

  it("documents expected createRuleResult contract vs stored fixture shape", () => {
    // Expected catalog shape (what real AnalyzeMatch → Sidecar stores).
    const valid = createRuleResult({
      ruleId: "rule:home-attack-edge:v1",
      matchId: createMatchId("match-rule-rebuild"),
      ruleName: "HOME_ATTACK_EDGE",
      status: "PASS",
      score: 1,
      weight: 1,
      channel: "home+",
      explanation: "ok",
      sourceFeatureIds: [],
      evaluatedAt: "2026-08-12T12:00:00.000Z",
    });
    expect(valid.ruleId).toBe("rule:home-attack-edge:v1");

    // Stored fixture shape from fas_validation persistence tests.
    expect(() =>
      createRuleResult({
        ruleId: "rule-1",
        matchId: createMatchId("match-rule-rebuild"),
        ruleName: "HOME_ATTACK_EDGE",
        status: "PASS",
        score: 0.3,
        weight: 1,
        channel: "home+",
        explanation: "fixture",
        sourceFeatureIds: [],
        evaluatedAt: "2026-08-12T12:00:00.000Z",
      }),
    ).toThrow(/ruleId is invalid/);
  });

  it("does not treat schema version alone as sufficient for offline rebuild", () => {
    expect(PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION).toBe(
      "projection-replay-sidecar.p2k.b",
    );
    // P2K-C may mark non-empty features/rules as replayComplete; P2K-D still
    // requires catalog-valid RuleResult fields at rebuild time.
    const assessment = assessSealedReplayRuleRebuild(
      fixtureContext({
        rules: Object.freeze([
          Object.freeze({
            ruleId: "rule-1",
            ruleName: "HOME_ATTACK_EDGE",
            status: "PASS" as const,
            channel: "home+" as const,
            weight: 1,
            score: 0.3,
          }),
        ]),
      }),
    );
    expect(assessment.rebuildable).toBe(false);
  });
});
