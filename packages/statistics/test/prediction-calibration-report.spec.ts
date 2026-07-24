import { describe, expect, it } from "vitest";
import type { ConfidenceBandLabel } from "../src/domain/prediction-calibration-report.js";
import { MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE } from "../src/domain/prediction-calibration-report.js";
import {
  buildEvaluationHistoryRecord,
  createActualMatchResult,
  evaluatePrediction,
  type EvaluationHistoryRecord,
  type MatchWinner,
  type SealedPredictionInput,
} from "../src/index.js";
import { computePredictionCalibrationReport } from "../src/reliability/compute-prediction-calibration-report.js";

let sequence = 0;

function basePrediction(
  overrides: Partial<SealedPredictionInput> &
    Pick<SealedPredictionInput, "pAway" | "pDraw" | "pHome">,
  matchId: string,
): SealedPredictionInput {
  return Object.freeze({
    matchId,
    projectionChecksum: `proj:${matchId}`,
    projectionStatus: "completed_nonempty" as const,
    topScorelines: Object.freeze([
      Object.freeze({ homeGoals: 1, awayGoals: 0, probability: 0.12 }),
    ]),
    goalRange: Object.freeze({ range01: 0.3, range23: 0.45, range4Plus: 0.25 }),
    predictionConfidence: 60,
    confidenceBand: "medium" as const,
    scenarios: Object.freeze({
      mostLikely: Object.freeze({
        slot: "mostLikely" as const,
        winner: "home" as const,
        homeGoals: 1,
        awayGoals: 0,
        probability: overrides.pHome,
      }),
      secondLikely: Object.freeze({
        slot: "secondLikely" as const,
        winner: "draw" as const,
        homeGoals: 1,
        awayGoals: 1,
        probability: overrides.pDraw,
      }),
      upset: Object.freeze({
        slot: "upset" as const,
        winner: "away" as const,
        homeGoals: 0,
        awayGoals: 1,
        probability: overrides.pAway,
      }),
    }),
    rules: Object.freeze([
      Object.freeze({
        ruleName: "HOME_ATTACK_EDGE",
        status: "PASS" as const,
        channel: "home+" as const,
      }),
    ]),
    featureNames: Object.freeze(["homeTeam", "awayTeam"]),
    projectionModelVersion: "projection.v2.i2b.market",
    featureModelVersion: "feature.v2.i2b.market",
    ruleSetVersion: "rule.mvp.i2b.market",
    ...overrides,
  });
}

interface RecordFixtureInput {
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
  readonly winner: MatchWinner;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly confidenceBand: ConfidenceBandLabel;
  readonly predictionConfidence: number;
  readonly matchDate?: string;
}

function buildRecord(input: RecordFixtureInput): EvaluationHistoryRecord {
  sequence += 1;
  const matchId = `calib-fixture-${sequence}`;
  const totalGoals = input.homeGoals + input.awayGoals;
  const matchDate = input.matchDate ?? "2026-07-01T15:00:00.000Z";

  const prediction = basePrediction(
    {
      pHome: input.pHome,
      pDraw: input.pDraw,
      pAway: input.pAway,
      predictionConfidence: input.predictionConfidence,
      confidenceBand: input.confidenceBand,
    },
    matchId,
  );

  const actual = createActualMatchResult({
    matchId,
    homeGoals: input.homeGoals,
    awayGoals: input.awayGoals,
    winner: input.winner,
    totalGoals,
    competitionId: "demo",
    competitionName: "Calibration Demo League",
    matchStatus: "FINISHED",
    providerId: "football:demo",
    providerSourceId: `demo:${matchId}:result`,
    providerMethod: "recorded-snapshot",
    observedAt: matchDate,
  });

  const evaluation = evaluatePrediction({
    prediction,
    actual,
    evaluatedAt: matchDate,
  });

  return buildEvaluationHistoryRecord({
    predictionSnapshot: prediction,
    actualResult: actual,
    evaluation,
    homeTeam: "Home FC",
    awayTeam: "Away FC",
    matchDate,
    recordedAt: matchDate,
  });
}

