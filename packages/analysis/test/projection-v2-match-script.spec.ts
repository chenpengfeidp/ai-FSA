import { createEvidence } from "@fas/evidence";
import { FeatureExtractor } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { RuleEvaluator } from "@fas/rule";
import { describe, expect, it } from "vitest";
import {
  computeFootballState,
  computeMatchProjection,
  computeProjectionV2,
  generateMatchScriptSet,
  GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
  MATCH_SCRIPT_IDS,
  MATCH_SCRIPT_POLICY_VERSION,
  MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT,
  mergeProbabilityMatrices,
  PROJECTION_FRAMEWORK_VERSION_MULTI_SCRIPT,
  PROJECTION_PARAMS_MATCH_SCRIPT_ARTIFACT_ID,
  buildLambdasV2,
} from "../src/index.js";
import { buildScriptProbabilityMatrix } from "../src/projection-v2/probability-matrix/build-script-probability-matrix.js";

function makeMatchInfo(matchId = createMatchId("match-ms-1")) {
  return createEvidence({
    id: "evidence-1",
    source: "fixture",
    sourceId: "fixture-match-1",
    type: "MATCH_INFO",
    matchId,
    collectedAt: "2026-07-17T10:00:00Z",
    eventTime: "2026-08-01T19:30:00Z",
    freshness: "fresh",
    quality: "unverified",
    provenance: {
      collector: "@fas/evidence-normalizer",
      method: "fixture",
    },
    payload: {
      away: "Chelsea",
      home: "Liverpool",
      kickoff: "2026-08-01T19:30:00Z",
    },
  });
}

function makeSideEvidence(
  matchId: ReturnType<typeof createMatchId>,
  type: "STATISTICS" | "TEAM_FORM",
  side: "away" | "home",
) {
  if (type === "TEAM_FORM") {
    return createEvidence({
      id: `evidence-form-${side}`,
      source: "fixture",
      sourceId: `fixture-form-${side}`,
      type,
      matchId,
      collectedAt: "2026-07-17T10:00:00Z",
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
      },
      payload: {
        teamSide: side,
        window: 5,
        results: ["W", "W", "D", "W", "L"],
        goalsFor: [2, 3, 1, 2, 0],
        goalsAgainst: [0, 1, 1, 1, 1],
      },
    });
  }

  return createEvidence({
    id: `evidence-stats-${side}`,
    source: "fixture",
    sourceId: `fixture-stats-${side}`,
    type,
    matchId,
    collectedAt: "2026-07-17T10:00:00Z",
    eventTime: "2026-08-01T19:30:00Z",
    freshness: "fresh",
    quality: "unverified",
    provenance: {
      collector: "@fas/evidence-normalizer",
      method: "fixture",
    },
    payload: {
      teamSide: side,
      windowMatches: 5,
      shotsForPerMatch: side === "home" ? 15 : 10,
      shotsAgainstPerMatch: side === "home" ? 9 : 14,
      xgForPerMatch: side === "home" ? 1.8 : 1.0,
      xgAgainstPerMatch: side === "home" ? 1.0 : 1.7,
    },
  });
}

function makePipelineInput(matchId = createMatchId("match-ms-1")) {
  const evidenceSet = Object.freeze([
    makeMatchInfo(matchId),
    makeSideEvidence(matchId, "TEAM_FORM", "home"),
    makeSideEvidence(matchId, "TEAM_FORM", "away"),
    makeSideEvidence(matchId, "STATISTICS", "home"),
    makeSideEvidence(matchId, "STATISTICS", "away"),
  ]);
  const featureBundle = new FeatureExtractor().extractBundle(evidenceSet);
  const ruleResults = Object.freeze([
    ...new RuleEvaluator().evaluate(featureBundle.features),
  ]);

  return {
    featureBundle,
    ruleResults,
    requiredEvidencePresentCount: 5,
  };
}

