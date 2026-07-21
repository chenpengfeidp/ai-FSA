import { createEvidence } from "@fas/evidence";
import { FeatureExtractor } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { RuleEvaluator } from "@fas/rule";
import { describe, expect, it } from "vitest";
import {
  AnalysisResultValidationError,
  buildScenarioSet,
  computeDeterministicMatchProjection,
  computeIntelligenceConfidence,
  createAnalysisResult,
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

function makeCompletedAnalysisInput(matchId = createMatchId("match-1")) {
  const evidenceSet = Object.freeze([
    makeMatchInfo(matchId),
    makeSideEvidence(matchId, "TEAM_FORM", "home"),
    makeSideEvidence(matchId, "TEAM_FORM", "away"),
    makeSideEvidence(matchId, "STATISTICS", "home"),
    makeSideEvidence(matchId, "STATISTICS", "away"),
  ]);
  const featureBundle = new FeatureExtractor().extractBundle(evidenceSet);
  const ruleResults = new RuleEvaluator().evaluate(featureBundle.features);
  const projection = computeDeterministicMatchProjection({
    featureBundle,
    ruleResults,
    requiredEvidencePresentCount: 5,
  });
  const scenarios = buildScenarioSet(projection);
  const intelligenceConfidence = computeIntelligenceConfidence({
    matchId,
    evidenceSet,
    featureBundle,
    ruleResults,
    scenarios,
  });

  return {
    matchId,
    evidence: evidenceSet[0] as (typeof evidenceSet)[number],
    evidenceSet,
    features: featureBundle.features,
    featureBundle,
    ruleResults,
    projection,
    scenarios,
    intelligenceConfidence,
    generatedAt: "2026-07-17T10:00:00Z",
  };
}

describe("AnalysisResult", () => {
  it("creates an immutable result with immutable collection snapshots", () => {
    const input = makeCompletedAnalysisInput();
    const features = [...input.features];
    const ruleResults = [...input.ruleResults];

    const result = createAnalysisResult({
      ...input,
      features,
      ruleResults,
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.features)).toBe(true);
    expect(Object.isFrozen(result.ruleResults)).toBe(true);
    features.length = 0;
    ruleResults.length = 0;
    expect(result.features.length).toBeGreaterThan(3);
    expect(result.ruleResults.length).toBeGreaterThan(3);
    expect(result.projection.status).toBe("completed_nonempty");
  });

  it("rejects empty Feature or RuleResult collections", () => {
    const input = makeCompletedAnalysisInput();

    expect(() =>
      createAnalysisResult({
        ...input,
        features: [],
      }),
    ).toThrow(AnalysisResultValidationError);
    expect(() =>
      createAnalysisResult({
        ...input,
        ruleResults: [],
      }),
    ).toThrow(AnalysisResultValidationError);
  });

  it("rejects mismatched Match identities", () => {
    const input = makeCompletedAnalysisInput();
    const other = makeCompletedAnalysisInput(createMatchId("match-2"));

    expect(() =>
      createAnalysisResult({
        ...input,
        evidence: other.evidence,
      }),
    ).toThrow(AnalysisResultValidationError);
  });

  it("rejects an invalid generatedAt timestamp", () => {
    const input = makeCompletedAnalysisInput();

    expect(() =>
      createAnalysisResult({
        ...input,
        generatedAt: "invalid",
      }),
    ).toThrow(AnalysisResultValidationError);
  });
});
