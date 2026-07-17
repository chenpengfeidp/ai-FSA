import type { Feature, FeatureName } from "@fas/feature";
import {
  createRuleResult,
  type RuleId,
  type RuleName,
  type RuleResult,
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

interface RuleDefinition {
  readonly featureName: FeatureName;
  readonly ruleId: RuleId;
  readonly ruleName: RuleName;
}

const ruleDefinitions: readonly RuleDefinition[] = Object.freeze([
  Object.freeze({
    featureName: "homeTeam",
    ruleId: "rule:home-team-present:v1",
    ruleName: "HOME_TEAM_PRESENT",
  }),
  Object.freeze({
    featureName: "awayTeam",
    ruleId: "rule:away-team-present:v1",
    ruleName: "AWAY_TEAM_PRESENT",
  }),
  Object.freeze({
    featureName: "kickoff",
    ruleId: "rule:kickoff-present:v1",
    ruleName: "KICKOFF_PRESENT",
  }),
]);

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

function explanation(ruleName: RuleName, present: boolean): string {
  return present
    ? `${ruleName} passed because its source Feature is present.`
    : `${ruleName} failed because its source Feature is missing.`;
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
      const sourceFeature = featureByName.get(definition.featureName);
      const present = sourceFeature !== undefined;

      return createRuleResult({
        ruleId: definition.ruleId,
        matchId: firstFeature.matchId,
        ruleName: definition.ruleName,
        status: present ? "PASS" : "FAIL",
        score: present ? 1 : 0,
        explanation: explanation(definition.ruleName, present),
        sourceFeatureIds:
          sourceFeature === undefined ? [] : [sourceFeature.featureId],
        evaluatedAt,
      });
    });

    return Object.freeze(results);
  }
}
