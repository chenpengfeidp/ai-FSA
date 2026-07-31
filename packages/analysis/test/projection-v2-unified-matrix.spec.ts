import { createEvidence } from "@fas/evidence";
import { FeatureExtractor } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { RuleEvaluator } from "@fas/rule";
import { describe, expect, it } from "vitest";
import {
  buildScenarioSet,
  computeProjectionV2,
  deriveMatrixPredictions,
  MULTI_SCRIPT_MERGE_ALGORITHM,
  PROJECTION_FRAMEWORK_VERSION_UNIFIED_MATRIX,
  UNIFIED_MATRIX_DERIVATION_POLICY,
} from "../src/index.js";
import { mergeProbabilityMatrices } from "../src/projection-v2/probability-matrix/merge-probability-matrices.js";

function makeMatchInfo(matchId = createMatchId("match-upm-1")) {
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

function makePipelineInput(matchId = createMatchId("match-upm-1")) {
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

describe("Projection V2 Unified Probability Matrix (P2G)", () => {
  it("derives BTTS and Over/Under from matrix cells", () => {
    const input = makePipelineInput();
    const result = computeProjectionV2(input);
    const matrix = result.probabilityMatrix;

    if (matrix === null) {
      throw new Error("expected unified probability matrix");
    }

    const derived = deriveMatrixPredictions(matrix.matrix);

    expect(derived.pBttsYes + derived.pBttsNo).toBeCloseTo(1, 9);
    expect(derived.pOver25 + derived.pUnder25).toBeCloseTo(1, 9);
    expect(derived.pHome + derived.pDraw + derived.pAway).toBeCloseTo(1, 9);
    expect(matrix.pHome).toBe(derived.pHome);
    expect(matrix.pDraw).toBe(derived.pDraw);
    expect(matrix.pAway).toBe(derived.pAway);
  });

  it("exposes unified matrix summary with derivation notes in framework metadata", () => {
    const input = makePipelineInput();
    const result = computeProjectionV2(input);
    const unified = result.framework.unifiedMatrix;

    if (unified === null) {
      throw new Error("expected unified matrix summary");
    }

    expect(result.framework.frameworkVersion).toBe(
      PROJECTION_FRAMEWORK_VERSION_UNIFIED_MATRIX,
    );
    expect(unified.policyVersion).toBe(UNIFIED_MATRIX_DERIVATION_POLICY);
    expect(unified.mergeAlgorithm).toBe(MULTI_SCRIPT_MERGE_ALGORITHM);
    expect(unified.derivationNotes.length).toBeGreaterThanOrEqual(4);
    expect(unified.derived.pBttsYes).toBeGreaterThan(0);
    expect(unified.derived.pOver25).toBeGreaterThan(0);
  });

  it("merges per-script matrices using Match Script weights only", () => {
    const input = makePipelineInput();
    const result = computeProjectionV2(input);
    const unified = result.framework.unifiedMatrix;

    if (unified === null) {
      throw new Error("expected unified matrix summary");
    }

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

  it("aligns sealed projection scorelines and goal range with the unified matrix", () => {
    const input = makePipelineInput();
    const result = computeProjectionV2(input);
    const matrix = result.probabilityMatrix;

    if (matrix === null) {
      throw new Error("expected unified probability matrix");
    }

    expect(result.projection.scorelinesBasis).toBe("match_script_merged_v2");
    expect(result.projection.topScorelines[0]?.homeGoals).toBe(
      matrix.topScorelines[0]?.homeGoals,
    );
    expect(result.projection.topScorelines[0]?.awayGoals).toBe(
      matrix.topScorelines[0]?.awayGoals,
    );
    expect(result.projection.goalRange.range01).toBe(matrix.goalRange.range01);
    expect(result.projection.goalRange.range23).toBe(matrix.goalRange.range23);
    expect(result.projection.goalRange.range4Plus).toBe(matrix.goalRange.range4Plus);
  });

  it("derives per-script BTTS and Over/Under from each script matrix", () => {
    const input = makePipelineInput();
    const result = computeProjectionV2(input);

    for (const script of result.framework.activeMatchScripts) {
      expect(script.pBttsYes + script.pBttsNo).toBeCloseTo(1, 6);
      expect(script.pOver25 + script.pUnder25).toBeCloseTo(1, 6);
    }
  });

  it("builds scenarios from matrix scorelines without 1X2 synthetic worlds", () => {
    const input = makePipelineInput();
    const result = computeProjectionV2(input);
    const scenarios = buildScenarioSet(result.projection);
    const top = result.projection.topScorelines[0];

    if (top === undefined) {
      throw new Error("expected top scoreline");
    }

    expect(scenarios.mostLikely.homeGoals).toBe(top.homeGoals);
    expect(scenarios.mostLikely.awayGoals).toBe(top.awayGoals);
    expect(scenarios.mostLikely.probability).toBe(top.probability);
  });

  it("recomputes merged matrix marginals via deriveMatrixPredictions", () => {
    const input = makePipelineInput();
    const result = computeProjectionV2(input);
    const weighted = result.perScriptProjections.map((entry) => ({
      weight:
        result.matchScriptSet.scripts.find(
          (script) => script.scriptId === entry.scriptId,
        )?.weight ?? 0,
      matrix: entry.matrix,
    }));
    const remerged = mergeProbabilityMatrices(weighted);

    if (remerged === null || result.probabilityMatrix === null) {
      throw new Error("expected merged matrix");
    }

    expect(remerged.checksum).toBe(result.probabilityMatrix.checksum);
    expect(remerged.pHome).toBe(result.probabilityMatrix.pHome);
  });
});
