import type { Feature, FeatureName } from "@fas/feature";
import {
  createRuleResult,
  type RuleChannel,
  type RuleId,
  type RuleName,
  type RuleResult,
  type RuleStatus,
} from "../domain/rule-result.js";

export type RuleEvaluationErrorCode =
  | "DUPLICATE_FEATURE"
  | "EMPTY_FEATURES"
  | "MIXED_MATCHES";

export class RuleEvaluationError extends Error {
  readonly code: RuleEvaluationErrorCode;

  constructor(code: RuleEvaluationErrorCode, message: string) {
    super(message);
    this.name = "RuleEvaluationError";
    this.code = code;
  }
}

const TAU_ATTACK = 8;
const TAU_MOM = 0.25;
const TAU_HOME = 0.3;

interface PresenceRuleDefinition {
  readonly kind: "presence";
  readonly featureName: FeatureName;
  readonly ruleId: RuleId;
  readonly ruleName: RuleName;
}

interface FootballRuleDefinition {
  readonly kind: "football";
  readonly ruleId: RuleId;
  readonly ruleName: RuleName;
  readonly weight: number;
  readonly channel: RuleChannel;
  readonly requiredFeatures: readonly FeatureName[];
  readonly matched: (features: ReadonlyMap<FeatureName, Feature>) => boolean;
}

type RuleDefinition = FootballRuleDefinition | PresenceRuleDefinition;

const ruleDefinitions: readonly RuleDefinition[] = Object.freeze([
  Object.freeze({
    kind: "presence",
    featureName: "homeTeam",
    ruleId: "rule:home-team-present:v1",
    ruleName: "HOME_TEAM_PRESENT",
  }) satisfies PresenceRuleDefinition,
  Object.freeze({
    kind: "presence",
    featureName: "awayTeam",
    ruleId: "rule:away-team-present:v1",
    ruleName: "AWAY_TEAM_PRESENT",
  }) satisfies PresenceRuleDefinition,
  Object.freeze({
    kind: "presence",
    featureName: "kickoff",
    ruleId: "rule:kickoff-present:v1",
    ruleName: "KICKOFF_PRESENT",
  }) satisfies PresenceRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:home-attack-edge:v1",
    ruleName: "HOME_ATTACK_EDGE",
    weight: 0.7,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "attackRatingHome",
      "defenseRatingAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const attack = numericValue(features.get("attackRatingHome"));
      const defense = numericValue(features.get("defenseRatingAway"));

      return (
        attack !== undefined &&
        defense !== undefined &&
        attack - defense >= TAU_ATTACK
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:away-attack-edge:v1",
    ruleName: "AWAY_ATTACK_EDGE",
    weight: 0.7,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "attackRatingAway",
      "defenseRatingHome",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const attack = numericValue(features.get("attackRatingAway"));
      const defense = numericValue(features.get("defenseRatingHome"));

      return (
        attack !== undefined &&
        defense !== undefined &&
        attack - defense >= TAU_ATTACK
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:momentum-home:v1",
    ruleName: "MOMENTUM_HOME",
    weight: 0.45,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "momentumHome",
      "momentumAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("momentumHome"));
      const away = numericValue(features.get("momentumAway"));

      return home !== undefined && away !== undefined && home - away >= TAU_MOM;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:momentum-away:v1",
    ruleName: "MOMENTUM_AWAY",
    weight: 0.45,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "momentumHome",
      "momentumAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("momentumHome"));
      const away = numericValue(features.get("momentumAway"));

      return home !== undefined && away !== undefined && away - home >= TAU_MOM;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:home-advantage-material:v1",
    ruleName: "HOME_ADVANTAGE_MATERIAL",
    weight: 0.55,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "homeAdvantage",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const homeAdvantage = numericValue(features.get("homeAdvantage"));

      return homeAdvantage !== undefined && homeAdvantage >= TAU_HOME;
    },
  }) satisfies FootballRuleDefinition,
]);

