import { describe, expect, it } from "vitest";
import {
  createActualMatchResult,
  evaluatePrediction,
  EVALUATION_MODEL_VERSION,
  loadEvaluationDemoPopulationRows,
  mapActualMatchResultFromEvidence,
  predictedWinnerFromProbs,
  scoreEvaluationPopulation,
  summarizeEvaluationPopulation,
} from "../src/index.js";

describe("evaluatePrediction", () => {
  it("scores winner / score / goal / scenario metrics without mutating inputs", () => {
    const prediction = Object.freeze({
      matchId: "match-eval-1",
      projectionChecksum: "abc123",
      projectionStatus: "completed_nonempty" as const,
      pHome: 0.5,
      pDraw: 0.3,
      pAway: 0.2,
      topScorelines: Object.freeze([
        Object.freeze({ homeGoals: 2, awayGoals: 1, probability: 0.12 }),
      ]),
      goalRange: Object.freeze({
        range01: 0.2,
        range23: 0.5,
        range4Plus: 0.3,
      }),
      predictionConfidence: 80,
      confidenceBand: "high" as const,
      scenarios: Object.freeze({
        mostLikely: Object.freeze({
          slot: "mostLikely" as const,
          winner: "home" as const,
          homeGoals: 2,
          awayGoals: 1,
          probability: 0.5,
        }),
        secondLikely: Object.freeze({
          slot: "secondLikely" as const,
          winner: "draw" as const,
          homeGoals: 1,
          awayGoals: 1,
          probability: 0.3,
        }),
        upset: Object.freeze({
          slot: "upset" as const,
          winner: "away" as const,
          homeGoals: 0,
          awayGoals: 1,
          probability: 0.2,
        }),
      }),
      rules: Object.freeze([
        Object.freeze({
          ruleName: "HOME_ATTACK_EDGE",
          status: "PASS" as const,
          channel: "home+" as const,
        }),
        Object.freeze({
          ruleName: "MARKET_LEAN_HOME",
          status: "INAPPLICABLE" as const,
          channel: "none" as const,
        }),
      ]),
      featureNames: Object.freeze([
        "homeTeam",
        "awayTeam",
        "kickoff",
        "homeAdvantage",
        "attackRatingHome",
        "attackRatingAway",
        "defenseRatingHome",
        "defenseRatingAway",
        "momentumHome",
        "momentumAway",
        "recentFormHome",
        "recentFormAway",
      ]),
      projectionModelVersion: "projection.v2.i2b.market",
      featureModelVersion: "feature.v2.i2b.market",
      ruleSetVersion: "rule.mvp.i2b.market",
    });
    const actual = createActualMatchResult({
      matchId: "match-eval-1",
      homeGoals: 2,
      awayGoals: 1,
      winner: "home",
      totalGoals: 3,
      competitionName: "Demo",
      matchStatus: "FINISHED",
      providerId: "football:demo",
      providerSourceId: "demo:1:result",
      providerMethod: "recorded-snapshot",
      observedAt: "2026-07-10T18:00:00.000Z",
    });
    const snapshot = JSON.stringify(prediction);

    const record = evaluatePrediction({
      prediction,
      actual,
      evaluatedAt: "2026-07-11T12:00:00.000Z",
    });

    expect(record.evaluationModelVersion).toBe(EVALUATION_MODEL_VERSION);
    expect(record.status).toBe("scored");
    expect(record.metrics?.winnerHit).toBe(true);
    expect(record.metrics?.scoreHit).toBe(true);
    expect(record.metrics?.goalHit).toBe(true);
    expect(record.metrics?.goalRangeHit).toBe(true);
    expect(record.metrics?.scenarioHit.mostLikely).toBe(true);
    expect(record.metrics?.confidenceCorrectness).toBe("correct");
    expect(record.metrics?.featureCoverage.coverageRatio).toBe(1);
    expect(record.metrics?.paperUnitReturn).toBe(1);
    expect(record.metrics?.paperMetricDisclaimer).toContain("not wagering advice");
    expect(JSON.stringify(prediction)).toBe(snapshot);
    expect(Object.isFrozen(record)).toBe(true);
  });

  it("excludes blocked projections with an explicit reason", () => {
    const prediction = Object.freeze({
      matchId: "match-blocked",
      projectionChecksum: "blocked",
      projectionStatus: "blocked" as const,
      pHome: 0.4,
      pDraw: 0.3,
      pAway: 0.3,
      topScorelines: Object.freeze([]),
      goalRange: Object.freeze({ range01: 0.3, range23: 0.4, range4Plus: 0.3 }),
      predictionConfidence: 40,
      confidenceBand: "low" as const,
      scenarios: Object.freeze({
        mostLikely: Object.freeze({
          slot: "mostLikely" as const,
          winner: "home" as const,
          homeGoals: 1,
          awayGoals: 0,
          probability: 0.4,
        }),
        secondLikely: Object.freeze({
          slot: "secondLikely" as const,
          winner: "draw" as const,
          homeGoals: 1,
          awayGoals: 1,
          probability: 0.3,
        }),
        upset: Object.freeze({
          slot: "upset" as const,
          winner: "away" as const,
          homeGoals: 0,
          awayGoals: 1,
          probability: 0.3,
        }),
      }),
      rules: Object.freeze([]),
      featureNames: Object.freeze([]),
      projectionModelVersion: "projection.v2.i2b.market",
    });
    const actual = createActualMatchResult({
      matchId: "match-blocked",
      homeGoals: 0,
      awayGoals: 0,
      winner: "draw",
      totalGoals: 0,
      matchStatus: "FINISHED",
      providerId: "football:demo",
      providerSourceId: "demo:blocked:result",
      providerMethod: "recorded-snapshot",
      observedAt: "2026-07-10T18:00:00.000Z",
    });

    const record = evaluatePrediction({
      prediction,
      actual,
      evaluatedAt: "2026-07-11T12:00:00.000Z",
    });

    expect(record.status).toBe("excluded");
    expect(record.exclusionReason).toContain("blocked");
    expect(record.metrics).toBeUndefined();
  });
});

describe("mapActualMatchResultFromEvidence", () => {
  it("maps MATCH_RESULT Evidence into ActualMatchResult", () => {
    const actual = mapActualMatchResultFromEvidence({
      type: "MATCH_RESULT",
      matchId: "football:100",
      providerId: "football:api-sports",
      sourceId: "api-football:100:result",
      provenance: { method: "http-live" },
      payload: {
        homeGoals: 1,
        awayGoals: 2,
        winner: "away",
        totalGoals: 3,
        matchStatus: "FINISHED",
        competitionId: "292",
        competitionName: "K League 1",
        observedAt: "2026-07-19T12:00:00.000Z",
      },
    });

    expect(actual?.winner).toBe("away");
    expect(actual?.totalGoals).toBe(3);
    expect(actual?.providerId).toBe("football:api-sports");
  });
});

describe("evaluation demo population", () => {
  it("scores a recorded population end-to-end without spreadsheets", () => {
    const rows = loadEvaluationDemoPopulationRows();
    const records = scoreEvaluationPopulation(rows);
    const summary = summarizeEvaluationPopulation(records);

    expect(summary.sampleSize).toBe(rows.length);
    expect(summary.scoredCount).toBe(4);
    expect(summary.excludedCount).toBe(1);
    expect(summary.winnerHitRate).toBeGreaterThan(0);
    expect(summary.paperMetricDisclaimer).toContain("not wagering advice");
    expect(summary.checksum.length).toBeGreaterThan(0);
    expect(predictedWinnerFromProbs(0.5, 0.3, 0.2)).toBe("home");
  });
});