describe("Match Script Generator (P2E)", () => {
  it("activates scripts from Football State only with footballStateRefs", () => {
    const input = makePipelineInput();
    const footballState = computeFootballState({
      featureBundle: input.featureBundle,
      lambdaParameters: MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT.lambda,
    });
    const scriptSet = generateMatchScriptSet({
      footballState,
      parameters: GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
    });

    expect(scriptSet.policyVersion).toBe(MATCH_SCRIPT_POLICY_VERSION);
    expect(scriptSet.scripts.length).toBeGreaterThanOrEqual(2);
    expect(
      scriptSet.scripts.reduce((sum, script) => sum + script.weight, 0),
    ).toBeCloseTo(1, 9);
    expect(scriptSet.scripts.some((script) => script.scriptId === "balanced")).toBe(
      true,
    );

    for (const script of scriptSet.scripts) {
      expect(script.activatingRules).toEqual([]);
      expect(script.strengtheningFeatures).toEqual([]);
      expect(script.activationReasons.length).toBeGreaterThan(0);
      expect(script.footballStateRefs.length).toBeGreaterThan(0);
    }
  });

  it("covers the governed script catalog ids", () => {
    const input = makePipelineInput();
    const footballState = computeFootballState({
      featureBundle: input.featureBundle,
      lambdaParameters: MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT.lambda,
    });
    const scriptSet = generateMatchScriptSet({ footballState });
    const activeIds = new Set(scriptSet.scripts.map((script) => script.scriptId));

    expect(
      MATCH_SCRIPT_IDS.every((id) => activeIds.has(id) || id === "balanced"),
    ).toBe(true);
  });

  it("merges per-script matrices into one final probability matrix", () => {
    const input = makePipelineInput();
    const result = computeProjectionV2(input);

    expect(result.parameters.artifactId).toBe(
      PROJECTION_PARAMS_MATCH_SCRIPT_ARTIFACT_ID,
    );
    expect(result.framework.frameworkVersion).toBe(
      PROJECTION_FRAMEWORK_VERSION_MULTI_SCRIPT,
    );
    expect(result.matchScriptSet.scripts.length).toBeGreaterThanOrEqual(2);
    expect(result.probabilityMatrix).not.toBeNull();

    const matrix = result.probabilityMatrix;
    if (matrix === null) {
      throw new Error("expected merged probability matrix");
    }

    expect(matrix.pHome + matrix.pDraw + matrix.pAway).toBeCloseTo(1, 9);
    expect(
      matrix.goalRange.range01 +
        matrix.goalRange.range23 +
        matrix.goalRange.range4Plus,
    ).toBeCloseTo(1, 9);
    expect(result.framework.activeMatchScripts.length).toBeGreaterThanOrEqual(2);
    expect(
      result.framework.activeMatchScripts.reduce(
        (sum, script) => sum + script.weight,
        0,
      ),
    ).toBeCloseTo(1, 9);
    expect(
      result.framework.activeMatchScripts.every(
        (script) => script.footballStateRefs.length > 0,
      ),
    ).toBe(true);
  });

  it("derives sealed projection outputs from the merged matrix only", () => {
    const input = makePipelineInput();
    const v2 = computeMatchProjection({
      ...input,
      projectionPolicyPin: "v2",
    });

    expect(v2.projection.scorelinesBasis).toBe("match_script_merged_v2");
    expect(v2.projection.oneXTwoBasis).toBe("post_calibration_only");
    expect(v2.projectionFramework?.activeMatchScripts.length).toBeGreaterThan(0);
    expect(
      v2.projection.pHome + v2.projection.pDraw + v2.projection.pAway,
    ).toBeCloseTo(1, 9);
  });

  it("builds distinct per-script lambdas before merge", () => {
    const input = makePipelineInput();
    const result = computeProjectionV2(input);
    const lowEvent = result.framework.activeMatchScripts.find(
      (script) => script.scriptId === "low_event",
    );
    const balanced = result.framework.activeMatchScripts.find(
      (script) => script.scriptId === "balanced",
    );

    if (lowEvent === undefined || balanced === undefined) {
      return;
    }

    expect(lowEvent.lambdaHome).toBeLessThan(balanced.lambdaHome);
    expect(lowEvent.lambdaAway).toBeLessThan(balanced.lambdaAway);
  });

  it("convex-combines script matrices with governed weights", () => {
    const input = makePipelineInput();
    const result = computeProjectionV2(input);
    const baseLambdas = buildLambdasV2({
      footballState: result.footballState,
      parameters: MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT.lambda,
    });
    const scripts = result.matchScriptSet.scripts;
    const merged = mergeProbabilityMatrices(
      scripts.map((script) =>
        Object.freeze({
          weight: script.weight,
          matrix: buildScriptProbabilityMatrix({
            baseLambdaHome: baseLambdas.lambdaHome,
            baseLambdaAway: baseLambdas.lambdaAway,
            modifiers: script.lambdaModifiers,
            parameters: MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT.lambda,
          }),
        }),
      ),
    );

    expect(merged?.checksum).toBe(result.probabilityMatrix?.checksum);
  });
});
