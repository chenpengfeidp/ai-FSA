import { describe, expect, it } from "vitest";
import {
  buildEvaluationHistoryRecord,
  computeProjectionReplayComparisonReport,
  computeProjectionReplayMetrics,
  createActualMatchResult,
  evaluatePrediction,
  isProjectionReplayResult,
  pearsonCorrelation,
  ReplayRunner,
  type EvaluationHistoryRecord,
  type ProjectionReplayPort,
  type SealedPredictionInput,
} from "../src/index.js";

function predictionFixture(
  overrides: Partial<SealedPredictionInput> = {},
): SealedPredictionInput {
  return Object.freeze({
    matchId: "match-replay-1",
    projectionChecksum: "proj-replay",
    projectionStatus: "completed_nonempty",
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
    confidenceBand: "high",
    scenarios: Object.freeze({
      mostLikely: Object.freeze({
        slot: "mostLikely",
        winner: "home",
        homeGoals: 1,
        awayGoals: 0,
        probability: 0.52,
      }),
      secondLikely: Object.freeze({
        slot: "secondLikely",
        winner: "draw",
        homeGoals: 1,
        awayGoals: 1,
        probability: 0.28,
      }),
      upset: Object.freeze({
        slot: "upset",
        winner: "away",
        homeGoals: 0,
        awayGoals: 1,
        probability: 0.2,
      }),
    }),
    rules: Object.freeze([
      Object.freeze({
        ruleName: "HOME_ATTACK_EDGE",
        status: "PASS",
        channel: "home+",
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
    ...overrides,
  });
}

function historyRecordFixture(
  prediction: SealedPredictionInput,
  actualWinner: "away" | "draw" | "home" = "home",
): EvaluationHistoryRecord {
  const actual = createActualMatchResult({
    matchId: prediction.matchId,
    homeGoals: actualWinner === "away" ? 0 : 1,
    awayGoals: actualWinner === "home" ? 0 : actualWinner === "draw" ? 1 : 1,
    winner: actualWinner,
    totalGoals: actualWinner === "draw" ? 2 : 1,
    competitionId: "292",
    competitionName: "K League 1",
    matchStatus: "FINISHED",
    providerId: "football:demo",
    providerSourceId: `demo:${prediction.matchId}:result`,
    providerMethod: "recorded-snapshot",
    observedAt: "2026-07-19T12:00:00.000Z",
  });

  const evaluation = evaluatePrediction({
    prediction,
    actual,
    evaluatedAt: "2026-07-19T13:00:00.000Z",
  });

  return buildEvaluationHistoryRecord({
    predictionSnapshot: prediction,
    actualResult: actual,
    evaluation,
    homeTeam: "Home FC",
    awayTeam: "Away FC",
    matchDate: "2026-07-19T10:30:00.000Z",
    recordedAt: "2026-07-19T13:00:00.000Z",
  });
}

describe("Projection replay metrics (P2E.5)", () => {
  it("computes winner, draw, score, goal-range, BTTS, and O/U hits", () => {
    const prediction = predictionFixture();
    const actual = createActualMatchResult({
      matchId: "match-replay-1",
      homeGoals: 1,
      awayGoals: 0,
      winner: "home",
      totalGoals: 1,
      competitionId: "292",
      competitionName: "K League 1",
      matchStatus: "FINISHED",
      providerId: "football:demo",
      providerSourceId: "demo:match-replay-1:result",
      providerMethod: "recorded-snapshot",
      observedAt: "2026-07-19T12:00:00.000Z",
    });

    const metrics = computeProjectionReplayMetrics({
      prediction,
      actual,
      evaluatedAt: "2026-07-19T13:00:00.000Z",
    });

    expect(metrics.winnerHit).toBe(true);
    expect(metrics.scoreHit).toBe(true);
    expect(metrics.bttsHit).toBe(true);
    expect(metrics.overUnderHit).toBe(false);
    expect(metrics.predictionConfidence).toBe(74);
  });

  it("computes Pearson correlation for confidence vs winner hit", () => {
    const correlation = pearsonCorrelation([10, 20, 30, 40], [0, 0, 1, 1]);

    expect(correlation).toBeCloseTo(0.894427, 5);
  });
});

describe("ReplayRunner (P2E.5)", () => {
  it("replays V1 from sealed snapshot and V2 when sidecar is present", () => {
    const v1Prediction = predictionFixture({ matchId: "match-replay-runner" });
    const v2Prediction = predictionFixture({
      matchId: "match-replay-runner",
      pHome: 0.4,
      pDraw: 0.35,
      pAway: 0.25,
      projectionChecksum: "proj-replay-v2",
    });
    const record = historyRecordFixture(v1Prediction);

    const port: ProjectionReplayPort = {
      replayV1: ({ record: historyRecord }) =>
        Object.freeze({
          version: "v1",
          prediction: historyRecord.predictionSnapshot,
        }),
      replayV2: () =>
        Object.freeze({
          version: "v2",
          prediction: v2Prediction,
        }),
    };

    const runner = new ReplayRunner();
    const result = runner.run({
      records: [record],
      replayPort: port,
      replaySidecar: Object.freeze({
        [record.historyId]: Object.freeze({
          matchId: record.matchId,
          featureModelVersion: record.featureModelVersion,
          featureBundleChecksum: "bundle-checksum",
          featureBundleStatus: "completed",
          evidenceRefs: Object.freeze(["evidence-1"]),
          features: Object.freeze([
            Object.freeze({ name: "homeTeam", value: "Home FC" }),
          ]),
          rules: Object.freeze([
            Object.freeze({
              ruleId: "rule:home-team-present:v1",
              ruleName: "HOME_TEAM_PRESENT",
              status: "PASS",
              channel: "none",
              weight: 0,
              score: 0,
            }),
          ]),
          requiredEvidencePresentCount: 5,
          generatedAt: "2026-07-19T11:00:00.000Z",
        }),
      }),
      evaluatedAt: "2026-07-19T14:00:00.000Z",
    });

    expect(result.outcomes).toHaveLength(1);
    const outcome = result.outcomes[0];
    expect(outcome?.v2ReplayStatus).toBe("completed");
    expect(outcome?.v1Prediction.projectionChecksum).toBe("proj-replay");
    expect(outcome?.v2Prediction?.projectionChecksum).toBe("proj-replay-v2");
    expect(outcome?.v1Metrics.winnerHit).toBe(true);
    expect(outcome?.v2Metrics?.winnerHit).toBe(true);
  });

  it("skips V2 when sidecar is missing without mutating history", () => {
    const record = historyRecordFixture(
      predictionFixture({ matchId: "match-replay-skip" }),
    );
    const port: ProjectionReplayPort = {
      replayV1: ({ record: historyRecord }) =>
        Object.freeze({
          version: "v1",
          prediction: historyRecord.predictionSnapshot,
        }),
      replayV2: () =>
        Object.freeze({
          version: "v2",
          reason: "Missing SealedProjectionReplayContext sidecar for V2 replay.",
        }),
    };

    const runner = new ReplayRunner();
    const result = runner.run({
      records: [record],
      replayPort: port,
      evaluatedAt: "2026-07-19T14:00:00.000Z",
    });

    expect(result.outcomes[0]?.v2ReplayStatus).toBe("skipped");
    expect(result.outcomes[0]?.v2Metrics).toBeNull();
    expect(record.predictionSnapshot.projectionChecksum).toBe("proj-replay");
  });
});

describe("Projection replay comparison report (P2E.5)", () => {
  it("groups comparison by competition, season, feature profile, and intelligence domain", () => {
    const record = historyRecordFixture(
      predictionFixture({ matchId: "match-replay-report" }),
    );
    const v2Prediction = predictionFixture({
      matchId: "match-replay-report",
      projectionChecksum: "proj-replay-v2",
    });

    const port: ProjectionReplayPort = {
      replayV1: ({ record: historyRecord }) =>
        Object.freeze({
          version: "v1",
          prediction: historyRecord.predictionSnapshot,
        }),
      replayV2: () =>
        Object.freeze({
          version: "v2",
          prediction: v2Prediction,
        }),
    };

    const runner = new ReplayRunner();
    const replayResult = runner.run({
      records: [record],
      replayPort: port,
      replaySidecar: Object.freeze({
        [record.matchId]: Object.freeze({
          matchId: record.matchId,
          featureModelVersion: record.featureModelVersion,
          featureBundleChecksum: "bundle-checksum",
          featureBundleStatus: "completed",
          evidenceRefs: Object.freeze(["evidence-1"]),
          features: Object.freeze([
            Object.freeze({ name: "homeTeam", value: "Home FC" }),
          ]),
          rules: Object.freeze([
            Object.freeze({
              ruleId: "rule:home-team-present:v1",
              ruleName: "HOME_TEAM_PRESENT",
              status: "PASS",
              channel: "none",
              weight: 0,
              score: 0,
            }),
          ]),
          requiredEvidencePresentCount: 5,
          generatedAt: "2026-07-19T11:00:00.000Z",
        }),
      }),
      evaluatedAt: "2026-07-19T14:00:00.000Z",
    });

    const report = computeProjectionReplayComparisonReport({
      outcomes: replayResult.outcomes,
      sourceRecords: [record],
      computedAt: "2026-07-19T14:00:00.000Z",
    });

    expect(report.overall.v1.sampleSize).toBe(1);
    expect(report.overall.v2.scoredSampleSize).toBe(1);
    expect(report.byCompetition.length).toBeGreaterThan(0);
    expect(report.bySeason.length).toBeGreaterThan(0);
    expect(report.byFeatureProfile.length).toBeGreaterThan(0);
    expect(report.byIntelligenceDomain.length).toBeGreaterThan(0);
    expect(report.overall.v1.calibration).toBeDefined();
    expect(report.overall.v2.calibration).toBeDefined();
  });
});

describe("Projection replay port helpers", () => {
  it("detects successful replay outcomes", () => {
    const outcome = Object.freeze({
      version: "v1" as const,
      prediction: predictionFixture(),
    });

    expect(isProjectionReplayResult(outcome)).toBe(true);
    expect(
      isProjectionReplayResult(
        Object.freeze({ version: "v2" as const, reason: "skip" }),
      ),
    ).toBe(false);
  });
});
