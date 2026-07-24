import { describe, expect, it } from "vitest";
import {
  ADVANCED_STATISTICS_FEATURE_NAMES,
  CLUB_INTELLIGENCE_FEATURE_NAMES,
  EXPECTED_GOALS_FEATURE_NAMES,
  MATCH_CONTEXT_FEATURE_NAMES,
  PLAYER_INTELLIGENCE_FEATURE_NAMES,
  classifyFeatureProfile,
} from "../src/validation/feature-profile.js";
import { computeValidationReport } from "../src/validation/compute-validation-report.js";
import {
  buildEvaluationHistoryRecord,
  createActualMatchResult,
  evaluatePrediction,
  type EvaluationHistoryRecord,
  type MatchWinner,
  type SealedPredictionInput,
} from "../src/index.js";

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
    projectionModelVersion: "projection.v2.p1b.player",
    featureModelVersion: "feature.v2.p1b.player",
    ruleSetVersion: "rule.mvp.p1b.player",
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
  readonly featureNames: readonly string[];
  readonly matchDate?: string;
}

function buildRecord(input: RecordFixtureInput): EvaluationHistoryRecord {
  sequence += 1;
  const matchId = `validation-fixture-${sequence}`;
  const totalGoals = input.homeGoals + input.awayGoals;
  const matchDate = input.matchDate ?? "2026-07-01T15:00:00.000Z";

  const prediction = basePrediction(
    {
      pHome: input.pHome,
      pDraw: input.pDraw,
      pAway: input.pAway,
      featureNames: Object.freeze([...input.featureNames]),
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
    competitionName: "Validation Demo League",
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

const oneClubFeature = [...CLUB_INTELLIGENCE_FEATURE_NAMES][0] as string;
const onePlayerFeature = [...PLAYER_INTELLIGENCE_FEATURE_NAMES][0] as string;
const oneXgFeature = [...EXPECTED_GOALS_FEATURE_NAMES][0] as string;
const oneMatchContextFeature = [...MATCH_CONTEXT_FEATURE_NAMES][0] as string;
const oneAdvancedStatsFeature = [...ADVANCED_STATISTICS_FEATURE_NAMES][0] as string;

describe("classifyFeatureProfile", () => {
  it("classifies a bare snapshot as baseline", () => {
    expect(classifyFeatureProfile(["homeTeam", "awayTeam", "kickoff"])).toBe(
      "baseline",
    );
  });

  it("classifies club-only snapshots as club_intelligence", () => {
    expect(classifyFeatureProfile(["homeTeam", oneClubFeature])).toBe(
      "club_intelligence",
    );
  });

  it("classifies club+player snapshots as club_player", () => {
    expect(
      classifyFeatureProfile(["homeTeam", oneClubFeature, onePlayerFeature]),
    ).toBe("club_player");
  });

  it("classifies club+player+xg snapshots as club_player_xg", () => {
    expect(
      classifyFeatureProfile([
        "homeTeam",
        oneClubFeature,
        onePlayerFeature,
        oneXgFeature,
      ]),
    ).toBe("club_player_xg");
  });

  it("classifies club+player+xg+context+advancedStats snapshots as full_football_intelligence", () => {
    expect(
      classifyFeatureProfile([
        "homeTeam",
        oneClubFeature,
        onePlayerFeature,
        oneXgFeature,
        oneMatchContextFeature,
        oneAdvancedStatsFeature,
      ]),
    ).toBe("full_football_intelligence");
  });

  it("never re-derives a profile without player Features even with club+xg present", () => {
    expect(classifyFeatureProfile(["homeTeam", oneClubFeature, oneXgFeature])).toBe(
      "club_intelligence",
    );
  });
});

describe("computeValidationReport (V1A)", () => {
  it("honestly reports an empty, unqualified report for zero History rows", () => {
    const report = computeValidationReport({
      records: [],
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    expect(report.schemaVersion).toBe("validation-report.mvp.v1a");
    expect(report.totalSampleSize).toBe(0);
    expect(report.profiles).toHaveLength(5);
    expect(report.profiles.every((row) => row.sampleSize === 0)).toBe(true);
    expect(report.profiles.every((row) => row.qualified === false)).toBe(true);
    expect(report.limitations).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Computed only from Evaluation History"),
        expect.stringContaining("never claims"),
      ]),
    );
    expect(Object.isFrozen(report)).toBe(true);
  });

  it("partitions the same sealed History population into disjoint profiles", () => {
    const baselineRecord = buildRecord({
      pHome: 0.4,
      pDraw: 0.3,
      pAway: 0.3,
      winner: "home",
      homeGoals: 1,
      awayGoals: 0,
      featureNames: ["homeTeam", "awayTeam"],
    });
    const clubRecord = buildRecord({
      pHome: 0.5,
      pDraw: 0.3,
      pAway: 0.2,
      winner: "home",
      homeGoals: 2,
      awayGoals: 0,
      featureNames: ["homeTeam", oneClubFeature],
    });
    const clubPlayerRecord = buildRecord({
      pHome: 0.6,
      pDraw: 0.25,
      pAway: 0.15,
      winner: "home",
      homeGoals: 1,
      awayGoals: 0,
      featureNames: ["homeTeam", oneClubFeature, onePlayerFeature],
    });

    const report = computeValidationReport({
      records: [baselineRecord, clubRecord, clubPlayerRecord],
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    expect(report.totalSampleSize).toBe(3);

    const baseline = report.profiles.find((row) => row.profile === "baseline");
    const club = report.profiles.find((row) => row.profile === "club_intelligence");
    const clubPlayer = report.profiles.find((row) => row.profile === "club_player");
    const clubPlayerXg = report.profiles.find(
      (row) => row.profile === "club_player_xg",
    );

    expect(baseline?.sampleSize).toBe(1);
    expect(club?.sampleSize).toBe(1);
    expect(clubPlayer?.sampleSize).toBe(1);
    expect(clubPlayerXg?.sampleSize).toBe(0);

    // Every profile is evaluated against the same sealed population (sum == total).
    const sum = report.profiles.reduce((acc, row) => acc + row.sampleSize, 0);
    expect(sum).toBe(3);
  });

  it("computes Winner/Score/Goal-range accuracy and coverage/paper-return per profile from reused Evaluation metrics", () => {
    const hit = buildRecord({
      pHome: 0.7,
      pDraw: 0.2,
      pAway: 0.1,
      winner: "home",
      homeGoals: 1,
      awayGoals: 0,
      featureNames: ["homeTeam", oneClubFeature],
    });
    const miss = buildRecord({
      pHome: 0.7,
      pDraw: 0.2,
      pAway: 0.1,
      winner: "away",
      homeGoals: 0,
      awayGoals: 1,
      featureNames: ["homeTeam", oneClubFeature],
    });

    const report = computeValidationReport({
      records: [hit, miss],
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    const club = report.profiles.find((row) => row.profile === "club_intelligence");

    expect(club?.sampleSize).toBe(2);
    expect(club?.winnerAccuracy).toMatchObject({ value: 0.5, sampleSize: 2 });
    expect(club?.coverage.sampleSize).toBe(2);
    expect(club?.coverage.value).toBeGreaterThanOrEqual(0);
    expect(club?.paperReturn.sampleSize).toBe(2);
    // +1 for the hit, -1 for the miss -> mean 0.
    expect(club?.paperReturn.value).toBe(0);
  });

  it("computes Draw Accuracy against actual-draw sub-segment sample size, not the profile total", () => {
    const draw = buildRecord({
      pHome: 0.3,
      pDraw: 0.4,
      pAway: 0.3,
      winner: "draw",
      homeGoals: 1,
      awayGoals: 1,
      featureNames: ["homeTeam", oneClubFeature],
    });
    const nonDraw = buildRecord({
      pHome: 0.6,
      pDraw: 0.25,
      pAway: 0.15,
      winner: "home",
      homeGoals: 1,
      awayGoals: 0,
      featureNames: ["homeTeam", oneClubFeature],
    });

    const report = computeValidationReport({
      records: [draw, nonDraw],
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    const club = report.profiles.find((row) => row.profile === "club_intelligence");

    expect(club?.sampleSize).toBe(2);
    expect(club?.drawAccuracy.sampleSize).toBe(1);
    expect(club?.drawAccuracy.value).toBe(1);
    expect(club?.drawAccuracy.qualified).toBe(false);
  });

  it("attaches a full reused A2 Prediction Calibration report scoped to each profile's partition", () => {
    const records = Array.from({ length: 3 }, (_, index) =>
      buildRecord({
        pHome: 0.6,
        pDraw: 0.25,
        pAway: 0.15,
        winner: index % 2 === 0 ? "home" : "away",
        homeGoals: index % 2 === 0 ? 1 : 0,
        awayGoals: index % 2 === 0 ? 0 : 1,
        featureNames: ["homeTeam", oneClubFeature],
      }),
    );

    const report = computeValidationReport({
      records,
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    const club = report.profiles.find((row) => row.profile === "club_intelligence");
    expect(club?.calibration.schemaVersion).toBe("calibration-report.mvp.a2");
    expect(club?.calibration.sampleSize).toBe(3);
    expect(club?.calibration.provenance.sourceRecordCount).toBe(3);
  });

  it("flags unqualified profiles below the minimum profile sample size", () => {
    const record = buildRecord({
      pHome: 0.6,
      pDraw: 0.25,
      pAway: 0.15,
      winner: "home",
      homeGoals: 1,
      awayGoals: 0,
      featureNames: ["homeTeam", oneClubFeature],
    });

    const report = computeValidationReport({
      records: [record],
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    const club = report.profiles.find((row) => row.profile === "club_intelligence");
    expect(club?.sampleSize).toBe(1);
    expect(club?.qualified).toBe(false);
    expect(report.limitations).toEqual(
      expect.arrayContaining([expect.stringContaining("unqualified")]),
    );
  });

  it("never claims improvement — no ranking or comparison verdict field exists on the report", () => {
    const report = computeValidationReport({
      records: [],
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    expect(report).not.toHaveProperty("winningProfile");
    expect(report).not.toHaveProperty("bestProfile");
    expect(report).not.toHaveProperty("improvement");
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
        featureNames: ["homeTeam", oneClubFeature, onePlayerFeature],
      }),
    ];

    const first = computeValidationReport({
      records,
      computedAt: "2026-07-24T00:00:00.000Z",
    });
    const second = computeValidationReport({
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
        featureNames: ["homeTeam", oneClubFeature],
      }),
    ];
    const snapshot = JSON.stringify(records);

    computeValidationReport({
      records,
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    expect(JSON.stringify(records)).toBe(snapshot);
  });
});
