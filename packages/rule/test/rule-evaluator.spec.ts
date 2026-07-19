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
    expect(football.every((result) => result.status === "INAPPLICABLE")).toBe(true);
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
    ]);

    expect(
      results
        .filter((result) => !result.ruleName.endsWith("_PRESENT"))
        .map(({ ruleName, status, score }) => ({ ruleName, status, score })),
    ).toEqual([
      { ruleName: "HOME_ATTACK_EDGE", status: "PASS", score: 0.7 },
      { ruleName: "AWAY_ATTACK_EDGE", status: "FAIL", score: 0 },
      { ruleName: "MOMENTUM_HOME", status: "PASS", score: 0.45 },
      { ruleName: "MOMENTUM_AWAY", status: "FAIL", score: 0 },
      { ruleName: "HOME_ADVANTAGE_MATERIAL", status: "PASS", score: 0.55 },
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
