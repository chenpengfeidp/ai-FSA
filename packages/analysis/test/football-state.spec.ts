import { createEvidence } from "@fas/evidence";
import { FeatureExtractor } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { RuleEvaluator } from "@fas/rule";
import { describe, expect, it } from "vitest";
import {
  computeFootballState,
  computeMatchProjection,
  createFootballStateReportMetadata,
  FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT,
  FOOTBALL_STATE_DIMENSION_IDS,
  FOOTBALL_STATE_POLICY_VERSION,
} from "../src/index.js";

function makeMatchInfo(matchId = createMatchId("match-fs-1")) {
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

function makePipelineInput(matchId = createMatchId("match-fs-1")) {
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

describe("Football State Engine (P2D)", () => {
  it("computes six deterministic dimensions from existing Features only", () => {
    const input = makePipelineInput();
    const footballState = computeFootballState({
      featureBundle: input.featureBundle,
      lambdaParameters: FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT.lambda,
    });

    expect(footballState.policyVersion).toBe(FOOTBALL_STATE_POLICY_VERSION);
    expect(Object.keys(footballState.dimensions).sort()).toEqual(
      [...FOOTBALL_STATE_DIMENSION_IDS].sort(),
    );

    for (const id of FOOTBALL_STATE_DIMENSION_IDS) {
      const dimension = footballState.dimensions[id];
      expect(dimension.level).toMatch(/^(absent|low|medium|high)$/);
      expect(dimension.score).toBeGreaterThanOrEqual(0);
      expect(dimension.score).toBeLessThanOrEqual(1);
      expect(dimension.basis).toMatch(/^(feature|derived)$/);
    }

    expect(footballState.projectionInputs.blocked).toBe(false);
    expect(footballState.driverFeatureNames.length).toBeGreaterThan(0);
    expect(footballState.checksum.length).toBeGreaterThan(0);
  });

  it("builds projection inputs with foundation ratings for lambda projection", () => {
    const input = makePipelineInput();
    const footballState = computeFootballState({
      featureBundle: input.featureBundle,
      lambdaParameters: FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT.lambda,
    });

    expect(footballState.projectionInputs.homeAttackRating).toBeGreaterThan(0);
    expect(footballState.projectionInputs.awayAttackRating).toBeGreaterThan(0);
    expect(footballState.projectionInputs.groupContributions.length).toBeGreaterThan(
      0,
    );
  });

  it("exposes report metadata with per-dimension feature provenance", () => {
    const input = makePipelineInput();
    const footballState = computeFootballState({
      featureBundle: input.featureBundle,
      lambdaParameters: FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT.lambda,
    });
    const report = createFootballStateReportMetadata(footballState);

    expect(report.dimensions.length).toBe(FOOTBALL_STATE_DIMENSION_IDS.length);
    expect(
      report.dimensions.some((dimension) => dimension.sourceRefs.length > 0),
    ).toBe(true);
    expect(report.policyVersion).toBe(FOOTBALL_STATE_POLICY_VERSION);
  });

  it("surfaces Football State on V2 match projection without changing output contract", () => {
    const input = makePipelineInput();
    const result = computeMatchProjection({
      ...input,
      projectionPolicyPin: "v2",
    });

    expect(result.footballState).toBeDefined();
    expect(result.footballState?.policyVersion).toBe(FOOTBALL_STATE_POLICY_VERSION);
    expect(result.projection.status).toBe("completed_nonempty");
    expect(
      result.projection.pHome + result.projection.pDraw + result.projection.pAway,
    ).toBeCloseTo(1, 9);
  });
});
