import { describe, expect, it } from "vitest";
import { computeContributionReport } from "../src/contribution/compute-contribution-report.js";
import {
  AVAILABILITY_INTELLIGENCE_FEATURE_NAMES,
  MARKET_INTELLIGENCE_FEATURE_NAMES,
  MATCH_CONTEXT_DOMAIN_FEATURE_NAMES,
  VENUE_INTELLIGENCE_FEATURE_NAMES,
  hasDomainFeatures,
} from "../src/contribution/domain-feature-families.js";
import {
  ADVANCED_STATISTICS_FEATURE_NAMES,
  CLUB_INTELLIGENCE_FEATURE_NAMES,
  EXPECTED_GOALS_FEATURE_NAMES,
  PLAYER_INTELLIGENCE_FEATURE_NAMES,
} from "../src/validation/feature-profile.js";
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
  const matchId = `contribution-fixture-${sequence}`;
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
    competitionName: "Contribution Demo League",
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

const oneVenueFeature = [...VENUE_INTELLIGENCE_FEATURE_NAMES][0] as string;
const oneAvailabilityFeature = [
  ...AVAILABILITY_INTELLIGENCE_FEATURE_NAMES,
][0] as string;
const oneAdvancedStatsFeature = [...ADVANCED_STATISTICS_FEATURE_NAMES][0] as string;
const oneXgFeature = [...EXPECTED_GOALS_FEATURE_NAMES][0] as string;
const oneMatchContextFeature = [...MATCH_CONTEXT_DOMAIN_FEATURE_NAMES][0] as string;
const oneClubFeature = [...CLUB_INTELLIGENCE_FEATURE_NAMES][0] as string;
const onePlayerFeature = [...PLAYER_INTELLIGENCE_FEATURE_NAMES][0] as string;
const oneMarketFeature = [...MARKET_INTELLIGENCE_FEATURE_NAMES][0] as string;

describe("hasDomainFeatures", () => {
  it("reports Venue Intelligence presence only from venueAdvantage", () => {
    expect(
      hasDomainFeatures(["homeTeam", "venueAdvantage"], "venue_intelligence"),
    ).toBe(true);
    expect(hasDomainFeatures(["homeTeam", "awayTeam"], "venue_intelligence")).toBe(
      false,
    );
  });

  it("reports Match Context presence for homeStability even though V1A's own profile set omits it", () => {
    expect(hasDomainFeatures(["homeTeam", "homeStability"], "match_context")).toBe(
      true,
    );
  });

  it("is independent per domain — a record can satisfy multiple domains at once", () => {
    const featureNames = [
      "homeTeam",
      oneClubFeature,
      onePlayerFeature,
      oneXgFeature,
    ];
    expect(hasDomainFeatures(featureNames, "club_intelligence")).toBe(true);
    expect(hasDomainFeatures(featureNames, "player_intelligence")).toBe(true);
    expect(hasDomainFeatures(featureNames, "expected_goals")).toBe(true);
    expect(hasDomainFeatures(featureNames, "market_intelligence")).toBe(false);
  });
});