describe("computePredictionCalibrationReport (A2)", () => {
  it("honestly reports an empty, unqualified report for zero History rows", () => {
    const report = computePredictionCalibrationReport({
      records: [],
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    expect(report.schemaVersion).toBe("calibration-report.mvp.a2");
    expect(report.sampleSize).toBe(0);
    expect(report.qualified).toBe(false);
    expect(report.expectedCalibrationError.value).toBeUndefined();
    expect(report.brierScore.value).toBeUndefined();
    expect(
      report.confidenceBucketAccuracy.every((row) => row.sampleSize === 0),
    ).toBe(true);
    expect(report.limitations).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Computed only from Evaluation History"),
      ]),
    );
    expect(Object.isFrozen(report)).toBe(true);
  });

  it("computes confidence bucket accuracy and distribution honestly per band", () => {
    const records = [
      buildRecord({
        pHome: 0.7,
        pDraw: 0.2,
        pAway: 0.1,
        winner: "home",
        homeGoals: 2,
        awayGoals: 0,
        confidenceBand: "high",
        predictionConfidence: 78,
      }),
      buildRecord({
        pHome: 0.65,
        pDraw: 0.2,
        pAway: 0.15,
        winner: "away",
        homeGoals: 0,
        awayGoals: 1,
        confidenceBand: "high",
        predictionConfidence: 72,
      }),
      buildRecord({
        pHome: 0.3,
        pDraw: 0.4,
        pAway: 0.3,
        winner: "draw",
        homeGoals: 1,
        awayGoals: 1,
        confidenceBand: "medium",
        predictionConfidence: 52,
      }),
    ];

    const report = computePredictionCalibrationReport({
      records,
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    const high = report.confidenceBucketAccuracy.find((row) => row.band === "high");
    const medium = report.confidenceBucketAccuracy.find(
      (row) => row.band === "medium",
    );
    const low = report.confidenceBucketAccuracy.find((row) => row.band === "low");

    expect(high).toMatchObject({ sampleSize: 2, hits: 1, accuracy: 0.5 });
    expect(medium).toMatchObject({ sampleSize: 1, hits: 1, accuracy: 1 });
    expect(low).toMatchObject({ sampleSize: 0, hits: 0, accuracy: undefined });

    const highDistribution = report.confidenceDistribution.find(
      (row) => row.band === "high",
    );
    expect(highDistribution?.sampleSize).toBe(2);
    expect(highDistribution?.share).toBeCloseTo(2 / 3, 5);
  });

  it("flags a bucket as unqualified below the minimum bucket sample size", () => {
    const records = [
      buildRecord({
        pHome: 0.6,
        pDraw: 0.25,
        pAway: 0.15,
        winner: "home",
        homeGoals: 1,
        awayGoals: 0,
        confidenceBand: "high",
        predictionConfidence: 70,
      }),
    ];

    const report = computePredictionCalibrationReport({
      records,
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    const high = report.confidenceBucketAccuracy.find((row) => row.band === "high");
    expect(high?.sampleSize).toBe(1);
    expect(high?.sampleSize).toBeLessThan(MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE);
    expect(high?.qualified).toBe(false);
    expect(report.limitations).toEqual(
      expect.arrayContaining([expect.stringContaining("unqualified")]),
    );
  });

  it("computes the reliability table (predicted-winner probability vs observed frequency)", () => {
    const records = [
      buildRecord({
        pHome: 0.75,
        pDraw: 0.15,
        pAway: 0.1,
        winner: "home",
        homeGoals: 2,
        awayGoals: 0,
        confidenceBand: "very_high",
        predictionConfidence: 88,
      }),
      buildRecord({
        pHome: 0.72,
        pDraw: 0.18,
        pAway: 0.1,
        winner: "away",
        homeGoals: 0,
        awayGoals: 1,
        confidenceBand: "high",
        predictionConfidence: 74,
      }),
    ];

    const report = computePredictionCalibrationReport({
      records,
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    const bucket70to80 = report.reliabilityTable.find(
      (row) => row.bucketLabel === "70-80%",
    );

    expect(bucket70to80).toMatchObject({ sampleSize: 2, observedFrequency: 0.5 });
    expect(bucket70to80?.meanPredictedProbability).toBeCloseTo(0.735, 5);
    expect(report.reliabilityTable).toHaveLength(10);
  });

  it("computes Expected Calibration Error as the sample-weighted mean absolute gap", () => {
    const records = [
      buildRecord({
        pHome: 0.9,
        pDraw: 0.05,
        pAway: 0.05,
        winner: "home",
        homeGoals: 3,
        awayGoals: 0,
        confidenceBand: "very_high",
        predictionConfidence: 92,
      }),
      buildRecord({
        pHome: 0.9,
        pDraw: 0.05,
        pAway: 0.05,
        winner: "away",
        homeGoals: 0,
        awayGoals: 1,
        confidenceBand: "very_high",
        predictionConfidence: 92,
      }),
    ];

    const report = computePredictionCalibrationReport({
      records,
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    // Bucket 90-100%: mean predicted 0.9, observed frequency 0.5 -> |0.5-0.9| = 0.4
    expect(report.expectedCalibrationError.value).toBeCloseTo(0.4, 5);
    expect(report.expectedCalibrationError.sampleSize).toBe(2);
  });

  it("computes the multi-class Brier score from sealed pHome/pDraw/pAway vs actual winner", () => {
    const records = [
      buildRecord({
        pHome: 1,
        pDraw: 0,
        pAway: 0,
        winner: "home",
        homeGoals: 1,
        awayGoals: 0,
        confidenceBand: "very_high",
        predictionConfidence: 95,
      }),
    ];

    const report = computePredictionCalibrationReport({
      records,
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    // Perfect prediction (pHome=1, actual=home) -> squared error 0 for all three classes.
    expect(report.brierScore.value).toBe(0);
    expect(report.brierScore.sampleSize).toBe(1);
  });

  it("computes win/draw/loss (outcome) calibration independent of the predicted winner", () => {
    const records = [
      buildRecord({
        pHome: 0.35,
        pDraw: 0.3,
        pAway: 0.35,
        winner: "home",
        homeGoals: 1,
        awayGoals: 0,
        confidenceBand: "low",
        predictionConfidence: 40,
      }),
    ];

    const report = computePredictionCalibrationReport({
      records,
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    const homeRow = report.outcomeCalibration.find(
      (row) => row.outcome === "home" && row.bucketLabel === "30-40%",
    );
    const drawRow = report.outcomeCalibration.find(
      (row) => row.outcome === "draw" && row.bucketLabel === "30-40%",
    );
    const awayRow = report.outcomeCalibration.find(
      (row) => row.outcome === "away" && row.bucketLabel === "30-40%",
    );

    expect(homeRow).toMatchObject({ sampleSize: 1, observedFrequency: 1 });
    expect(drawRow).toMatchObject({ sampleSize: 1, observedFrequency: 0 });
    expect(awayRow).toMatchObject({ sampleSize: 1, observedFrequency: 0 });
    expect(report.outcomeCalibration).toHaveLength(30);
  });

  it("computes goal-range calibration accuracy per predicted bucket", () => {
    const records = [
      buildRecord({
        pHome: 0.5,
        pDraw: 0.3,
        pAway: 0.2,
        winner: "home",
        homeGoals: 1,
        awayGoals: 0,
        confidenceBand: "medium",
        predictionConfidence: 55,
      }),
      buildRecord({
        pHome: 0.4,
        pDraw: 0.35,
        pAway: 0.25,
        winner: "draw",
        homeGoals: 2,
        awayGoals: 2,
        confidenceBand: "medium",
        predictionConfidence: 50,
      }),
    ];

    const report = computePredictionCalibrationReport({
      records,
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    // Both fixtures use the default goalRange (range23 highest) => predictedGoalRange = range23.
    const range23 = report.goalRangeCalibration.find(
      (row) => row.bucket === "range23",
    );
    const range01 = report.goalRangeCalibration.find(
      (row) => row.bucket === "range01",
    );

    expect(range23?.sampleSize).toBe(2);
    // Row 1: totalGoals=1 -> actual range01 (miss). Row 2: totalGoals=4 -> actual range4Plus (miss).
    expect(range23?.hits).toBe(0);
    expect(range23?.accuracy).toBe(0);
    expect(range01?.sampleSize).toBe(0);
  });

  it("records provenance (schema/model versions, record count, match-date span)", () => {
    const records = [
      buildRecord({
        pHome: 0.5,
        pDraw: 0.3,
        pAway: 0.2,
        winner: "home",
        homeGoals: 1,
        awayGoals: 0,
        confidenceBand: "medium",
        predictionConfidence: 55,
        matchDate: "2026-06-01T10:00:00.000Z",
      }),
      buildRecord({
        pHome: 0.4,
        pDraw: 0.35,
        pAway: 0.25,
        winner: "draw",
        homeGoals: 1,
        awayGoals: 1,
        confidenceBand: "medium",
        predictionConfidence: 50,
        matchDate: "2026-07-10T10:00:00.000Z",
      }),
    ];

    const report = computePredictionCalibrationReport({
      records,
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    expect(report.provenance).toMatchObject({
      sourceRecordCount: 2,
      evaluationHistorySchemaVersions: ["evaluation-history.mvp.a15"],
      evaluationModelVersions: ["evaluation.mvp.a1"],
      projectionModelVersions: ["projection.v2.i2b.market"],
      earliestMatchDate: "2026-06-01T10:00:00.000Z",
      latestMatchDate: "2026-07-10T10:00:00.000Z",
    });
  });

  it("is deterministic for the same input records", () => {
    const records = [
      buildRecord({
        pHome: 0.55,
        pDraw: 0.25,
        pAway: 0.2,
        winner: "home",
        homeGoals: 1,
        awayGoals: 0,
        confidenceBand: "high",
        predictionConfidence: 70,
      }),
    ];

    const first = computePredictionCalibrationReport({
      records,
      computedAt: "2026-07-24T00:00:00.000Z",
    });
    const second = computePredictionCalibrationReport({
      records,
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    expect(first).toEqual(second);
  });

  it("does not mutate the input Evaluation History records", () => {
    const records = [
      buildRecord({
        pHome: 0.55,
        pDraw: 0.25,
        pAway: 0.2,
        winner: "home",
        homeGoals: 1,
        awayGoals: 0,
        confidenceBand: "high",
        predictionConfidence: 70,
      }),
    ];
    const snapshot = JSON.stringify(records);

    computePredictionCalibrationReport({
      records,
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    expect(JSON.stringify(records)).toBe(snapshot);
  });
});
