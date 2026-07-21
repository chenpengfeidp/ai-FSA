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
const TAU_H2H = 0.2;
const H2H_N_MIN = 3;
const TAU_MARKET = 0.08;
const TAU_FORM = 12;
const TAU_FORM_NEAR = 6;
const TAU_DEFENSE_STABLE = 55;
const TAU_DEFENSE_FRAGILE = 45;
const TAU_AVAILABILITY_HIT = 8;
const TAU_VENUE = 1;
const RULE_POLICY = "rule.mvp.a05";

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

/** Honesty / limitation rules that PASS when a Feature is absent. */
interface AbsenceHonestyRuleDefinition {
  readonly kind: "absence_honesty";
  readonly featureName: FeatureName;
  readonly ruleId: RuleId;
  readonly ruleName: RuleName;
}

type RuleDefinition =
  | AbsenceHonestyRuleDefinition
  | FootballRuleDefinition
  | PresenceRuleDefinition;

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
    ruleId: "rule:form-home-superior:v1",
    ruleName: "FORM_HOME_SUPERIOR",
    weight: 0.55,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "recentFormHome",
      "recentFormAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("recentFormHome"));
      const away = numericValue(features.get("recentFormAway"));

      return home !== undefined && away !== undefined && home - away >= TAU_FORM;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:form-away-superior:v1",
    ruleName: "FORM_AWAY_SUPERIOR",
    weight: 0.55,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "recentFormHome",
      "recentFormAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("recentFormHome"));
      const away = numericValue(features.get("recentFormAway"));

      return home !== undefined && away !== undefined && away - home >= TAU_FORM;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:form-near-parity:v1",
    ruleName: "FORM_NEAR_PARITY",
    weight: 0.2,
    channel: "none",
    requiredFeatures: Object.freeze([
      "recentFormHome",
      "recentFormAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("recentFormHome"));
      const away = numericValue(features.get("recentFormAway"));

      return (
        home !== undefined &&
        away !== undefined &&
        Math.abs(home - away) <= TAU_FORM_NEAR
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:defense-home-stable:v1",
    ruleName: "DEFENSE_HOME_STABLE",
    weight: 0.45,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "defenseRatingHome",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const defense = numericValue(features.get("defenseRatingHome"));

      return defense !== undefined && defense >= TAU_DEFENSE_STABLE;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:defense-away-stable:v1",
    ruleName: "DEFENSE_AWAY_STABLE",
    weight: 0.45,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "defenseRatingAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const defense = numericValue(features.get("defenseRatingAway"));

      return defense !== undefined && defense >= TAU_DEFENSE_STABLE;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:defense-home-fragile:v1",
    ruleName: "DEFENSE_HOME_FRAGILE",
    weight: 0.5,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "defenseRatingHome",
      "attackRatingAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const defense = numericValue(features.get("defenseRatingHome"));
      const attack = numericValue(features.get("attackRatingAway"));

      return (
        defense !== undefined &&
        attack !== undefined &&
        defense <= TAU_DEFENSE_FRAGILE &&
        attack - defense >= TAU_ATTACK
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:defense-away-fragile:v1",
    ruleName: "DEFENSE_AWAY_FRAGILE",
    weight: 0.5,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "defenseRatingAway",
      "attackRatingHome",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const defense = numericValue(features.get("defenseRatingAway"));
      const attack = numericValue(features.get("attackRatingHome"));

      return (
        defense !== undefined &&
        attack !== undefined &&
        defense <= TAU_DEFENSE_FRAGILE &&
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
  Object.freeze({
    kind: "football",
    ruleId: "rule:venue-supports-home:v1",
    ruleName: "VENUE_SUPPORTS_HOME",
    weight: 0.3,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "venueAdvantage",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const venue = numericValue(features.get("venueAdvantage"));

      return venue !== undefined && venue >= TAU_VENUE;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "absence_honesty",
    featureName: "venueAdvantage",
    ruleId: "rule:venue-unavailable:v1",
    ruleName: "VENUE_UNAVAILABLE",
  }) satisfies AbsenceHonestyRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:availability-home-hit:v1",
    ruleName: "AVAILABILITY_HOME_HIT",
    weight: 0.5,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "availabilityPenaltyHome",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const penalty = numericValue(features.get("availabilityPenaltyHome"));

      return penalty !== undefined && penalty >= TAU_AVAILABILITY_HIT;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:availability-away-hit:v1",
    ruleName: "AVAILABILITY_AWAY_HIT",
    weight: 0.5,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "availabilityPenaltyAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const penalty = numericValue(features.get("availabilityPenaltyAway"));

      return penalty !== undefined && penalty >= TAU_AVAILABILITY_HIT;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "absence_honesty",
    featureName: "availabilityPenaltyHome",
    ruleId: "rule:availability-home-unknown:v1",
    ruleName: "AVAILABILITY_HOME_UNKNOWN",
  }) satisfies AbsenceHonestyRuleDefinition,
  Object.freeze({
    kind: "absence_honesty",
    featureName: "availabilityPenaltyAway",
    ruleId: "rule:availability-away-unknown:v1",
    ruleName: "AVAILABILITY_AWAY_UNKNOWN",
  }) satisfies AbsenceHonestyRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:signals-aligned-home:v1",
    ruleName: "SIGNALS_ALIGNED_HOME",
    weight: 0.35,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "recentFormHome",
      "recentFormAway",
      "attackRatingHome",
      "attackRatingAway",
      "momentum",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const formHome = numericValue(features.get("recentFormHome"));
      const formAway = numericValue(features.get("recentFormAway"));
      const attackHome = numericValue(features.get("attackRatingHome"));
      const attackAway = numericValue(features.get("attackRatingAway"));
      const momentum = numericValue(features.get("momentum"));

      return (
        formHome !== undefined &&
        formAway !== undefined &&
        attackHome !== undefined &&
        attackAway !== undefined &&
        momentum !== undefined &&
        formHome > formAway &&
        attackHome > attackAway &&
        momentum > 0
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:signals-aligned-away:v1",
    ruleName: "SIGNALS_ALIGNED_AWAY",
    weight: 0.35,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "recentFormHome",
      "recentFormAway",
      "attackRatingHome",
      "attackRatingAway",
      "momentum",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const formHome = numericValue(features.get("recentFormHome"));
      const formAway = numericValue(features.get("recentFormAway"));
      const attackHome = numericValue(features.get("attackRatingHome"));
      const attackAway = numericValue(features.get("attackRatingAway"));
      const momentum = numericValue(features.get("momentum"));

      return (
        formHome !== undefined &&
        formAway !== undefined &&
        attackHome !== undefined &&
        attackAway !== undefined &&
        momentum !== undefined &&
        formAway > formHome &&
        attackAway > attackHome &&
        momentum < 0
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:h2h-supports-home:v1",
    ruleName: "H2H_SUPPORTS_HOME",
    weight: 0.25,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "h2hLean",
      "h2hSampleSize",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const lean = numericValue(features.get("h2hLean"));
      const sample = numericValue(features.get("h2hSampleSize"));

      return (
        lean !== undefined &&
        sample !== undefined &&
        lean >= TAU_H2H &&
        sample >= H2H_N_MIN
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:h2h-supports-away:v1",
    ruleName: "H2H_SUPPORTS_AWAY",
    weight: 0.25,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "h2hLean",
      "h2hSampleSize",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const lean = numericValue(features.get("h2hLean"));
      const sample = numericValue(features.get("h2hSampleSize"));

      return (
        lean !== undefined &&
        sample !== undefined &&
        lean <= -TAU_H2H &&
        sample >= H2H_N_MIN
      );
    },
  }) satisfies FootballRuleDefinition,
  // Market rules use channel "none" — findings only; never enter football softmax.
  Object.freeze({
    kind: "football",
    ruleId: "rule:market-lean-home:v1",
    ruleName: "MARKET_LEAN_HOME",
    weight: 1,
    channel: "none",
    requiredFeatures: Object.freeze([
      "marketLean",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const lean = numericValue(features.get("marketLean"));

      return lean !== undefined && lean >= TAU_MARKET;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:market-lean-away:v1",
    ruleName: "MARKET_LEAN_AWAY",
    weight: 1,
    channel: "none",
    requiredFeatures: Object.freeze([
      "marketLean",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const lean = numericValue(features.get("marketLean"));

      return lean !== undefined && lean <= -TAU_MARKET;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:market-ah-lean-home:v1",
    ruleName: "MARKET_AH_LEAN_HOME",
    weight: 1,
    channel: "none",
    requiredFeatures: Object.freeze([
      "asianHandicapLean",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const lean = numericValue(features.get("asianHandicapLean"));

      return lean !== undefined && lean >= TAU_MARKET;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:market-ah-lean-away:v1",
    ruleName: "MARKET_AH_LEAN_AWAY",
    weight: 1,
    channel: "none",
    requiredFeatures: Object.freeze([
      "asianHandicapLean",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const lean = numericValue(features.get("asianHandicapLean"));

      return lean !== undefined && lean <= -TAU_MARKET;
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
      return `${ruleName} matched under ${RULE_POLICY} thresholds.`;
    case "FAIL":
      return `${ruleName} did not match under ${RULE_POLICY} thresholds.`;
    case "INAPPLICABLE":
      return `${ruleName} is inapplicable because required Features are missing.`;
  }
}

function absenceHonestyExplanation(ruleName: RuleName, absent: boolean): string {
  return absent
    ? `${ruleName} recorded because the Feature is unavailable; do not infer full strength.`
    : `${ruleName} does not apply because the Feature is present.`;
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

      if (definition.kind === "absence_honesty") {
        const sourceFeature = featureByName.get(definition.featureName);
        const absent = sourceFeature === undefined;

        return createRuleResult({
          ruleId: definition.ruleId,
          matchId: firstFeature.matchId,
          ruleName: definition.ruleName,
          status: absent ? "PASS" : "FAIL",
          score: absent ? 1 : 0,
          weight: 1,
          channel: "none",
          explanation: absenceHonestyExplanation(definition.ruleName, absent),
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
