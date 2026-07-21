import { createEvidence } from "@fas/evidence";
import { FeatureExtractor } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { RuleEvaluator } from "@fas/rule";
import { describe, expect, it } from "vitest";
import {
  buildScenarioSet,
  computeDeterministicMatchProjection,
  computeIntelligenceConfidence,
} from "../src/index.js";

describe("ScenarioSet and IntelligenceConfidence", () => {
  it("emits a deterministic scenario trio and confidence block", () => {
    const matchId = createMatchId("match-scenario-1");
    const generatedAt = "2026-07-17T10:00:00Z";
    const evidenceSet = Object.freeze([
      createEvidence({
        id: "evidence-1",
        source: "fixture",
        sourceId: "fixture-match-1",
        type: "MATCH_INFO",
        matchId,
        collectedAt: generatedAt,
        eventTime: "2026-08-01T19:30:00Z",
        freshness: "fresh",
        quality: "unverified",
        provenance: {
          collector: "@fas/evidence-normalizer",
          method: "fixture",
        },
        payload: {
          away: "FC Lahti",
          home: "IFK Mariehamn",
          kickoff: "2026-08-01T19:30:00Z",
        },
      }),
      createEvidence({
        id: "evidence-form-home",
        source: "fixture",
        sourceId: "fixture-form-home",
        type: "TEAM_FORM",
        matchId,
        collectedAt: generatedAt,
        eventTime: "2026-08-01T19:30:00Z",
        freshness: "fresh",
        quality: "unverified",
        provenance: {
          collector: "@fas/evidence-normalizer",
          method: "fixture",
        },
        payload: {
          teamSide: "home",
          window: 5,
          results: ["W", "W", "D", "W", "L"],
          goalsFor: [2, 3, 1, 2, 0],
          goalsAgainst: [0, 1, 1, 1, 1],
        },
      }),
      createEvidence({
        id: "evidence-form-away",
        source: "fixture",
        sourceId: "fixture-form-away",
        type: "TEAM_FORM",
        matchId,
        collectedAt: generatedAt,
        eventTime: "2026-08-01T19:30:00Z",
        freshness: "fresh",
        quality: "unverified",
        provenance: {
          collector: "@fas/evidence-normalizer",
          method: "fixture",
        },
        payload: {
          teamSide: "away",
          window: 5,
          results: ["L", "D", "L", "W", "L"],
          goalsFor: [0, 1, 1, 2, 0],
          goalsAgainst: [2, 1, 3, 1, 2],
        },
      }),
      createEvidence({
        id: "evidence-stats-home",
        source: "fixture",
        sourceId: "fixture-stats-home",
        type: "STATISTICS",
        matchId,
        collectedAt: generatedAt,
        eventTime: "2026-08-01T19:30:00Z",
        freshness: "fresh",
        quality: "unverified",
        provenance: {
          collector: "@fas/evidence-normalizer",
          method: "fixture",
        },
        payload: {
          teamSide: "home",
          windowMatches: 5,
          shotsForPerMatch: 15,
          shotsAgainstPerMatch: 9,
          xgForPerMatch: 0,
          xgAgainstPerMatch: 0,
        },
      }),
      createEvidence({
        id: "evidence-stats-away",
        source: "fixture",
        sourceId: "fixture-stats-away",
        type: "STATISTICS",
        matchId,
        collectedAt: generatedAt,
        eventTime: "2026-08-01T19:30:00Z",
        freshness: "fresh",
        quality: "unverified",
        provenance: {
          collector: "@fas/evidence-normalizer",
          method: "fixture",
        },
        payload: {
          teamSide: "away",
          windowMatches: 5,
          shotsForPerMatch: 10,
          shotsAgainstPerMatch: 14,
          xgForPerMatch: 0,
          xgAgainstPerMatch: 0,
        },
      }),
    ]);
    const featureBundle = new FeatureExtractor().extractBundle(evidenceSet);
    const ruleResults = new RuleEvaluator().evaluate(featureBundle.features);
    const projection = computeDeterministicMatchProjection({
      featureBundle,
      ruleResults,
      requiredEvidencePresentCount: 5,
    });
    const scenarios = buildScenarioSet(projection);
    const confidence = computeIntelligenceConfidence({
      matchId,
      evidenceSet,
      featureBundle,
      ruleResults,
      scenarios,
    });

    expect(scenarios.mostLikely.slot).toBe("mostLikely");
    expect(scenarios.secondLikely.slot).toBe("secondLikely");
    expect(scenarios.upset.slot).toBe("upset");
    expect(scenarios.upset.winner).not.toBe(scenarios.mostLikely.winner);
    expect(buildScenarioSet(projection)).toEqual(scenarios);
    expect(confidence.predictionConfidence).toBeGreaterThanOrEqual(0);
    expect(confidence.predictionConfidence).toBeLessThanOrEqual(100);
    expect(confidence.upsetRisk).toBeGreaterThanOrEqual(0);
    expect(["low", "medium", "high", "very_high"]).toContain(
      confidence.confidenceBand,
    );
  });
});
