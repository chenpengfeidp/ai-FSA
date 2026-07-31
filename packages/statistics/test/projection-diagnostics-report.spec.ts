import { describe, expect, it } from "vitest";
import {
  computeProjectionDiagnosticsReport,
  type ProjectionReplayMetadata,
  type ProjectionReplayRecordOutcome,
  type EvaluationHistoryRecord,
} from "../src/index.js";
import {
  buildEvaluationHistoryRecord,
  createActualMatchResult,
  evaluatePrediction,
  type SealedPredictionInput,
} from "../src/index.js";

function predictionFixture(
  overrides: Partial<SealedPredictionInput> = {},
): SealedPredictionInput {
  return Object.freeze({
    matchId: "match-diag-1",
    projectionChecksum: "proj-diag",
    projectionStatus: "completed_nonempty",
    pHome: 0.55,
    pDraw: 0.25,
    pAway: 0.2,
    topScorelines: Object.freeze([
      Object.freeze({ homeGoals: 2, awayGoals: 1, probability: 0.14 }),
    ]),
    goalRange: Object.freeze({
      range01: 0.2,
      range23: 0.5,
      range4Plus: 0.3,
    }),
    predictionConfidence: 80,
    confidenceBand: "high",
    scenarios: Object.freeze({
      mostLikely: Object.freeze({
        slot: "mostLikely",
        winner: "home",
        homeGoals: 2,
        awayGoals: 1,
        probability: 0.14,
      }),
      secondLikely: Object.freeze({
        slot: "secondLikely",
        winner: "draw",
        homeGoals: 1,
        awayGoals: 1,
        probability: 0.12,
      }),
      upset: Object.freeze({
        slot: "upset",
        winner: "away",
        homeGoals: 0,
        awayGoals: 1,
        probability: 0.1,
      }),
    }),
    rules: Object.freeze([
      Object.freeze({
        ruleName: "HOME_ATTACK_EDGE",
        status: "PASS",
        channel: "home+",
      }),
      Object.freeze({
        ruleName: "AWAY_ATTACK_EDGE",
        status: "PASS",
        channel: "away+",
      }),
    ]),
    featureNames: Object.freeze(["homeTeam", "awayTeam", "kickoff"]),
    projectionModelVersion: "projection.v2.p1b.player",
    featureModelVersion: "feature.v2.p1b.player",
    ruleSetVersion: "rule.mvp.p1b.player",
    ...overrides,
  });
}

function historyRecord(
  prediction: SealedPredictionInput,
  actualWinner: "away" | "draw" | "home",
): EvaluationHistoryRecord {
  const actual = createActualMatchResult({
    matchId: prediction.matchId,
    homeGoals: actualWinner === "home" ? 1 : 0,
    awayGoals: actualWinner === "away" ? 1 : actualWinner === "draw" ? 1 : 0,
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

function metadataFixture(): ProjectionReplayMetadata {
  return Object.freeze({
    projectionConfidence: 80,
    footballStateDimensions: Object.freeze([
      Object.freeze({
        dimensionId: "attackState",
        dimensionLabel: "Attack State",
        level: "high" as const,
      }),
      Object.freeze({
        dimensionId: "defenseState",
        dimensionLabel: "Defense State",
        level: "low" as const,
      }),
    ]),
    activeMatchScripts: Object.freeze([
      Object.freeze({
        scriptId: "home_control",
        label: "Home Control",
        weight: 0.7,
      }),
      Object.freeze({
        scriptId: "open_match",
        label: "Open Match",
        weight: 0.3,
      }),
    ]),
  });
}

function outcomeFixture(input: {
  readonly historyId: string;
  readonly matchId: string;
  readonly winnerHit: boolean;
  readonly prediction: SealedPredictionInput;
}): ProjectionReplayRecordOutcome {
  return Object.freeze({
    historyId: input.historyId,
    matchId: input.matchId,
    v1Prediction: input.prediction,
    v2Prediction: input.prediction,
    v2ReplayStatus: "completed" as const,
    v2Metadata: metadataFixture(),
    v1Metrics: Object.freeze({
      winnerHit: input.winnerHit,
      drawHit: false,
      scoreHit: input.winnerHit,
      goalRangeHit: true,
      bttsHit: false,
      overUnderHit: true,
      predictionConfidence: 80,
      winnerHitNumeric: input.winnerHit ? 1 : 0,
    }),
    v2Metrics: Object.freeze({
      winnerHit: input.winnerHit,
      drawHit: false,
      scoreHit: input.winnerHit,
      goalRangeHit: true,
      bttsHit: false,
      overUnderHit: true,
      predictionConfidence: 80,
      winnerHitNumeric: input.winnerHit ? 1 : 0,
    }),
  });
}

describe("Projection diagnostics report (P2I)", () => {
  it("builds failure, script, football-state, rule, and confidence diagnostics", () => {
    const predictionHit = predictionFixture({ matchId: "match-diag-hit" });
    const predictionMiss = predictionFixture({
      matchId: "match-diag-miss",
      confidenceBand: "very_high",
      predictionConfidence: 90,
    });
    const recordHit = historyRecord(predictionHit, "home");
    const recordMiss = historyRecord(predictionMiss, "away");

    const report = computeProjectionDiagnosticsReport({
      replayResult: Object.freeze({
        replayedAt: "2026-07-19T14:00:00.000Z",
        outcomes: Object.freeze([
          outcomeFixture({
            historyId: recordHit.historyId,
            matchId: recordHit.matchId,
            winnerHit: true,
            prediction: predictionHit,
          }),
          outcomeFixture({
            historyId: recordMiss.historyId,
            matchId: recordMiss.matchId,
            winnerHit: false,
            prediction: predictionMiss,
          }),
        ]),
      }),
      sourceRecords: Object.freeze([recordHit, recordMiss]),
      computedAt: "2026-07-19T14:00:00.000Z",
    });

    expect(report.modelVersion).toBe("projectionDiagnosticsReport.v1.p2i");
    expect(report.sampleSize).toBe(2);
    expect(report.failureDistribution.topFailureReasons.length).toBeGreaterThan(0);
    expect(
      report.failureDistribution.categories.some(
        (row) => row.category === "winner_miss" && row.count === 1,
      ),
    ).toBe(true);
    expect(report.scriptDiagnostics.rows.length).toBeGreaterThan(0);
    expect(report.scriptDiagnostics.worstScripts.length).toBeGreaterThan(0);
    expect(report.scriptDiagnostics.bestScripts.length).toBeGreaterThan(0);
    expect(report.footballStateDiagnostics.rows.length).toBeGreaterThan(0);
    expect(
      report.footballStateDiagnostics.rows.some(
        (row) => row.dimensionId === "attackState" && row.falsePositive >= 0,
      ),
    ).toBe(true);
    expect(report.ruleDiagnostics.conflictPairs.length).toBeGreaterThan(0);
    expect(
      report.ruleDiagnostics.mostFrequentlyActivated[0]?.ruleName,
    ).toBeDefined();
    expect(report.confidenceDiagnostics.highConfidenceWrong).toBe(1);
    expect(report.confidenceDiagnostics.calibrationBuckets).toHaveLength(4);
  });
});