function numericValue(feature: Feature | undefined): number | undefined {
  return typeof feature?.value === "number" && Number.isFinite(feature.value)
    ? feature.value
    : undefined;
}

function latestGeneratedAt(features: readonly Feature[]): string {
  return features.reduce((latest, feature) => {
    const latestTime = Date.parse(latest);
    const featureTime = Date.parse(feature.generatedAt);

    if (
      featureTime > latestTime ||
      (featureTime === latestTime && feature.generatedAt > latest)
    ) {
      return feature.generatedAt;
    }

    return latest;
  }, features[0]?.generatedAt ?? "");
}

function presenceExplanation(ruleName: RuleName, present: boolean): string {
  return present
    ? `${ruleName} passed because its source Feature is present.`
    : `${ruleName} failed because its source Feature is missing.`;
}

function footballExplanation(ruleName: RuleName, status: RuleStatus): string {
  switch (status) {
    case "PASS":
      return `${ruleName} matched under rule.v2.slice1 thresholds.`;
    case "FAIL":
      return `${ruleName} did not match under rule.v2.slice1 thresholds.`;
    case "INAPPLICABLE":
      return `${ruleName} is inapplicable because required Features are missing.`;
  }
}

export class RuleEvaluator {
  evaluate(features: readonly Feature[]): readonly RuleResult[] {
    const firstFeature = features[0];

    if (firstFeature === undefined) {
      throw new RuleEvaluationError(
        "EMPTY_FEATURES",
        "At least one Feature is required for rule evaluation.",
      );
    }

    const featureByName = new Map<FeatureName, Feature>();

    for (const feature of features) {
      if (feature.matchId !== firstFeature.matchId) {
        throw new RuleEvaluationError(
          "MIXED_MATCHES",
          "All Features must reference the same MatchId.",
        );
      }

      if (featureByName.has(feature.name)) {
        throw new RuleEvaluationError(
          "DUPLICATE_FEATURE",
          `Feature name "${feature.name}" appears more than once.`,
        );
      }

      featureByName.set(feature.name, feature);
    }

    const evaluatedAt = latestGeneratedAt(features);
    const results = ruleDefinitions.map((definition) => {
      if (definition.kind === "presence") {
        const sourceFeature = featureByName.get(definition.featureName);
        const present = sourceFeature !== undefined;

        return createRuleResult({
          ruleId: definition.ruleId,
          matchId: firstFeature.matchId,
          ruleName: definition.ruleName,
          status: present ? "PASS" : "FAIL",
          score: present ? 1 : 0,
          weight: 1,
          channel: "none",
          explanation: presenceExplanation(definition.ruleName, present),
          sourceFeatureIds:
            sourceFeature === undefined ? [] : [sourceFeature.featureId],
          evaluatedAt,
        });
      }

      const sourceFeatureIds = definition.requiredFeatures
        .map((name) => featureByName.get(name)?.featureId)
        .filter((id): id is string => id !== undefined);
      const hasAllRequired = definition.requiredFeatures.every((name) =>
        featureByName.has(name),
      );

      if (!hasAllRequired) {
        return createRuleResult({
          ruleId: definition.ruleId,
          matchId: firstFeature.matchId,
          ruleName: definition.ruleName,
          status: "INAPPLICABLE",
          score: 0,
          weight: definition.weight,
          channel: definition.channel,
          explanation: footballExplanation(definition.ruleName, "INAPPLICABLE"),
          sourceFeatureIds,
          evaluatedAt,
        });
      }

      const matched = definition.matched(featureByName);
      const status: RuleStatus = matched ? "PASS" : "FAIL";

      return createRuleResult({
        ruleId: definition.ruleId,
        matchId: firstFeature.matchId,
        ruleName: definition.ruleName,
        status,
        score: matched ? definition.weight : 0,
        weight: definition.weight,
        channel: definition.channel,
        explanation: footballExplanation(definition.ruleName, status),
        sourceFeatureIds,
        evaluatedAt,
      });
    });

    return Object.freeze(results);
  }
}