describe("computeContributionReport (O1)", () => {
  it("honestly reports an empty, unqualified report for zero History rows", () => {
    const report = computeContributionReport({
      records: [],
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    expect(report.schemaVersion).toBe("contribution-report.mvp.o1");
    expect(report.totalSampleSize).toBe(0);
    expect(report.domains).toHaveLength(8);
    expect(report.domains.every((row) => row.sampleSize === 0)).toBe(true);
    expect(report.domains.every((row) => row.qualified === false)).toBe(true);
    expect(report.limitations).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Computed only from Evaluation History"),
        expect.stringContaining("never ranks domains"),
      ]),
    );
    expect(Object.isFrozen(report)).toBe(true);
  });

  it("lists all eight domains in the fixed canonical order regardless of population content", () => {
    const report = computeContributionReport({
      records: [],
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    expect(report.domains.map((row) => row.domain)).toEqual([
      "venue_intelligence",
      "availability_intelligence",
      "advanced_statistics",
      "expected_goals",
      "match_context",
      "club_intelligence",
      "player_intelligence",
      "market_intelligence",
    ]);
  });

  it("counts a record toward every domain whose Features it actually carries (non-exclusive, unlike V1A profiles)", () => {
    const record = buildRecord({
      pHome: 0.6,
      pDraw: 0.25,
      pAway: 0.15,
      winner: "home",
      homeGoals: 1,
      awayGoals: 0,
      featureNames: ["homeTeam", oneClubFeature, onePlayerFeature, oneVenueFeature],
    });

    const report = computeContributionReport({
      records: [record],
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    const venue = report.domains.find((row) => row.domain === "venue_intelligence");
    const club = report.domains.find((row) => row.domain === "club_intelligence");
    const player = report.domains.find(
      (row) => row.domain === "player_intelligence",
    );
    const market = report.domains.find(
      (row) => row.domain === "market_intelligence",
    );

    expect(venue?.sampleSize).toBe(1);
    expect(club?.sampleSize).toBe(1);
    expect(player?.sampleSize).toBe(1);
    expect(market?.sampleSize).toBe(0);
  });

  it("computes Winner/Score/Goal-range accuracy and Paper ROI per domain from reused Evaluation metrics", () => {
    const hit = buildRecord({
      pHome: 0.7,
      pDraw: 0.2,
      pAway: 0.1,
      winner: "home",
      homeGoals: 1,
      awayGoals: 0,
      featureNames: ["homeTeam", oneAdvancedStatsFeature],
    });
    const miss = buildRecord({
      pHome: 0.7,
      pDraw: 0.2,
      pAway: 0.1,
      winner: "away",
      homeGoals: 0,
      awayGoals: 1,
      featureNames: ["homeTeam", oneAdvancedStatsFeature],
    });
    const unrelated = buildRecord({
      pHome: 0.5,
      pDraw: 0.3,
      pAway: 0.2,
      winner: "home",
      homeGoals: 1,
      awayGoals: 0,
      featureNames: ["homeTeam", "awayTeam"],
    });

    const report = computeContributionReport({
      records: [hit, miss, unrelated],
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    const advancedStats = report.domains.find(
      (row) => row.domain === "advanced_statistics",
    );

    expect(advancedStats?.sampleSize).toBe(2);
    expect(advancedStats?.winnerAccuracy).toMatchObject({
      value: 0.5,
      sampleSize: 2,
    });
    expect(advancedStats?.paperReturn.sampleSize).toBe(2);
    expect(advancedStats?.paperReturn.value).toBe(0);
    // Population coverage: 2 of 3 total sealed rows carried this domain's Features.
    expect(advancedStats?.coverage.sampleSize).toBe(2);
    expect(advancedStats?.coverage.value).toBeCloseTo(2 / 3, 5);
  });

  it("computes Draw Accuracy against the actual-draw sub-segment sample size, not the domain total", () => {
    const draw = buildRecord({
      pHome: 0.3,
      pDraw: 0.4,
      pAway: 0.3,
      winner: "draw",
      homeGoals: 1,
      awayGoals: 1,
      featureNames: ["homeTeam", oneMatchContextFeature],
    });
    const nonDraw = buildRecord({
      pHome: 0.6,
      pDraw: 0.25,
      pAway: 0.15,
      winner: "home",
      homeGoals: 1,
      awayGoals: 0,
      featureNames: ["homeTeam", oneMatchContextFeature],
    });

    const report = computeContributionReport({
      records: [draw, nonDraw],
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    const matchContext = report.domains.find(
      (row) => row.domain === "match_context",
    );

    expect(matchContext?.sampleSize).toBe(2);
    expect(matchContext?.drawAccuracy.sampleSize).toBe(1);
    expect(matchContext?.drawAccuracy.value).toBe(1);
    expect(matchContext?.drawAccuracy.qualified).toBe(false);
  });

  it("attaches reused A2 ECE/Brier metrics scoped to each domain's own partition", () => {
    const records = Array.from({ length: 3 }, (_, index) =>
      buildRecord({
        pHome: 0.6,
        pDraw: 0.25,
        pAway: 0.15,
        winner: index % 2 === 0 ? "home" : "away",
        homeGoals: index % 2 === 0 ? 1 : 0,
        awayGoals: index % 2 === 0 ? 0 : 1,
        featureNames: ["homeTeam", oneXgFeature],
      }),
    );

    const report = computeContributionReport({
      records,
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    const xg = report.domains.find((row) => row.domain === "expected_goals");
    expect(xg?.sampleSize).toBe(3);
    expect(xg?.expectedCalibrationError.sampleSize).toBe(3);
    expect(xg?.brierScore.sampleSize).toBe(3);
  });

  it("flags unqualified domains below the minimum domain sample size", () => {
    const record = buildRecord({
      pHome: 0.6,
      pDraw: 0.25,
      pAway: 0.15,
      winner: "home",
      homeGoals: 1,
      awayGoals: 0,
      featureNames: ["homeTeam", oneAvailabilityFeature],
    });

    const report = computeContributionReport({
      records: [record],
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    const availability = report.domains.find(
      (row) => row.domain === "availability_intelligence",
    );
    expect(availability?.sampleSize).toBe(1);
    expect(availability?.qualified).toBe(false);
    expect(report.limitations).toEqual(
      expect.arrayContaining([expect.stringContaining("unqualified")]),
    );
  });

  it("counts Market Intelligence contribution from ODDS-derived Features only", () => {
    const record = buildRecord({
      pHome: 0.6,
      pDraw: 0.25,
      pAway: 0.15,
      winner: "home",
      homeGoals: 1,
      awayGoals: 0,
      featureNames: ["homeTeam", oneMarketFeature],
    });

    const report = computeContributionReport({
      records: [record],
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    const market = report.domains.find(
      (row) => row.domain === "market_intelligence",
    );
    expect(market?.sampleSize).toBe(1);
  });

  it("never claims causation or ranking — no rank/best-domain/causation field exists on the report", () => {
    const report = computeContributionReport({
      records: [],
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    expect(report).not.toHaveProperty("bestDomain");
    expect(report).not.toHaveProperty("ranking");
    expect(report).not.toHaveProperty("causation");
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

    const first = computeContributionReport({
      records,
      computedAt: "2026-07-24T00:00:00.000Z",
    });
    const second = computeContributionReport({
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

    computeContributionReport({
      records,
      computedAt: "2026-07-24T00:00:00.000Z",
    });

    expect(JSON.stringify(records)).toBe(snapshot);
  });
});
