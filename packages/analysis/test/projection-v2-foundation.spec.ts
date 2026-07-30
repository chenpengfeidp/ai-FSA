import { createEvidence } from "@fas/evidence";
import { FeatureExtractor } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { RuleEvaluator } from "@fas/rule";
import { describe, expect, it } from "vitest";
import {
  BASELINE_MATCH_SCRIPT_ID,
  BASELINE_PROJECTION_PARAMETER_ARTIFACT,
  buildLambdasV2,
  computeLambdas,
  computeMatchProjection,
  computeProjectionV2,
  FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT,
  FOOTBALL_STATE_POLICY_VERSION,
  MATCH_SCRIPT_POLICY_VERSION,
  PROJECTION_FRAMEWORK_VERSION,
  PROJECTION_PARAMS_FEATURE_LAMBDA_ARTIFACT_ID,
} from "../src/index.js";

function makeMatchInfo(matchId = createMatchId("match-1")) {
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

function makePipelineInput(matchId = createMatchId("match-1")) {
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

describe("Projection V2 foundation", () => {
  it("computes identity Football State and single baseline Match Script", () => {
    const input = makePipelineInput();
    const result = computeProjectionV2(input);

    expect(result.footballState.policyVersion).toBe(FOOTBALL_STATE_POLICY_VERSION);
    expect(result.matchScriptSet.policyVersion).toBe(MATCH_SCRIPT_POLICY_VERSION);
    expect(result.matchScriptSet.scripts).toHaveLength(1);
    expect(result.matchScriptSet.scripts[0]?.scriptId).toBe(
      BASELINE_MATCH_SCRIPT_ID,
    );
    expect(result.matchScriptSet.scripts[0]?.weight).toBe(1);
    expect(result.parameters.artifactId).toBe(
      PROJECTION_PARAMS_FEATURE_LAMBDA_ARTIFACT_ID,
    );
    expect(result.framework.frameworkVersion).toBe(PROJECTION_FRAMEWORK_VERSION);
  });

  it("wraps the feature-enriched Poisson matrix with valid marginals", () => {
    const input = makePipelineInput();
    const result = computeProjectionV2(input);

    expect(result.probabilityMatrix).not.toBeNull();
    const matrix = result.probabilityMatrix;
    if (matrix === null) {
      throw new Error("expected probability matrix");
    }

    expect(matrix.pHome + matrix.pDraw + matrix.pAway).toBeCloseTo(1, 9);
    expect(
      matrix.goalRange.range01 +
        matrix.goalRange.range23 +
        matrix.goalRange.range4Plus,
    ).toBeCloseTo(1, 9);
    expect(matrix.topScorelines.length).toBeGreaterThan(0);
  });

  it("uses feature-enriched lambda basis without Rule softmax", () => {
    const input = makePipelineInput();
    const v2 = computeMatchProjection({
      ...input,
      projectionPolicyPin: "v2",
    });

    expect(v2.projectionFramework).toBeDefined();
    expect(v2.projection.scorelinesBasis).toBe("feature_enriched_lambda_v2");
    expect(v2.projection.oneXTwoBasis).toBe("post_calibration_only");
  });

  it("defaults computeMatchProjection to V1 without framework metadata", () => {
    const input = makePipelineInput();
    const result = computeMatchProjection(input);

    expect(result.projectionFramework).toBeUndefined();
    expect(result.projection.status).toBe("completed_nonempty");
    expect(result.projection.scorelinesBasis).toBe("pre_rule_adjustment");
  });
});

describe("LambdaBuilderV2", () => {
  it("reproduces V1 lambdas with baseline artifact weights", () => {
    const input = makePipelineInput();
    const features = new Map(
      input.featureBundle.features.map((feature) => [feature.name, feature]),
    );
    const v1 = computeLambdas({
      attackRatingHome: features.get("attackRatingHome")?.value as number,
      defenseRatingAway: features.get("defenseRatingAway")?.value as number,
      attackRatingAway: features.get("attackRatingAway")?.value as number,
      defenseRatingHome: features.get("defenseRatingHome")?.value as number,
      homeAdvantage: features.get("homeAdvantage")?.value as number,
    });
    const v2 = buildLambdasV2({
      featureBundle: input.featureBundle,
      parameters: BASELINE_PROJECTION_PARAMETER_ARTIFACT.lambda,
    });

    expect(v2.lambdaHome).toBeCloseTo(v1.lambdaHome, 9);
    expect(v2.lambdaAway).toBeCloseTo(v1.lambdaAway, 9);
  });

  it("records absent optional Features without imputing values", () => {
    const input = makePipelineInput();
    const result = buildLambdasV2({
      featureBundle: input.featureBundle,
      parameters: FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT.lambda,
    });

    expect(result.absentOptionalFeatures.length).toBeGreaterThan(0);
    expect(result.limitations.some((line) => line.includes("neutral"))).toBe(true);
  });
});
