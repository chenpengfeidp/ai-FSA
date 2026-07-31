import { describe, expect, it } from "vitest";
import {
  computeProjectionReplayReport,
  type ProjectionReplayMetadata,
  type ProjectionReplayRecordOutcome,
} from "../src/index.js";

function metadataFixture(
  overrides: Partial<ProjectionReplayMetadata> = {},
): ProjectionReplayMetadata {
  return Object.freeze({
    projectionConfidence: 72,
    footballStateDimensions: Object.freeze([
      Object.freeze({
        dimensionId: "attackState",
        dimensionLabel: "Attack State",
        level: "high" as const,
      }),
      Object.freeze({
        dimensionId: "defenseState",
        dimensionLabel: "Defense State",
        level: "medium" as const,
      }),
    ]),
    activeMatchScripts: Object.freeze([
      Object.freeze({
        scriptId: "home_control",
        label: "Home Control",
        weight: 0.6,
      }),
      Object.freeze({
        scriptId: "open_match",
        label: "Open Match",
        weight: 0.4,
      }),
    ]),
    ...overrides,
  });
}

function outcomeFixture(input: {
  readonly historyId: string;
  readonly winnerHit: boolean;
  readonly scoreHit: boolean;
  readonly goalRangeHit: boolean;
  readonly metadata?: ProjectionReplayMetadata;
}): ProjectionReplayRecordOutcome {
  return Object.freeze({
    historyId: input.historyId,
    matchId: `match-${input.historyId}`,
    v1Prediction: Object.freeze({
      matchId: `match-${input.historyId}`,
      projectionChecksum: "v1",
      projectionStatus: "completed_nonempty",
      pHome: 0.5,
      pDraw: 0.25,
      pAway: 0.25,
      topScorelines: Object.freeze([]),
      goalRange: Object.freeze({ range01: 0.3, range23: 0.4, range4Plus: 0.3 }),
      predictionConfidence: 70,
      confidenceBand: "high" as const,
      scenarios: Object.freeze({
        mostLikely: Object.freeze({
          slot: "mostLikely" as const,
          winner: "home" as const,
          homeGoals: 1,
          awayGoals: 0,
          probability: 0.5,
        }),
        secondLikely: Object.freeze({
          slot: "secondLikely" as const,
          winner: "draw" as const,
          homeGoals: 1,
          awayGoals: 1,
          probability: 0.25,
        }),
        upset: Object.freeze({
          slot: "upset" as const,
          winner: "away" as const,
          homeGoals: 0,
          awayGoals: 1,
          probability: 0.25,
        }),
      }),
      rules: Object.freeze([]),
      featureNames: Object.freeze(["homeTeam"]),
      projectionModelVersion: "projection.v2.p1b.player",
      featureModelVersion: "feature.v2.p1b.player",
      ruleSetVersion: "rule.mvp.p1b.player",
    }),
    v2Prediction: null,
    v2ReplayStatus: "completed" as const,
    v2Metadata: input.metadata ?? metadataFixture(),
    v1Metrics: Object.freeze({
      winnerHit: input.winnerHit,
      drawHit: false,
      scoreHit: input.scoreHit,
      goalRangeHit: input.goalRangeHit,
      bttsHit: false,
      overUnderHit: false,
      predictionConfidence: 70,
      winnerHitNumeric: input.winnerHit ? 1 : 0,
    }),
    v2Metrics: Object.freeze({
      winnerHit: input.winnerHit,
      drawHit: false,
      scoreHit: input.scoreHit,
      goalRangeHit: input.goalRangeHit,
      bttsHit: true,
      overUnderHit: false,
      predictionConfidence: 72,
      winnerHitNumeric: input.winnerHit ? 1 : 0,
    }),
  });
}

describe("Projection replay report (P2H)", () => {
  it("builds summary, version comparison, script and football state contributions", () => {
    const replayResult = Object.freeze({
      replayedAt: "2026-07-19T14:00:00.000Z",
      outcomes: Object.freeze([
        outcomeFixture({
          historyId: "h1",
          winnerHit: true,
          scoreHit: true,
          goalRangeHit: true,
        }),
        outcomeFixture({
          historyId: "h2",
          winnerHit: false,
          scoreHit: false,
          goalRangeHit: true,
        }),
      ]),
    });

    const report = computeProjectionReplayReport({
      replayResult,
      sourceRecords: Object.freeze([]),
      computedAt: "2026-07-19T14:00:00.000Z",
    });

    expect(report.modelVersion).toBe("projectionReplayReport.v1.p2h");
    expect(report.summary.populationSampleSize).toBe(2);
    expect(report.summary.v2ScoredSampleSize).toBe(2);
    expect(report.versionComparison.v1.winnerAccuracy.value).toBeCloseTo(0.5, 6);
    expect(report.versionComparison.v2.winnerAccuracy.value).toBeCloseTo(0.5, 6);
    expect(report.scriptContributions.length).toBeGreaterThan(0);
    expect(report.scriptContributions[0]?.activationCount).toBeGreaterThan(0);
    expect(report.footballStateContributions.length).toBeGreaterThan(0);
    expect(
      report.footballStateContributions.some(
        (row) => row.dimensionId === "attackState",
      ),
    ).toBe(true);
  });
});
