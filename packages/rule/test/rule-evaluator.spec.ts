import { createFeature, type Feature, type FeatureName } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { describe, expect, it } from "vitest";
import { RuleEvaluationError, RuleEvaluator } from "../src/index.js";

interface FeatureOptions {
  readonly featureId?: string;
  readonly generatedAt?: string;
  readonly matchId?: string;
}

function makeFeature(name: FeatureName, options: FeatureOptions = {}): Feature {
  const values: Partial<Record<FeatureName, string | number>> = {
    awayTeam: "Chelsea",
    homeTeam: "Liverpool",
    kickoff: "2026-08-01T19:30:00Z",
    attackRatingHome: 70,
    attackRatingAway: 45,
    defenseRatingHome: 60,
    defenseRatingAway: 40,
    momentumHome: 0.5,
    momentumAway: -0.2,
    homeAdvantage: 0.35,
    h2hLean: 0.5,
    h2hSampleSize: 5,
    marketLean: 0.2,
    clubStrengthHome: 65,
    clubStrengthAway: 45,
    leagueStrengthHome: 70,
    leagueStrengthAway: 40,
    formStrengthHome: 75,
    formStrengthAway: 45,
    clubAttackStrengthHome: 60,
    clubAttackStrengthAway: 40,
    clubDefensiveStrengthHome: 65,
    clubDefensiveStrengthAway: 45,
    managerStabilityHome: 80,
    managerStabilityAway: 30,
  };

  return createFeature({
    featureId: options.featureId ?? `feature:evidence-1:${name}`,
    matchId: createMatchId(options.matchId ?? "match-1"),
    name,
    value: values[name] ?? 0,
    sourceEvidenceId: "evidence-1",
    generatedAt: options.generatedAt ?? "2026-07-17T10:00:00Z",
  });
}

function allFeatures(): readonly Feature[] {
  return Object.freeze([
    makeFeature("homeTeam"),
    makeFeature("awayTeam"),
    makeFeature("kickoff"),
  ]);
}

