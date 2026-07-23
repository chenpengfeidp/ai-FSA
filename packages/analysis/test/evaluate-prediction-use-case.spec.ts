import { createEvidence } from "@fas/evidence";
import { createMatchId } from "@fas/match";
import { describe, expect, it } from "vitest";
import {
  buildScenarioSet,
  computeDeterministicMatchProjection,
  computeIntelligenceConfidence,
  createAnalysisResult,
  EvaluatePredictionUseCase,
} from "../src/index.js";
import { FeatureExtractor } from "@fas/feature";
import { RuleEvaluator } from "@fas/rule";

function makeAnalysisWithResult(includeResult: boolean) {
  const matchId = createMatchId("match-eval-uc");
  const generatedAt = "2026-07-19T12:00:00.000Z";
  const evidences = [
    createEvidence({
      id: "ev-match",
      source: "fixture",
      sourceId: "fixture-match-eval-uc",
      type: "MATCH_INFO",
      matchId,
      collectedAt: generatedAt,
      eventTime: generatedAt,
      freshness: "fresh",
      quality: "unverified",
      provenance: { collector: "test", method: "fixture" },
      payload: {
        home: "Home FC",
        away: "Away FC",
        kickoff: generatedAt,
      },
    }),
    createEvidence({
      id: "ev-form-home",
      source: "fixture",
      sourceId: "fixture-form-home",
      type: "TEAM_FORM",
      matchId,
      collectedAt: generatedAt,
      eventTime: generatedAt,
      freshness: "fresh",
      quality: "unverified",
      provenance: { collector: "test", method: "fixture" },
      payload: {
        teamId: "1",
        teamName: "Home FC",
        teamSide: "home",
        window: 5,
        results: ["W", "W", "D", "W", "W"],
        goalsFor: [2, 1, 1, 2, 3],
        goalsAgainst: [0, 0, 1, 1, 0],
        goalsScoredPerMatch: 1.8,
        goalsConcededPerMatch: 0.4,
      },
    }),
    createEvidence({
      id: "ev-form-away",
      source: "fixture",
      sourceId: "fixture-form-away",
      type: "TEAM_FORM",
      matchId,
      collectedAt: generatedAt,
      eventTime: generatedAt,
      freshness: "fresh",
      quality: "unverified",
      provenance: { collector: "test", method: "fixture" },
      payload: {
        teamId: "2",
        teamName: "Away FC",
        teamSide: "away",
        window: 5,
        results: ["L", "D", "L", "W", "L"],
        goalsFor: [0, 1, 0, 1, 0],
        goalsAgainst: [2, 1, 2, 1, 1],
        goalsScoredPerMatch: 0.4,
        goalsConcededPerMatch: 1.4,
      },
    }),
    createEvidence({
      id: "ev-stats-home",
      source: "fixture",
      sourceId: "fixture-stats-home",
      type: "STATISTICS",
      matchId,
      collectedAt: generatedAt,
      eventTime: generatedAt,
      freshness: "fresh",
      quality: "unverified",
      provenance: { collector: "test", method: "fixture" },
      payload: {
        teamId: "1",
        teamName: "Home FC",
        teamSide: "home",
        windowMatches: 5,
        shotsForPerMatch: 14,
        shotsAgainstPerMatch: 8,
        xgForPerMatch: 0,
        xgAgainstPerMatch: 0,
      },
    }),
    createEvidence({
      id: "ev-stats-away",
      source: "fixture",
      sourceId: "fixture-stats-away",
      type: "STATISTICS",
      matchId,
      collectedAt: generatedAt,
      eventTime: generatedAt,
      freshness: "fresh",
      quality: "unverified",
      provenance: { collector: "test", method: "fixture" },
      payload: {
        teamId: "2",
        teamName: "Away FC",
        teamSide: "away",
        windowMatches: 5,
        shotsForPerMatch: 9,
        shotsAgainstPerMatch: 13,
        xgForPerMatch: 0,
        xgAgainstPerMatch: 0,
      },
    }),
  ];

  if (includeResult) {
    evidences.push(
      createEvidence({
        id: "ev-result",
        source: "api-football",
        sourceId: "api-football:match-eval-uc:result",
        type: "MATCH_RESULT",
        matchId,
        collectedAt: generatedAt,
        eventTime: generatedAt,
        freshness: "fresh",
        quality: "unverified",
        provenance: { collector: "test", method: "recorded-snapshot" },
        payload: {
          homeGoals: 2,
          awayGoals: 0,
          winner: "home",
          totalGoals: 2,
          matchStatus: "FINISHED",
          competitionName: "Demo",
          observedAt: generatedAt,
        },
      }),
    );
  }

  const featureBundle = new FeatureExtractor().extractBundle(evidences);
  const ruleResults = new RuleEvaluator().evaluate(featureBundle.features);
  const projection = computeDeterministicMatchProjection({
    featureBundle,
    ruleResults,
    requiredEvidencePresentCount: 5,
  });
  const scenarios = buildScenarioSet(projection);
  const intelligenceConfidence = computeIntelligenceConfidence({
    matchId,
    evidenceSet: evidences,
    featureBundle,
    ruleResults,
    scenarios,
  });

  const matchInfo = evidences[0];

  if (matchInfo === undefined) {
    throw new Error("Expected MATCH_INFO evidence in evaluation fixture.");
  }

  return createAnalysisResult({
    matchId,
    evidence: matchInfo,
    evidenceSet: evidences,
    features: featureBundle.features,
    featureBundle,
    ruleResults,
    projection,
    scenarios,
    intelligenceConfidence,
    generatedAt,
  });
}

describe("EvaluatePredictionUseCase", () => {
  it("returns ACTUAL_RESULT_UNAVAILABLE when MATCH_RESULT is absent", () => {
    const result = new EvaluatePredictionUseCase().execute({
      analysis: makeAnalysisWithResult(false),
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("ACTUAL_RESULT_UNAVAILABLE");
  });

  it("evaluates sealed analysis without mutating the AnalysisResult", () => {
    const analysis = makeAnalysisWithResult(true);
    const snapshot = JSON.stringify(analysis);
    const result = new EvaluatePredictionUseCase().execute({ analysis });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value.evaluation.status).toBe("scored");
    expect(result.value.actual.winner).toBe("home");
    expect(JSON.stringify(analysis)).toBe(snapshot);
    expect(analysis.projection.checksum).toBe(
      JSON.parse(snapshot).projection.checksum,
    );
  });
});
