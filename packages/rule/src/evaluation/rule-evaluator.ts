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
const TAU_FORM_VENUE = 12;
const TAU_GOALS_RATE = 0.35;
const TAU_ATTACK_EFFICIENCY = 8;
const TAU_POSSESSION = 8;
const TAU_CHANCE_CREATION = 8;
const TAU_DISCIPLINE_RISK = 8;
const TAU_XG_ATTACK = 8;
const TAU_XG_DEFENSE = 8;
const TAU_XG_DOMINANCE = 0.2;
const TAU_REST_ADVANTAGE = 2;
const TAU_FATIGUE = 50;
const TAU_HOME_STABILITY = 70;
const TAU_ROTATION_PRESSURE = 20;
const TAU_KNOCKOUT_CONTEXT = 50;
const TAU_MARKET_CONSENSUS = 0.08;
const TAU_STEAM_MOVE = 0.15;
const TAU_REVERSE_LINE_MOVEMENT = 0.1;
const TAU_MARKET_VOLATILITY = 25;
const TAU_SHARP_SUPPORT = 0.5;
const TAU_DEFENSE_STABLE = 55;
const TAU_DEFENSE_FRAGILE = 45;
const TAU_AVAILABILITY_HIT = 8;
const TAU_VENUE = 1;
const TAU_CLUB_STRENGTH = 10;
const TAU_LEAGUE_STRENGTH = 15;
const TAU_CLUB_FORM_STRENGTH = 15;
const TAU_CLUB_ATTACK_STRENGTH = 10;
const TAU_CLUB_DEFENSE_STRENGTH = 10;
const TAU_MANAGER_STABILITY = 20;
const RULE_POLICY = "rule.mvp.l1b.club";

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
    ruleId: "rule:home-venue-form-edge:v1",
    ruleName: "HOME_VENUE_FORM_EDGE",
    weight: 0.5,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "formAtHomeHome",
      "formOnRoadAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const homeAtHome = numericValue(features.get("formAtHomeHome"));
      const awayOnRoad = numericValue(features.get("formOnRoadAway"));

      return (
        homeAtHome !== undefined &&
        awayOnRoad !== undefined &&
        homeAtHome - awayOnRoad >= TAU_FORM_VENUE
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:away-venue-form-edge:v1",
    ruleName: "AWAY_VENUE_FORM_EDGE",
    weight: 0.5,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "formAtHomeAway",
      "formOnRoadHome",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const awayAtHome = numericValue(features.get("formAtHomeAway"));
      const homeOnRoad = numericValue(features.get("formOnRoadHome"));

      return (
        awayAtHome !== undefined &&
        homeOnRoad !== undefined &&
        awayAtHome - homeOnRoad >= TAU_FORM_VENUE
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:goals-scored-home-edge:v1",
    ruleName: "GOALS_SCORED_HOME_EDGE",
    weight: 0.4,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "goalsScoredRateHome",
      "goalsScoredRateAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("goalsScoredRateHome"));
      const away = numericValue(features.get("goalsScoredRateAway"));

      return (
        home !== undefined && away !== undefined && home - away >= TAU_GOALS_RATE
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:goals-scored-away-edge:v1",
    ruleName: "GOALS_SCORED_AWAY_EDGE",
    weight: 0.4,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "goalsScoredRateHome",
      "goalsScoredRateAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("goalsScoredRateHome"));
      const away = numericValue(features.get("goalsScoredRateAway"));

      return (
        home !== undefined && away !== undefined && away - home >= TAU_GOALS_RATE
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:attack-efficiency-home-edge:v1",
    ruleName: "ATTACK_EFFICIENCY_HOME_EDGE",
    weight: 0.45,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "attackEfficiencyHome",
      "attackEfficiencyAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("attackEfficiencyHome"));
      const away = numericValue(features.get("attackEfficiencyAway"));

      return (
        home !== undefined &&
        away !== undefined &&
        home - away >= TAU_ATTACK_EFFICIENCY
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:attack-efficiency-away-edge:v1",
    ruleName: "ATTACK_EFFICIENCY_AWAY_EDGE",
    weight: 0.45,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "attackEfficiencyHome",
      "attackEfficiencyAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("attackEfficiencyHome"));
      const away = numericValue(features.get("attackEfficiencyAway"));

      return (
        home !== undefined &&
        away !== undefined &&
        away - home >= TAU_ATTACK_EFFICIENCY
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:possession-home-edge:v1",
    ruleName: "POSSESSION_HOME_EDGE",
    weight: 0.35,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "possessionHome",
      "possessionAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("possessionHome"));
      const away = numericValue(features.get("possessionAway"));

      return (
        home !== undefined && away !== undefined && home - away >= TAU_POSSESSION
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:possession-away-edge:v1",
    ruleName: "POSSESSION_AWAY_EDGE",
    weight: 0.35,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "possessionHome",
      "possessionAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("possessionHome"));
      const away = numericValue(features.get("possessionAway"));

      return (
        home !== undefined && away !== undefined && away - home >= TAU_POSSESSION
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:chance-creation-home-edge:v1",
    ruleName: "CHANCE_CREATION_HOME_EDGE",
    weight: 0.45,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "chanceCreationHome",
      "chanceCreationAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("chanceCreationHome"));
      const away = numericValue(features.get("chanceCreationAway"));

      return (
        home !== undefined &&
        away !== undefined &&
        home - away >= TAU_CHANCE_CREATION
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:chance-creation-away-edge:v1",
    ruleName: "CHANCE_CREATION_AWAY_EDGE",
    weight: 0.45,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "chanceCreationHome",
      "chanceCreationAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("chanceCreationHome"));
      const away = numericValue(features.get("chanceCreationAway"));

      return (
        home !== undefined &&
        away !== undefined &&
        away - home >= TAU_CHANCE_CREATION
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:xg-attack-home-edge:v1",
    ruleName: "XG_ATTACK_HOME_EDGE",
    weight: 0.55,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "xgAttackQualityHome",
      "xgAttackQualityAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("xgAttackQualityHome"));
      const away = numericValue(features.get("xgAttackQualityAway"));

      return (
        home !== undefined && away !== undefined && home - away >= TAU_XG_ATTACK
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:xg-attack-away-edge:v1",
    ruleName: "XG_ATTACK_AWAY_EDGE",
    weight: 0.55,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "xgAttackQualityHome",
      "xgAttackQualityAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("xgAttackQualityHome"));
      const away = numericValue(features.get("xgAttackQualityAway"));

      return (
        home !== undefined && away !== undefined && away - home >= TAU_XG_ATTACK
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:xg-defensive-edge:v1",
    ruleName: "XG_DEFENSIVE_EDGE",
    weight: 0.5,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "xgDefenseQualityHome",
      "xgDefenseQualityAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("xgDefenseQualityHome"));
      const away = numericValue(features.get("xgDefenseQualityAway"));

      return (
        home !== undefined && away !== undefined && home - away >= TAU_XG_DEFENSE
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:xg-defensive-away-edge:v1",
    ruleName: "XG_DEFENSIVE_AWAY_EDGE",
    weight: 0.5,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "xgDefenseQualityHome",
      "xgDefenseQualityAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("xgDefenseQualityHome"));
      const away = numericValue(features.get("xgDefenseQualityAway"));

      return (
        home !== undefined && away !== undefined && away - home >= TAU_XG_DEFENSE
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:xg-dominance:v1",
    ruleName: "XG_DOMINANCE",
    weight: 0.5,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "xgDominance",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const dominance = numericValue(features.get("xgDominance"));

      return dominance !== undefined && dominance >= TAU_XG_DOMINANCE;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:xg-dominance-away:v1",
    ruleName: "XG_DOMINANCE_AWAY",
    weight: 0.5,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "xgDominance",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const dominance = numericValue(features.get("xgDominance"));

      return dominance !== undefined && dominance <= -TAU_XG_DOMINANCE;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:rest-advantage-home:v1",
    ruleName: "REST_ADVANTAGE_HOME",
    weight: 0.45,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "scheduleAdvantage",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const advantage = numericValue(features.get("scheduleAdvantage"));

      return advantage !== undefined && advantage >= TAU_REST_ADVANTAGE;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:rest-advantage-away:v1",
    ruleName: "REST_ADVANTAGE_AWAY",
    weight: 0.45,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "scheduleAdvantage",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const advantage = numericValue(features.get("scheduleAdvantage"));

      return advantage !== undefined && advantage <= -TAU_REST_ADVANTAGE;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:fatigue-home:v1",
    ruleName: "FATIGUE_HOME",
    weight: 0.4,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "fatigueIndexHome",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const fatigue = numericValue(features.get("fatigueIndexHome"));

      return fatigue !== undefined && fatigue >= TAU_FATIGUE;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:fatigue-away:v1",
    ruleName: "FATIGUE_AWAY",
    weight: 0.4,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "fatigueIndexAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const fatigue = numericValue(features.get("fatigueIndexAway"));

      return fatigue !== undefined && fatigue >= TAU_FATIGUE;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:home-stability:v1",
    ruleName: "HOME_STABILITY",
    weight: 0.35,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "homeStability",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const stability = numericValue(features.get("homeStability"));

      return stability !== undefined && stability >= TAU_HOME_STABILITY;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:rotation-pressure:v1",
    ruleName: "ROTATION_PRESSURE",
    weight: 0.35,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "rotationPressureHome",
      "rotationPressureAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("rotationPressureHome"));
      const away = numericValue(features.get("rotationPressureAway"));

      return (
        home !== undefined &&
        away !== undefined &&
        away - home >= TAU_ROTATION_PRESSURE
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:knockout-context:v1",
    ruleName: "KNOCKOUT_CONTEXT",
    weight: 0.25,
    channel: "none",
    requiredFeatures: Object.freeze([
      "knockoutContext",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const knockout = numericValue(features.get("knockoutContext"));

      return knockout !== undefined && knockout >= TAU_KNOCKOUT_CONTEXT;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:discipline-away-risk:v1",
    ruleName: "DISCIPLINE_AWAY_RISK",
    weight: 0.3,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "disciplineRiskHome",
      "disciplineRiskAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("disciplineRiskHome"));
      const away = numericValue(features.get("disciplineRiskAway"));

      return (
        home !== undefined &&
        away !== undefined &&
        away - home >= TAU_DISCIPLINE_RISK
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:discipline-home-risk:v1",
    ruleName: "DISCIPLINE_HOME_RISK",
    weight: 0.3,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "disciplineRiskHome",
      "disciplineRiskAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("disciplineRiskHome"));
      const away = numericValue(features.get("disciplineRiskAway"));

      return (
        home !== undefined &&
        away !== undefined &&
        home - away >= TAU_DISCIPLINE_RISK
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
  // L1B Club Intelligence — comparative edges consume CLUB_INTELLIGENCE-derived
  // Features only; participate in the existing football channel like other edges.
  Object.freeze({
    kind: "football",
    ruleId: "rule:club-strength-edge:v1",
    ruleName: "CLUB_STRENGTH_EDGE",
    weight: 0.6,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "clubStrengthHome",
      "clubStrengthAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("clubStrengthHome"));
      const away = numericValue(features.get("clubStrengthAway"));

      return (
        home !== undefined && away !== undefined && home - away >= TAU_CLUB_STRENGTH
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:club-strength-edge-away:v1",
    ruleName: "CLUB_STRENGTH_EDGE_AWAY",
    weight: 0.6,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "clubStrengthHome",
      "clubStrengthAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("clubStrengthHome"));
      const away = numericValue(features.get("clubStrengthAway"));

      return (
        home !== undefined && away !== undefined && away - home >= TAU_CLUB_STRENGTH
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:league-strength-edge:v1",
    ruleName: "LEAGUE_STRENGTH_EDGE",
    weight: 0.45,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "leagueStrengthHome",
      "leagueStrengthAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("leagueStrengthHome"));
      const away = numericValue(features.get("leagueStrengthAway"));

      return (
        home !== undefined &&
        away !== undefined &&
        home - away >= TAU_LEAGUE_STRENGTH
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:league-strength-edge-away:v1",
    ruleName: "LEAGUE_STRENGTH_EDGE_AWAY",
    weight: 0.45,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "leagueStrengthHome",
      "leagueStrengthAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("leagueStrengthHome"));
      const away = numericValue(features.get("leagueStrengthAway"));

      return (
        home !== undefined &&
        away !== undefined &&
        away - home >= TAU_LEAGUE_STRENGTH
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:form-strength-edge:v1",
    ruleName: "FORM_STRENGTH_EDGE",
    weight: 0.45,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "formStrengthHome",
      "formStrengthAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("formStrengthHome"));
      const away = numericValue(features.get("formStrengthAway"));

      return (
        home !== undefined &&
        away !== undefined &&
        home - away >= TAU_CLUB_FORM_STRENGTH
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:form-strength-edge-away:v1",
    ruleName: "FORM_STRENGTH_EDGE_AWAY",
    weight: 0.45,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "formStrengthHome",
      "formStrengthAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("formStrengthHome"));
      const away = numericValue(features.get("formStrengthAway"));

      return (
        home !== undefined &&
        away !== undefined &&
        away - home >= TAU_CLUB_FORM_STRENGTH
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:attack-strength-edge:v1",
    ruleName: "ATTACK_STRENGTH_EDGE",
    weight: 0.5,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "clubAttackStrengthHome",
      "clubAttackStrengthAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("clubAttackStrengthHome"));
      const away = numericValue(features.get("clubAttackStrengthAway"));

      return (
        home !== undefined &&
        away !== undefined &&
        home - away >= TAU_CLUB_ATTACK_STRENGTH
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:attack-strength-edge-away:v1",
    ruleName: "ATTACK_STRENGTH_EDGE_AWAY",
    weight: 0.5,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "clubAttackStrengthHome",
      "clubAttackStrengthAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("clubAttackStrengthHome"));
      const away = numericValue(features.get("clubAttackStrengthAway"));

      return (
        home !== undefined &&
        away !== undefined &&
        away - home >= TAU_CLUB_ATTACK_STRENGTH
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:defense-strength-edge:v1",
    ruleName: "DEFENSE_STRENGTH_EDGE",
    weight: 0.5,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "clubDefensiveStrengthHome",
      "clubDefensiveStrengthAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("clubDefensiveStrengthHome"));
      const away = numericValue(features.get("clubDefensiveStrengthAway"));

      return (
        home !== undefined &&
        away !== undefined &&
        home - away >= TAU_CLUB_DEFENSE_STRENGTH
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:defense-strength-edge-away:v1",
    ruleName: "DEFENSE_STRENGTH_EDGE_AWAY",
    weight: 0.5,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "clubDefensiveStrengthHome",
      "clubDefensiveStrengthAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("clubDefensiveStrengthHome"));
      const away = numericValue(features.get("clubDefensiveStrengthAway"));

      return (
        home !== undefined &&
        away !== undefined &&
        away - home >= TAU_CLUB_DEFENSE_STRENGTH
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:manager-stability:v1",
    ruleName: "MANAGER_STABILITY",
    weight: 0.3,
    channel: "home+",
    requiredFeatures: Object.freeze([
      "managerStabilityHome",
      "managerStabilityAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("managerStabilityHome"));
      const away = numericValue(features.get("managerStabilityAway"));

      return (
        home !== undefined &&
        away !== undefined &&
        home - away >= TAU_MANAGER_STABILITY
      );
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:manager-stability-away:v1",
    ruleName: "MANAGER_STABILITY_AWAY",
    weight: 0.3,
    channel: "away+",
    requiredFeatures: Object.freeze([
      "managerStabilityHome",
      "managerStabilityAway",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const home = numericValue(features.get("managerStabilityHome"));
      const away = numericValue(features.get("managerStabilityAway"));

      return (
        home !== undefined &&
        away !== undefined &&
        away - home >= TAU_MANAGER_STABILITY
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
  // I2B Market Intelligence — findings only; never enter football softmax.
  Object.freeze({
    kind: "football",
    ruleId: "rule:market-consensus:v1",
    ruleName: "MARKET_CONSENSUS",
    weight: 1,
    channel: "none",
    requiredFeatures: Object.freeze([
      "marketConsensus",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const consensus = numericValue(features.get("marketConsensus"));

      return consensus !== undefined && Math.abs(consensus) >= TAU_MARKET_CONSENSUS;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:steam-move:v1",
    ruleName: "STEAM_MOVE",
    weight: 1,
    channel: "none",
    requiredFeatures: Object.freeze([
      "steamMove",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const steam = numericValue(features.get("steamMove"));

      return steam !== undefined && Math.abs(steam) >= TAU_STEAM_MOVE;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:reverse-line-movement:v1",
    ruleName: "REVERSE_LINE_MOVEMENT",
    weight: 1,
    channel: "none",
    requiredFeatures: Object.freeze([
      "reverseLineMovement",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const rlm = numericValue(features.get("reverseLineMovement"));

      return rlm !== undefined && Math.abs(rlm) >= TAU_REVERSE_LINE_MOVEMENT;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:market-volatility:v1",
    ruleName: "MARKET_VOLATILITY",
    weight: 1,
    channel: "none",
    requiredFeatures: Object.freeze([
      "marketVolatility",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const volatility = numericValue(features.get("marketVolatility"));

      return volatility !== undefined && volatility >= TAU_MARKET_VOLATILITY;
    },
  }) satisfies FootballRuleDefinition,
  Object.freeze({
    kind: "football",
    ruleId: "rule:sharp-support:v1",
    ruleName: "SHARP_SUPPORT",
    weight: 1,
    channel: "none",
    requiredFeatures: Object.freeze([
      "sharpSupport",
    ] as const satisfies readonly FeatureName[]),
    matched: (features: ReadonlyMap<FeatureName, Feature>): boolean => {
      const sharp = numericValue(features.get("sharpSupport"));

      return sharp !== undefined && Math.abs(sharp) >= TAU_SHARP_SUPPORT;
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