describe("RuleEvaluator", () => {
  it("passes all presence rules when their Features exist", () => {
    const results = new RuleEvaluator().evaluate(allFeatures());
    const presence = results.filter((result) =>
      result.ruleName.endsWith("_PRESENT"),
    );
    const football = results.filter(
      (result) => !result.ruleName.endsWith("_PRESENT"),
    );

    expect(presence).toEqual([
      {
        ruleId: "rule:home-team-present:v1",
        matchId: "match-1",
        ruleName: "HOME_TEAM_PRESENT",
        status: "PASS",
        score: 1,
        weight: 1,
        channel: "none",
        explanation:
          "HOME_TEAM_PRESENT passed because its source Feature is present.",
        sourceFeatureIds: ["feature:evidence-1:homeTeam"],
        evaluatedAt: "2026-07-17T10:00:00Z",
      },
      {
        ruleId: "rule:away-team-present:v1",
        matchId: "match-1",
        ruleName: "AWAY_TEAM_PRESENT",
        status: "PASS",
        score: 1,
        weight: 1,
        channel: "none",
        explanation:
          "AWAY_TEAM_PRESENT passed because its source Feature is present.",
        sourceFeatureIds: ["feature:evidence-1:awayTeam"],
        evaluatedAt: "2026-07-17T10:00:00Z",
      },
      {
        ruleId: "rule:kickoff-present:v1",
        matchId: "match-1",
        ruleName: "KICKOFF_PRESENT",
        status: "PASS",
        score: 1,
        weight: 1,
        channel: "none",
        explanation: "KICKOFF_PRESENT passed because its source Feature is present.",
        sourceFeatureIds: ["feature:evidence-1:kickoff"],
        evaluatedAt: "2026-07-17T10:00:00Z",
      },
    ]);
    const channelFootball = football.filter(
      (result) =>
        result.ruleName !== "VENUE_UNAVAILABLE" &&
        result.ruleName !== "AVAILABILITY_HOME_UNKNOWN" &&
        result.ruleName !== "AVAILABILITY_AWAY_UNKNOWN",
    );
    expect(channelFootball.every((result) => result.status === "INAPPLICABLE")).toBe(
      true,
    );
    expect(
      football
        .filter((result) =>
          [
            "VENUE_UNAVAILABLE",
            "AVAILABILITY_HOME_UNKNOWN",
            "AVAILABILITY_AWAY_UNKNOWN",
          ].includes(result.ruleName),
        )
        .every((result) => result.status === "PASS"),
    ).toBe(true);
  });

  it("fails only presence rules whose Features are missing", () => {
    const results = new RuleEvaluator().evaluate([makeFeature("homeTeam")]);

    expect(
      results
        .filter((result) => result.ruleName.endsWith("_PRESENT"))
        .map(({ ruleName, score, status, sourceFeatureIds }) => ({
          ruleName,
          score,
          sourceFeatureIds,
          status,
        })),
    ).toEqual([
      {
        ruleName: "HOME_TEAM_PRESENT",
        score: 1,
        sourceFeatureIds: ["feature:evidence-1:homeTeam"],
        status: "PASS",
      },
      {
        ruleName: "AWAY_TEAM_PRESENT",
        score: 0,
        sourceFeatureIds: [],
        status: "FAIL",
      },
      {
        ruleName: "KICKOFF_PRESENT",
        score: 0,
        sourceFeatureIds: [],
        status: "FAIL",
      },
    ]);
  });

  it("matches football rules from numeric Features", () => {
    const results = new RuleEvaluator().evaluate([
      ...allFeatures(),
      makeFeature("attackRatingHome"),
      makeFeature("attackRatingAway"),
      makeFeature("defenseRatingHome"),
      makeFeature("defenseRatingAway"),
      makeFeature("momentumHome"),
      makeFeature("momentumAway"),
      makeFeature("homeAdvantage"),
      makeFeature("h2hLean"),
      makeFeature("h2hSampleSize"),
      makeFeature("marketLean"),
    ]);

    expect(
      results
        .filter((result) => !result.ruleName.endsWith("_PRESENT"))
        .map(({ ruleName, status, score }) => ({ ruleName, status, score })),
    ).toEqual([
      { ruleName: "HOME_ATTACK_EDGE", status: "PASS", score: 0.7 },
      { ruleName: "AWAY_ATTACK_EDGE", status: "FAIL", score: 0 },
      { ruleName: "FORM_HOME_SUPERIOR", status: "INAPPLICABLE", score: 0 },
      { ruleName: "FORM_AWAY_SUPERIOR", status: "INAPPLICABLE", score: 0 },
      { ruleName: "FORM_NEAR_PARITY", status: "INAPPLICABLE", score: 0 },
      { ruleName: "HOME_VENUE_FORM_EDGE", status: "INAPPLICABLE", score: 0 },
      { ruleName: "AWAY_VENUE_FORM_EDGE", status: "INAPPLICABLE", score: 0 },
      { ruleName: "GOALS_SCORED_HOME_EDGE", status: "INAPPLICABLE", score: 0 },
      { ruleName: "GOALS_SCORED_AWAY_EDGE", status: "INAPPLICABLE", score: 0 },
      {
        ruleName: "ATTACK_EFFICIENCY_HOME_EDGE",
        status: "INAPPLICABLE",
        score: 0,
      },
      {
        ruleName: "ATTACK_EFFICIENCY_AWAY_EDGE",
        status: "INAPPLICABLE",
        score: 0,
      },
      { ruleName: "POSSESSION_HOME_EDGE", status: "INAPPLICABLE", score: 0 },
      { ruleName: "POSSESSION_AWAY_EDGE", status: "INAPPLICABLE", score: 0 },
      {
        ruleName: "CHANCE_CREATION_HOME_EDGE",
        status: "INAPPLICABLE",
        score: 0,
      },
      {
        ruleName: "CHANCE_CREATION_AWAY_EDGE",
        status: "INAPPLICABLE",
        score: 0,
      },
      { ruleName: "XG_ATTACK_HOME_EDGE", status: "INAPPLICABLE", score: 0 },
      { ruleName: "XG_ATTACK_AWAY_EDGE", status: "INAPPLICABLE", score: 0 },
      { ruleName: "XG_DEFENSIVE_EDGE", status: "INAPPLICABLE", score: 0 },
      { ruleName: "XG_DEFENSIVE_AWAY_EDGE", status: "INAPPLICABLE", score: 0 },
      { ruleName: "XG_DOMINANCE", status: "INAPPLICABLE", score: 0 },
      { ruleName: "XG_DOMINANCE_AWAY", status: "INAPPLICABLE", score: 0 },
      { ruleName: "REST_ADVANTAGE_HOME", status: "INAPPLICABLE", score: 0 },
      { ruleName: "REST_ADVANTAGE_AWAY", status: "INAPPLICABLE", score: 0 },
      { ruleName: "FATIGUE_HOME", status: "INAPPLICABLE", score: 0 },
      { ruleName: "FATIGUE_AWAY", status: "INAPPLICABLE", score: 0 },
      { ruleName: "HOME_STABILITY", status: "INAPPLICABLE", score: 0 },
      { ruleName: "ROTATION_PRESSURE", status: "INAPPLICABLE", score: 0 },
      { ruleName: "KNOCKOUT_CONTEXT", status: "INAPPLICABLE", score: 0 },
      { ruleName: "DISCIPLINE_AWAY_RISK", status: "INAPPLICABLE", score: 0 },
      { ruleName: "DISCIPLINE_HOME_RISK", status: "INAPPLICABLE", score: 0 },
      { ruleName: "DEFENSE_HOME_STABLE", status: "PASS", score: 0.45 },
      { ruleName: "DEFENSE_AWAY_STABLE", status: "FAIL", score: 0 },
      { ruleName: "DEFENSE_HOME_FRAGILE", status: "FAIL", score: 0 },
      { ruleName: "DEFENSE_AWAY_FRAGILE", status: "PASS", score: 0.5 },
      { ruleName: "MOMENTUM_HOME", status: "PASS", score: 0.45 },
      { ruleName: "MOMENTUM_AWAY", status: "FAIL", score: 0 },
      { ruleName: "HOME_ADVANTAGE_MATERIAL", status: "PASS", score: 0.55 },
      { ruleName: "VENUE_SUPPORTS_HOME", status: "INAPPLICABLE", score: 0 },
      { ruleName: "VENUE_UNAVAILABLE", status: "PASS", score: 1 },
      { ruleName: "AVAILABILITY_HOME_HIT", status: "INAPPLICABLE", score: 0 },
      { ruleName: "AVAILABILITY_AWAY_HIT", status: "INAPPLICABLE", score: 0 },
      { ruleName: "AVAILABILITY_HOME_UNKNOWN", status: "PASS", score: 1 },
      { ruleName: "AVAILABILITY_AWAY_UNKNOWN", status: "PASS", score: 1 },
      { ruleName: "SIGNALS_ALIGNED_HOME", status: "INAPPLICABLE", score: 0 },
      { ruleName: "SIGNALS_ALIGNED_AWAY", status: "INAPPLICABLE", score: 0 },
      { ruleName: "H2H_SUPPORTS_HOME", status: "PASS", score: 0.25 },
      { ruleName: "H2H_SUPPORTS_AWAY", status: "FAIL", score: 0 },
      { ruleName: "CLUB_STRENGTH_EDGE", status: "INAPPLICABLE", score: 0 },
      { ruleName: "CLUB_STRENGTH_EDGE_AWAY", status: "INAPPLICABLE", score: 0 },
      { ruleName: "LEAGUE_STRENGTH_EDGE", status: "INAPPLICABLE", score: 0 },
      { ruleName: "LEAGUE_STRENGTH_EDGE_AWAY", status: "INAPPLICABLE", score: 0 },
      { ruleName: "FORM_STRENGTH_EDGE", status: "INAPPLICABLE", score: 0 },
      { ruleName: "FORM_STRENGTH_EDGE_AWAY", status: "INAPPLICABLE", score: 0 },
      { ruleName: "ATTACK_STRENGTH_EDGE", status: "INAPPLICABLE", score: 0 },
      { ruleName: "ATTACK_STRENGTH_EDGE_AWAY", status: "INAPPLICABLE", score: 0 },
      { ruleName: "DEFENSE_STRENGTH_EDGE", status: "INAPPLICABLE", score: 0 },
      { ruleName: "DEFENSE_STRENGTH_EDGE_AWAY", status: "INAPPLICABLE", score: 0 },
      { ruleName: "MANAGER_STABILITY", status: "INAPPLICABLE", score: 0 },
      { ruleName: "MANAGER_STABILITY_AWAY", status: "INAPPLICABLE", score: 0 },
      { ruleName: "MARKET_LEAN_HOME", status: "PASS", score: 1 },
      { ruleName: "MARKET_LEAN_AWAY", status: "FAIL", score: 0 },
      { ruleName: "MARKET_AH_LEAN_HOME", status: "INAPPLICABLE", score: 0 },
      { ruleName: "MARKET_AH_LEAN_AWAY", status: "INAPPLICABLE", score: 0 },
      { ruleName: "MARKET_CONSENSUS", status: "INAPPLICABLE", score: 0 },
      { ruleName: "STEAM_MOVE", status: "INAPPLICABLE", score: 0 },
      { ruleName: "REVERSE_LINE_MOVEMENT", status: "INAPPLICABLE", score: 0 },
      { ruleName: "MARKET_VOLATILITY", status: "INAPPLICABLE", score: 0 },
      { ruleName: "SHARP_SUPPORT", status: "INAPPLICABLE", score: 0 },
    ]);
  });

  it("evaluates venue, form, and availability rules for the intelligence MVP", () => {
    const results = new RuleEvaluator().evaluate([
      ...allFeatures(),
      makeFeature("attackRatingHome"),
      makeFeature("attackRatingAway"),
      makeFeature("defenseRatingHome"),
      makeFeature("defenseRatingAway"),
      makeFeature("momentumHome"),
      makeFeature("momentumAway"),
      makeFeature("homeAdvantage"),
      createFeature({
        featureId: "feature:evidence-1:recentFormHome",
        matchId: createMatchId("match-1"),
        name: "recentFormHome",
        value: 80,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:recentFormAway",
        matchId: createMatchId("match-1"),
        name: "recentFormAway",
        value: 40,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:venueAdvantage",
        matchId: createMatchId("match-1"),
        name: "venueAdvantage",
        value: 8,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:availabilityPenaltyHome",
        matchId: createMatchId("match-1"),
        name: "availabilityPenaltyHome",
        value: 16,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:availabilityPenaltyAway",
        matchId: createMatchId("match-1"),
        name: "availabilityPenaltyAway",
        value: 0,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
    ]);

    expect(
      results
        .filter((result) =>
          [
            "FORM_HOME_SUPERIOR",
            "FORM_AWAY_SUPERIOR",
            "VENUE_SUPPORTS_HOME",
            "VENUE_UNAVAILABLE",
            "AVAILABILITY_HOME_HIT",
            "AVAILABILITY_AWAY_HIT",
            "AVAILABILITY_HOME_UNKNOWN",
            "AVAILABILITY_AWAY_UNKNOWN",
          ].includes(result.ruleName),
        )
        .map(({ ruleName, status, channel }) => ({
          ruleName,
          status,
          channel,
        })),
    ).toEqual([
      {
        ruleName: "FORM_HOME_SUPERIOR",
        status: "PASS",
        channel: "home+",
      },
      {
        ruleName: "FORM_AWAY_SUPERIOR",
        status: "FAIL",
        channel: "away+",
      },
      {
        ruleName: "VENUE_SUPPORTS_HOME",
        status: "PASS",
        channel: "home+",
      },
      {
        ruleName: "VENUE_UNAVAILABLE",
        status: "FAIL",
        channel: "none",
      },
      {
        ruleName: "AVAILABILITY_HOME_HIT",
        status: "PASS",
        channel: "away+",
      },
      {
        ruleName: "AVAILABILITY_AWAY_HIT",
        status: "FAIL",
        channel: "home+",
      },
      {
        ruleName: "AVAILABILITY_HOME_UNKNOWN",
        status: "FAIL",
        channel: "none",
      },
      {
        ruleName: "AVAILABILITY_AWAY_UNKNOWN",
        status: "FAIL",
        channel: "none",
      },
    ]);
  });

  it("evaluates form-decomposition venue and goals-scored edges", () => {
    const results = new RuleEvaluator().evaluate([
      ...allFeatures(),
      makeFeature("attackRatingHome"),
      makeFeature("attackRatingAway"),
      makeFeature("defenseRatingHome"),
      makeFeature("defenseRatingAway"),
      makeFeature("momentumHome"),
      makeFeature("momentumAway"),
      makeFeature("homeAdvantage"),
      createFeature({
        featureId: "feature:evidence-1:formAtHomeHome",
        matchId: createMatchId("match-1"),
        name: "formAtHomeHome",
        value: 80,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:formOnRoadAway",
        matchId: createMatchId("match-1"),
        name: "formOnRoadAway",
        value: 40,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:formAtHomeAway",
        matchId: createMatchId("match-1"),
        name: "formAtHomeAway",
        value: 30,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:formOnRoadHome",
        matchId: createMatchId("match-1"),
        name: "formOnRoadHome",
        value: 50,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:goalsScoredRateHome",
        matchId: createMatchId("match-1"),
        name: "goalsScoredRateHome",
        value: 1.8,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:goalsScoredRateAway",
        matchId: createMatchId("match-1"),
        name: "goalsScoredRateAway",
        value: 0.9,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
    ]);

    expect(
      results
        .filter((result) =>
          [
            "HOME_VENUE_FORM_EDGE",
            "AWAY_VENUE_FORM_EDGE",
            "GOALS_SCORED_HOME_EDGE",
            "GOALS_SCORED_AWAY_EDGE",
          ].includes(result.ruleName),
        )
        .map(({ ruleName, status, channel }) => ({
          ruleName,
          status,
          channel,
        })),
    ).toEqual([
      {
        ruleName: "HOME_VENUE_FORM_EDGE",
        status: "PASS",
        channel: "home+",
      },
      {
        ruleName: "AWAY_VENUE_FORM_EDGE",
        status: "FAIL",
        channel: "away+",
      },
      {
        ruleName: "GOALS_SCORED_HOME_EDGE",
        status: "PASS",
        channel: "home+",
      },
      {
        ruleName: "GOALS_SCORED_AWAY_EDGE",
        status: "FAIL",
        channel: "away+",
      },
    ]);
  });

  it("evaluates F1.2b advanced-statistics edges", () => {
    const results = new RuleEvaluator().evaluate([
      ...allFeatures(),
      makeFeature("attackRatingHome"),
      makeFeature("attackRatingAway"),
      makeFeature("defenseRatingHome"),
      makeFeature("defenseRatingAway"),
      makeFeature("momentumHome"),
      makeFeature("momentumAway"),
      makeFeature("homeAdvantage"),
      createFeature({
        featureId: "feature:evidence-1:attackEfficiencyHome",
        matchId: createMatchId("match-1"),
        name: "attackEfficiencyHome",
        value: 70,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:attackEfficiencyAway",
        matchId: createMatchId("match-1"),
        name: "attackEfficiencyAway",
        value: 50,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:possessionHome",
        matchId: createMatchId("match-1"),
        name: "possessionHome",
        value: 58,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:possessionAway",
        matchId: createMatchId("match-1"),
        name: "possessionAway",
        value: 42,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:chanceCreationHome",
        matchId: createMatchId("match-1"),
        name: "chanceCreationHome",
        value: 72,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:chanceCreationAway",
        matchId: createMatchId("match-1"),
        name: "chanceCreationAway",
        value: 55,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:disciplineRiskHome",
        matchId: createMatchId("match-1"),
        name: "disciplineRiskHome",
        value: 20,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:disciplineRiskAway",
        matchId: createMatchId("match-1"),
        name: "disciplineRiskAway",
        value: 40,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:xgAttackQualityHome",
        matchId: createMatchId("match-1"),
        name: "xgAttackQualityHome",
        value: 75,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:xgAttackQualityAway",
        matchId: createMatchId("match-1"),
        name: "xgAttackQualityAway",
        value: 55,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:xgDefenseQualityHome",
        matchId: createMatchId("match-1"),
        name: "xgDefenseQualityHome",
        value: 70,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:xgDefenseQualityAway",
        matchId: createMatchId("match-1"),
        name: "xgDefenseQualityAway",
        value: 50,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:xgDominance",
        matchId: createMatchId("match-1"),
        name: "xgDominance",
        value: 0.35,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
    ]);

    expect(
      results
        .filter((result) =>
          [
            "ATTACK_EFFICIENCY_HOME_EDGE",
            "ATTACK_EFFICIENCY_AWAY_EDGE",
            "POSSESSION_HOME_EDGE",
            "POSSESSION_AWAY_EDGE",
            "CHANCE_CREATION_HOME_EDGE",
            "CHANCE_CREATION_AWAY_EDGE",
            "DISCIPLINE_AWAY_RISK",
            "DISCIPLINE_HOME_RISK",
            "XG_ATTACK_HOME_EDGE",
            "XG_ATTACK_AWAY_EDGE",
            "XG_DEFENSIVE_EDGE",
            "XG_DEFENSIVE_AWAY_EDGE",
            "XG_DOMINANCE",
            "XG_DOMINANCE_AWAY",
          ].includes(result.ruleName),
        )
        .map(({ ruleName, status, channel }) => ({
          ruleName,
          status,
          channel,
        })),
    ).toEqual([
      {
        ruleName: "ATTACK_EFFICIENCY_HOME_EDGE",
        status: "PASS",
        channel: "home+",
      },
      {
        ruleName: "ATTACK_EFFICIENCY_AWAY_EDGE",
        status: "FAIL",
        channel: "away+",
      },
      {
        ruleName: "POSSESSION_HOME_EDGE",
        status: "PASS",
        channel: "home+",
      },
      {
        ruleName: "POSSESSION_AWAY_EDGE",
        status: "FAIL",
        channel: "away+",
      },
      {
        ruleName: "CHANCE_CREATION_HOME_EDGE",
        status: "PASS",
        channel: "home+",
      },
      {
        ruleName: "CHANCE_CREATION_AWAY_EDGE",
        status: "FAIL",
        channel: "away+",
      },
      {
        ruleName: "XG_ATTACK_HOME_EDGE",
        status: "PASS",
        channel: "home+",
      },
      {
        ruleName: "XG_ATTACK_AWAY_EDGE",
        status: "FAIL",
        channel: "away+",
      },
      {
        ruleName: "XG_DEFENSIVE_EDGE",
        status: "PASS",
        channel: "home+",
      },
      {
        ruleName: "XG_DEFENSIVE_AWAY_EDGE",
        status: "FAIL",
        channel: "away+",
      },
      {
        ruleName: "XG_DOMINANCE",
        status: "PASS",
        channel: "home+",
      },
      {
        ruleName: "XG_DOMINANCE_AWAY",
        status: "FAIL",
        channel: "away+",
      },
      {
        ruleName: "DISCIPLINE_AWAY_RISK",
        status: "PASS",
        channel: "home+",
      },
      {
        ruleName: "DISCIPLINE_HOME_RISK",
        status: "FAIL",
        channel: "away+",
      },
    ]);
  });

  it("marks xG Rules INAPPLICABLE when xG Features are absent", () => {
    const results = new RuleEvaluator().evaluate([
      ...allFeatures(),
      makeFeature("attackRatingHome"),
      makeFeature("attackRatingAway"),
      makeFeature("defenseRatingHome"),
      makeFeature("defenseRatingAway"),
      makeFeature("momentumHome"),
      makeFeature("momentumAway"),
      makeFeature("homeAdvantage"),
    ]);

    expect(
      results
        .filter((result) =>
          [
            "XG_ATTACK_HOME_EDGE",
            "XG_ATTACK_AWAY_EDGE",
            "XG_DEFENSIVE_EDGE",
            "XG_DEFENSIVE_AWAY_EDGE",
            "XG_DOMINANCE",
            "XG_DOMINANCE_AWAY",
          ].includes(result.ruleName),
        )
        .every((result) => result.status === "INAPPLICABLE"),
    ).toBe(true);
  });

  it("evaluates Match Context Rules from Context Features", () => {
    const results = new RuleEvaluator().evaluate([
      ...allFeatures(),
      makeFeature("attackRatingHome"),
      makeFeature("attackRatingAway"),
      makeFeature("defenseRatingHome"),
      makeFeature("defenseRatingAway"),
      makeFeature("momentumHome"),
      makeFeature("momentumAway"),
      makeFeature("homeAdvantage"),
      createFeature({
        featureId: "feature:evidence-1:scheduleAdvantage",
        matchId: createMatchId("match-1"),
        name: "scheduleAdvantage",
        value: 3.5,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:fatigueIndexHome",
        matchId: createMatchId("match-1"),
        name: "fatigueIndexHome",
        value: 20,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:fatigueIndexAway",
        matchId: createMatchId("match-1"),
        name: "fatigueIndexAway",
        value: 55,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:homeStability",
        matchId: createMatchId("match-1"),
        name: "homeStability",
        value: 100,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:rotationPressureHome",
        matchId: createMatchId("match-1"),
        name: "rotationPressureHome",
        value: 25,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:rotationPressureAway",
        matchId: createMatchId("match-1"),
        name: "rotationPressureAway",
        value: 50,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:knockoutContext",
        matchId: createMatchId("match-1"),
        name: "knockoutContext",
        value: 0,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
    ]);

    expect(
      results
        .filter((result) =>
          [
            "REST_ADVANTAGE_HOME",
            "REST_ADVANTAGE_AWAY",
            "FATIGUE_HOME",
            "FATIGUE_AWAY",
            "HOME_STABILITY",
            "ROTATION_PRESSURE",
            "KNOCKOUT_CONTEXT",
          ].includes(result.ruleName),
        )
        .map(({ ruleName, status, channel }) => ({
          ruleName,
          status,
          channel,
        })),
    ).toEqual([
      {
        ruleName: "REST_ADVANTAGE_HOME",
        status: "PASS",
        channel: "home+",
      },
      {
        ruleName: "REST_ADVANTAGE_AWAY",
        status: "FAIL",
        channel: "away+",
      },
      {
        ruleName: "FATIGUE_HOME",
        status: "FAIL",
        channel: "away+",
      },
      {
        ruleName: "FATIGUE_AWAY",
        status: "PASS",
        channel: "home+",
      },
      {
        ruleName: "HOME_STABILITY",
        status: "PASS",
        channel: "home+",
      },
      {
        ruleName: "ROTATION_PRESSURE",
        status: "PASS",
        channel: "home+",
      },
      {
        ruleName: "KNOCKOUT_CONTEXT",
        status: "FAIL",
        channel: "none",
      },
    ]);
  });

  it("marks Context Rules INAPPLICABLE when Context Features are absent", () => {
    const results = new RuleEvaluator().evaluate([
      ...allFeatures(),
      makeFeature("attackRatingHome"),
      makeFeature("attackRatingAway"),
      makeFeature("defenseRatingHome"),
      makeFeature("defenseRatingAway"),
      makeFeature("momentumHome"),
      makeFeature("momentumAway"),
      makeFeature("homeAdvantage"),
    ]);

    expect(
      results
        .filter((result) =>
          [
            "REST_ADVANTAGE_HOME",
            "REST_ADVANTAGE_AWAY",
            "FATIGUE_HOME",
            "FATIGUE_AWAY",
            "HOME_STABILITY",
            "ROTATION_PRESSURE",
            "KNOCKOUT_CONTEXT",
          ].includes(result.ruleName),
        )
        .every((result) => result.status === "INAPPLICABLE"),
    ).toBe(true);
  });

  it("evaluates L1B Club Intelligence Rules from Club Features", () => {
    const results = new RuleEvaluator().evaluate([
      ...allFeatures(),
      makeFeature("attackRatingHome"),
      makeFeature("attackRatingAway"),
      makeFeature("defenseRatingHome"),
      makeFeature("defenseRatingAway"),
      makeFeature("momentumHome"),
      makeFeature("momentumAway"),
      makeFeature("homeAdvantage"),
      makeFeature("clubStrengthHome"),
      makeFeature("clubStrengthAway"),
      makeFeature("leagueStrengthHome"),
      makeFeature("leagueStrengthAway"),
      makeFeature("formStrengthHome"),
      makeFeature("formStrengthAway"),
      makeFeature("clubAttackStrengthHome"),
      makeFeature("clubAttackStrengthAway"),
      makeFeature("clubDefensiveStrengthHome"),
      makeFeature("clubDefensiveStrengthAway"),
      makeFeature("managerStabilityHome"),
      makeFeature("managerStabilityAway"),
    ]);

    expect(
      results
        .filter((result) =>
          [
            "CLUB_STRENGTH_EDGE",
            "CLUB_STRENGTH_EDGE_AWAY",
            "LEAGUE_STRENGTH_EDGE",
            "LEAGUE_STRENGTH_EDGE_AWAY",
            "FORM_STRENGTH_EDGE",
            "FORM_STRENGTH_EDGE_AWAY",
            "ATTACK_STRENGTH_EDGE",
            "ATTACK_STRENGTH_EDGE_AWAY",
            "DEFENSE_STRENGTH_EDGE",
            "DEFENSE_STRENGTH_EDGE_AWAY",
            "MANAGER_STABILITY",
            "MANAGER_STABILITY_AWAY",
          ].includes(result.ruleName),
        )
        .map(({ ruleName, status, channel, sourceFeatureIds }) => ({
          ruleName,
          status,
          channel,
          sourceFeatureIds,
        })),
    ).toEqual([
      {
        ruleName: "CLUB_STRENGTH_EDGE",
        status: "PASS",
        channel: "home+",
        sourceFeatureIds: [
          "feature:evidence-1:clubStrengthHome",
          "feature:evidence-1:clubStrengthAway",
        ],
      },
      {
        ruleName: "CLUB_STRENGTH_EDGE_AWAY",
        status: "FAIL",
        channel: "away+",
        sourceFeatureIds: [
          "feature:evidence-1:clubStrengthHome",
          "feature:evidence-1:clubStrengthAway",
        ],
      },
      {
        ruleName: "LEAGUE_STRENGTH_EDGE",
        status: "PASS",
        channel: "home+",
        sourceFeatureIds: [
          "feature:evidence-1:leagueStrengthHome",
          "feature:evidence-1:leagueStrengthAway",
        ],
      },
      {
        ruleName: "LEAGUE_STRENGTH_EDGE_AWAY",
        status: "FAIL",
        channel: "away+",
        sourceFeatureIds: [
          "feature:evidence-1:leagueStrengthHome",
          "feature:evidence-1:leagueStrengthAway",
        ],
      },
      {
        ruleName: "FORM_STRENGTH_EDGE",
        status: "PASS",
        channel: "home+",
        sourceFeatureIds: [
          "feature:evidence-1:formStrengthHome",
          "feature:evidence-1:formStrengthAway",
        ],
      },
      {
        ruleName: "FORM_STRENGTH_EDGE_AWAY",
        status: "FAIL",
        channel: "away+",
        sourceFeatureIds: [
          "feature:evidence-1:formStrengthHome",
          "feature:evidence-1:formStrengthAway",
        ],
      },
      {
        ruleName: "ATTACK_STRENGTH_EDGE",
        status: "PASS",
        channel: "home+",
        sourceFeatureIds: [
          "feature:evidence-1:clubAttackStrengthHome",
          "feature:evidence-1:clubAttackStrengthAway",
        ],
      },
      {
        ruleName: "ATTACK_STRENGTH_EDGE_AWAY",
        status: "FAIL",
        channel: "away+",
        sourceFeatureIds: [
          "feature:evidence-1:clubAttackStrengthHome",
          "feature:evidence-1:clubAttackStrengthAway",
        ],
      },
      {
        ruleName: "DEFENSE_STRENGTH_EDGE",
        status: "PASS",
        channel: "home+",
        sourceFeatureIds: [
          "feature:evidence-1:clubDefensiveStrengthHome",
          "feature:evidence-1:clubDefensiveStrengthAway",
        ],
      },
      {
        ruleName: "DEFENSE_STRENGTH_EDGE_AWAY",
        status: "FAIL",
        channel: "away+",
        sourceFeatureIds: [
          "feature:evidence-1:clubDefensiveStrengthHome",
          "feature:evidence-1:clubDefensiveStrengthAway",
        ],
      },
      {
        ruleName: "MANAGER_STABILITY",
        status: "PASS",
        channel: "home+",
        sourceFeatureIds: [
          "feature:evidence-1:managerStabilityHome",
          "feature:evidence-1:managerStabilityAway",
        ],
      },
      {
        ruleName: "MANAGER_STABILITY_AWAY",
        status: "FAIL",
        channel: "away+",
        sourceFeatureIds: [
          "feature:evidence-1:managerStabilityHome",
          "feature:evidence-1:managerStabilityAway",
        ],
      },
    ]);
  });

  it("marks Club Intelligence Rules INAPPLICABLE when Club Features are absent", () => {
    const results = new RuleEvaluator().evaluate([
      ...allFeatures(),
      makeFeature("attackRatingHome"),
      makeFeature("attackRatingAway"),
      makeFeature("defenseRatingHome"),
      makeFeature("defenseRatingAway"),
      makeFeature("momentumHome"),
      makeFeature("momentumAway"),
      makeFeature("homeAdvantage"),
    ]);

    expect(
      results
        .filter((result) =>
          [
            "CLUB_STRENGTH_EDGE",
            "CLUB_STRENGTH_EDGE_AWAY",
            "LEAGUE_STRENGTH_EDGE",
            "LEAGUE_STRENGTH_EDGE_AWAY",
            "FORM_STRENGTH_EDGE",
            "FORM_STRENGTH_EDGE_AWAY",
            "ATTACK_STRENGTH_EDGE",
            "ATTACK_STRENGTH_EDGE_AWAY",
            "DEFENSE_STRENGTH_EDGE",
            "DEFENSE_STRENGTH_EDGE_AWAY",
            "MANAGER_STABILITY",
            "MANAGER_STABILITY_AWAY",
          ].includes(result.ruleName),
        )
        .every((result) => result.status === "INAPPLICABLE" && result.score === 0),
    ).toBe(true);
  });

  it("evaluates Market Intelligence Rules as findings-only channel none", () => {
    const results = new RuleEvaluator().evaluate([
      ...allFeatures(),
      makeFeature("attackRatingHome"),
      makeFeature("attackRatingAway"),
      makeFeature("defenseRatingHome"),
      makeFeature("defenseRatingAway"),
      makeFeature("momentumHome"),
      makeFeature("momentumAway"),
      makeFeature("homeAdvantage"),
      makeFeature("marketLean"),
      createFeature({
        featureId: "feature:evidence-1:marketConsensus",
        matchId: createMatchId("match-1"),
        name: "marketConsensus",
        value: 0.2,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:steamMove",
        matchId: createMatchId("match-1"),
        name: "steamMove",
        value: 0.4,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:reverseLineMovement",
        matchId: createMatchId("match-1"),
        name: "reverseLineMovement",
        value: -0.3,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:marketVolatility",
        matchId: createMatchId("match-1"),
        name: "marketVolatility",
        value: 40,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
      createFeature({
        featureId: "feature:evidence-1:sharpSupport",
        matchId: createMatchId("match-1"),
        name: "sharpSupport",
        value: 0.6,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
    ]);

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleName: "MARKET_CONSENSUS",
          status: "PASS",
          channel: "none",
        }),
        expect.objectContaining({
          ruleName: "STEAM_MOVE",
          status: "PASS",
          channel: "none",
        }),
        expect.objectContaining({
          ruleName: "REVERSE_LINE_MOVEMENT",
          status: "PASS",
          channel: "none",
        }),
        expect.objectContaining({
          ruleName: "MARKET_VOLATILITY",
          status: "PASS",
          channel: "none",
        }),
        expect.objectContaining({
          ruleName: "SHARP_SUPPORT",
          status: "PASS",
          channel: "none",
        }),
      ]),
    );
  });

  it("marks Market Intelligence Rules INAPPLICABLE when Features are absent", () => {
    const results = new RuleEvaluator().evaluate([
      ...allFeatures(),
      makeFeature("attackRatingHome"),
      makeFeature("attackRatingAway"),
      makeFeature("defenseRatingHome"),
      makeFeature("defenseRatingAway"),
      makeFeature("momentumHome"),
      makeFeature("momentumAway"),
      makeFeature("homeAdvantage"),
    ]);

    expect(
      results
        .filter((result) =>
          [
            "MARKET_CONSENSUS",
            "STEAM_MOVE",
            "REVERSE_LINE_MOVEMENT",
            "MARKET_VOLATILITY",
            "SHARP_SUPPORT",
          ].includes(result.ruleName),
        )
        .every((result) => result.status === "INAPPLICABLE"),
    ).toBe(true);
  });

  it("evaluates Asian handicap market rules when AH lean is present", () => {
    const results = new RuleEvaluator().evaluate([
      ...allFeatures(),
      makeFeature("attackRatingHome"),
      makeFeature("attackRatingAway"),
      makeFeature("defenseRatingHome"),
      makeFeature("defenseRatingAway"),
      makeFeature("momentumHome"),
      makeFeature("momentumAway"),
      makeFeature("homeAdvantage"),
      makeFeature("marketLean"),
      createFeature({
        featureId: "feature:evidence-1:asianHandicapLean",
        matchId: createMatchId("match-1"),
        name: "asianHandicapLean",
        value: 0.12,
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      }),
    ]);

    expect(
      results
        .filter(
          (result) =>
            result.ruleName === "MARKET_AH_LEAN_HOME" ||
            result.ruleName === "MARKET_AH_LEAN_AWAY",
        )
        .map(({ ruleName, status, channel }) => ({
          ruleName,
          status,
          channel,
        })),
    ).toEqual([
      {
        ruleName: "MARKET_AH_LEAN_HOME",
        status: "PASS",
        channel: "none",
      },
      {
        ruleName: "MARKET_AH_LEAN_AWAY",
        status: "FAIL",
        channel: "none",
      },
    ]);
  });

  it("marks H2H rules inapplicable without H2H Features", () => {
    const results = new RuleEvaluator().evaluate([
      ...allFeatures(),
      makeFeature("attackRatingHome"),
      makeFeature("attackRatingAway"),
      makeFeature("defenseRatingHome"),
      makeFeature("defenseRatingAway"),
      makeFeature("momentumHome"),
      makeFeature("momentumAway"),
      makeFeature("homeAdvantage"),
    ]);

    expect(
      results
        .filter(
          (result) =>
            result.ruleName === "H2H_SUPPORTS_HOME" ||
            result.ruleName === "H2H_SUPPORTS_AWAY",
        )
        .map(({ ruleName, status }) => ({ ruleName, status })),
    ).toEqual([
      { ruleName: "H2H_SUPPORTS_HOME", status: "INAPPLICABLE" },
      { ruleName: "H2H_SUPPORTS_AWAY", status: "INAPPLICABLE" },
    ]);
  });

  it("is deterministic and independent of Feature ordering", () => {
    const features = [
      makeFeature("homeTeam", { generatedAt: "2026-07-17T09:00:00Z" }),
      makeFeature("awayTeam", { generatedAt: "2026-07-17T11:00:00Z" }),
      makeFeature("kickoff", { generatedAt: "2026-07-17T10:00:00Z" }),
    ] as const;
    const evaluator = new RuleEvaluator();

    const first = evaluator.evaluate(features);
    const second = evaluator.evaluate([features[2], features[0], features[1]]);

    expect(second).toEqual(first);
    expect(
      first.every(({ evaluatedAt }) => evaluatedAt === "2026-07-17T11:00:00Z"),
    ).toBe(true);
  });

  it("never modifies source Features", () => {
    const features = allFeatures();
    const snapshot = JSON.stringify(features);

    new RuleEvaluator().evaluate(features);

    expect(JSON.stringify(features)).toBe(snapshot);
  });

  it("rejects an empty Feature collection", () => {
    expect(() => new RuleEvaluator().evaluate([])).toThrow(RuleEvaluationError);

    try {
      new RuleEvaluator().evaluate([]);
    } catch (error: unknown) {
      expect(error).toMatchObject({ code: "EMPTY_FEATURES" });
    }
  });

  it("rejects Features from different matches", () => {
    const features = [
      makeFeature("homeTeam"),
      makeFeature("awayTeam", { matchId: "match-2" }),
    ];

    expect(() => new RuleEvaluator().evaluate(features)).toThrow(
      RuleEvaluationError,
    );

    try {
      new RuleEvaluator().evaluate(features);
    } catch (error: unknown) {
      expect(error).toMatchObject({ code: "MIXED_MATCHES" });
    }
  });

  it("rejects duplicate Feature names", () => {
    const features = [
      makeFeature("homeTeam"),
      makeFeature("homeTeam", { featureId: "feature:evidence-2:homeTeam" }),
    ];

    expect(() => new RuleEvaluator().evaluate(features)).toThrow(
      RuleEvaluationError,
    );

    try {
      new RuleEvaluator().evaluate(features);
    } catch (error: unknown) {
      expect(error).toMatchObject({ code: "DUPLICATE_FEATURE" });
    }
  });

  it("returns immutable RuleResults and provenance arrays", () => {
    const results = new RuleEvaluator().evaluate(allFeatures());

    expect(Object.isFrozen(results)).toBe(true);
    expect(results.every(Object.isFrozen)).toBe(true);
    expect(
      results.every(({ sourceFeatureIds }) => Object.isFrozen(sourceFeatureIds)),
    ).toBe(true);
  });
});
