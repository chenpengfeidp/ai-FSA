import { describe, expect, it } from "vitest";
import {
  buildEvaluationHistoryRecord,
  createActualMatchResult,
  evaluatePrediction,
  InMemoryEvaluationHistoryRepository,
} from "../src/index.js";

function scoredFixture() {
  const prediction = Object.freeze({
    matchId: "match-hist-1",
    projectionChecksum: "proj-abc",
    projectionStatus: "completed_nonempty" as const,
    pHome: 0.52,
    pDraw: 0.28,
    pAway: 0.2,
    topScorelines: Object.freeze([
      Object.freeze({ homeGoals: 1, awayGoals: 0, probability: 0.12 }),
    ]),
    goalRange: Object.freeze({
      range01: 0.3,
      range23: 0.45,
      range4Plus: 0.25,
    }),
    predictionConfidence: 74,
    confidenceBand: "high" as const,
    scenarios: Object.freeze({
      mostLikely: Object.freeze({
        slot: "mostLikely" as const,
        winner: "home" as const,
        homeGoals: 1,
        awayGoals: 0,
        probability: 0.52,
      }),
      secondLikely: Object.freeze({
        slot: "secondLikely" as const,
        winner: "draw" as const,
        homeGoals: 1,
        awayGoals: 1,
        probability: 0.28,
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
    matchId: "match-hist-1",
    homeGoals: 1,
    awayGoals: 0,
    winner: "home",
    totalGoals: 1,
    competitionId: "292",
    competitionName: "K League 1",
    matchStatus: "FINISHED",
    providerId: "football:demo",
    providerSourceId: "demo:match-hist-1:result",
    providerMethod: "recorded-snapshot",
    observedAt: "2026-07-19T12:00:00.000Z",
  });

  const evaluation = evaluatePrediction({
    prediction,
    actual,
    evaluatedAt: "2026-07-19T13:00:00.000Z",
  });

  return { prediction, actual, evaluation };
}

describe("Evaluation History (A1.5)", () => {
  it("builds an immutable history record with required lineage fields", () => {
    const { prediction, actual, evaluation } = scoredFixture();
    const record = buildEvaluationHistoryRecord({
      predictionSnapshot: prediction,
      actualResult: actual,
      evaluation,
      homeTeam: "Home FC",
      awayTeam: "Away FC",
      matchDate: "2026-07-19T10:30:00.000Z",
      recordedAt: "2026-07-19T13:00:00.000Z",
    });

    expect(record.matchId).toBe("match-hist-1");
    expect(record.season).toBe("2026");
    expect(record.homeTeam).toBe("Home FC");
    expect(record.featureModelVersion).toBe("feature.v2.i2b.market");
    expect(record.ruleSetVersion).toBe("rule.mvp.i2b.market");
    expect(record.projectionModelVersion).toBe("projection.v2.i2b.market");
    expect(record.evaluationModelVersion).toBe("evaluation.mvp.a1");
    expect(record.predictionSnapshot.projectionChecksum).toBe("proj-abc");
    expect(Object.isFrozen(record)).toBe(true);
  });

  it("persists and queries by match / competition / season / date range", async () => {
    const { prediction, actual, evaluation } = scoredFixture();
    const repo = new InMemoryEvaluationHistoryRepository();
    const record = buildEvaluationHistoryRecord({
      predictionSnapshot: prediction,
      actualResult: actual,
      evaluation,
      homeTeam: "Home FC",
      awayTeam: "Away FC",
      matchDate: "2026-07-19T10:30:00.000Z",
      recordedAt: "2026-07-19T13:00:00.000Z",
    });

    await repo.save(record);
    await repo.save(record); // idempotent same seal

    expect(await repo.findByMatch("match-hist-1")).toHaveLength(1);
    expect(await repo.findByCompetition("292")).toHaveLength(1);
    expect(await repo.findBySeason("2026")).toHaveLength(1);
    expect(
      await repo.findByDateRange(
        "2026-07-01T00:00:00.000Z",
        "2026-07-31T23:59:59.000Z",
      ),
    ).toHaveLength(1);
    expect(
      await repo.query({
        competitionId: "292",
        season: "2026",
        fromMatchDate: "2026-07-01T00:00:00.000Z",
        toMatchDate: "2026-07-31T23:59:59.000Z",
      }),
    ).toHaveLength(1);
  });

  it("does not mutate the prediction snapshot after save", async () => {
    const { prediction, actual, evaluation } = scoredFixture();
    const snapshot = JSON.stringify(prediction);
    const repo = new InMemoryEvaluationHistoryRepository();
    const record = buildEvaluationHistoryRecord({
      predictionSnapshot: prediction,
      actualResult: actual,
      evaluation,
      homeTeam: "Home FC",
      awayTeam: "Away FC",
      matchDate: "2026-07-19T10:30:00.000Z",
      recordedAt: "2026-07-19T13:00:00.000Z",
    });

    await repo.save(record);

    expect(JSON.stringify(prediction)).toBe(snapshot);
  });
});
