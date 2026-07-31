import { createEvidence } from "@fas/evidence";
import { FeatureExtractor } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { RuleEvaluator } from "@fas/rule";
import { describe, expect, it } from "vitest";
import {
  buildLambdasV2,
  computeMultiScriptProjection,
  computeProjectionV2,
  generateMatchScriptSet,
  MULTI_SCRIPT_MERGE_ALGORITHM,
  PROJECTION_FRAMEWORK_VERSION_UNIFIED_MATRIX,
} from "../src/index.js";
import { computeFootballState } from "../src/projection-v2/football-state/compute-football-state.js";
import { MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT } from "../src/projection-v2/projection-parameter-artifact.js";

function makeMatchInfo(matchId = createMatchId("match-msp-1")) {
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

function makePipelineInput(matchId = createMatchId("match-msp-1")) {
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

describe("Projection V2 Multi-Script Engine (P2F)", () => {
  it("executes one projection per activated Match Script", () => {
    const input = makePipelineInput();
    const footballState = computeFootballState({
      featureBundle: input.featureBundle,
      lambdaParameters: MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT.lambda,
    });
    const matchScriptSet = generateMatchScriptSet({ footballState });
    const lambdas = buildLambdasV2({
      footballState,
      parameters: MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT.lambda,
    });
    const multi = computeMultiScriptProjection({
      matchScriptSet,
      baseLambdaHome: lambdas.lambdaHome,
      baseLambdaAway: lambdas.lambdaAway,
      parameters: MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT.lambda,
    });

    expect(multi.perScriptProjections.length).toBe(matchScriptSet.scripts.length);
    expect(
      multi.perScriptProjections.every(
        (entry) =>
          Math.abs(
            entry.matrix.pHome + entry.matrix.pDraw + entry.matrix.pAway - 1,
          ) < 1e-6,
      ),
    ).toBe(true);
  });

  it("merges script marginals using Match Script weights only", () => {
    const input = makePipelineInput();
    const result = computeProjectionV2(input);
    const unified = result.framework.unifiedMatrix;

    if (unified === null) {
      throw new Error("expected unified matrix summary");
    }

    expect(unified.mergeAlgorithm).toBe(MULTI_SCRIPT_MERGE_ALGORITHM);
    expect(unified.scriptCount).toBe(result.matchScriptSet.scripts.length);

    const summedPHome = result.framework.activeMatchScripts.reduce(
      (sum, script) => sum + script.mergeContribution.weightedPHome,
      0,
    );
    const summedPDraw = result.framework.activeMatchScripts.reduce(
      (sum, script) => sum + script.mergeContribution.weightedPDraw,
      0,
    );
    const summedPAway = result.framework.activeMatchScripts.reduce(
      (sum, script) => sum + script.mergeContribution.weightedPAway,
      0,
    );

    expect(summedPHome).toBeCloseTo(unified.derived.pHome, 6);
    expect(summedPDraw).toBeCloseTo(unified.derived.pDraw, 6);
    expect(summedPAway).toBeCloseTo(unified.derived.pAway, 6);
  });

  it("exposes per-script winner, scorelines, and goal range in framework metadata", () => {
    const input = makePipelineInput();
    const result = computeProjectionV2(input);

    expect(result.framework.frameworkVersion).toBe(
      PROJECTION_FRAMEWORK_VERSION_UNIFIED_MATRIX,
    );
    expect(result.perScriptProjections.length).toBeGreaterThanOrEqual(2);

    for (const script of result.framework.activeMatchScripts) {
      expect(script.pHome + script.pDraw + script.pAway).toBeCloseTo(1, 6);
      expect(script.mostLikelyScoreline.probability).toBeGreaterThan(0);
      expect(
        script.goalRange.range01 +
          script.goalRange.range23 +
          script.goalRange.range4Plus,
      ).toBeCloseTo(1, 6);
    }
  });

  it("keeps sealed projection output contract after merge and calibration", () => {
    const input = makePipelineInput();
    const result = computeProjectionV2(input);

    expect(result.projection.scorelinesBasis).toBe("match_script_merged_v2");
    expect(result.projection.status).toBe("completed_nonempty");
    expect(
      result.projection.pHome + result.projection.pDraw + result.projection.pAway,
    ).toBeCloseTo(1, 9);
    expect(result.projection.topScorelines.length).toBeGreaterThan(0);
    expect(result.projection.confidence).toBeGreaterThan(0);
  });
});
