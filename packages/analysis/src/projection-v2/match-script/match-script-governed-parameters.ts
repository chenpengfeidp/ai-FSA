import type { FeatureName } from "@fas/feature";
import type { MatchScriptParameterSet } from "./match-script-parameter-set.js";

export const GOVERNED_MATCH_SCRIPT_PARAMETER_SET = {
  policyVersion: "matchScript.v1",
  temperature: 0.85,
  minScriptWeight: 0.1,
  minActiveScripts: 2,
  catalog: [
    {
      scriptId: "home_control",
      label: "Home Control",
      lambdaModifiers: {
        homeMultiplier: 1.08,
        awayMultiplier: 0.92,
        drawBias: 0,
      },
      activatingRules: [
        "POSSESSION_HOME_EDGE",
        "CHANCE_CREATION_HOME_EDGE",
        "HOME_ATTACK_EDGE",
        "CLUB_STRENGTH_EDGE",
      ],
      strengtheningFeatures: [
        "possessionHome",
        "attackRatingHome",
        "clubStrengthHome",
        "xgAttackQualityHome",
      ] as const satisfies readonly FeatureName[],
      rulePassWeight: 0.35,
      featurePresenceWeight: 0.15,
      baselineAffinity: 0.05,
    },
    {
      scriptId: "away_counter",
      label: "Away Counter",
      lambdaModifiers: {
        homeMultiplier: 0.9,
        awayMultiplier: 1.05,
        drawBias: 0,
      },
      activatingRules: [
        "POSSESSION_HOME_EDGE",
        "XG_ATTACK_AWAY_EDGE",
        "PLAYER_ATTACK_EDGE_AWAY",
        "DEFENSE_HOME_FRAGILE",
      ],
      strengtheningFeatures: [
        "finishingEfficiencyAway",
        "xgAttackQualityAway",
        "attackRatingAway",
        "defenseRatingHome",
      ] as const satisfies readonly FeatureName[],
      rulePassWeight: 0.3,
      featurePresenceWeight: 0.12,
      baselineAffinity: 0.05,
    },
    {
      scriptId: "balanced",
      label: "Balanced",
      lambdaModifiers: {
        homeMultiplier: 1,
        awayMultiplier: 1,
        drawBias: 0,
      },
      activatingRules: [],
      strengtheningFeatures: [] as const satisfies readonly FeatureName[],
      rulePassWeight: 0,
      featurePresenceWeight: 0,
      baselineAffinity: 1,
    },
    {
      scriptId: "low_event",
      label: "Low Event",
      lambdaModifiers: {
        homeMultiplier: 0.85,
        awayMultiplier: 0.85,
        drawBias: 0.06,
      },
      activatingRules: ["DEFENSE_HOME_STABLE", "DEFENSE_AWAY_STABLE"],
      strengtheningFeatures: [
        "defenseRatingHome",
        "defenseRatingAway",
        "chanceCreationHome",
        "chanceCreationAway",
        "xgDominance",
      ] as const satisfies readonly FeatureName[],
      rulePassWeight: 0.25,
      featurePresenceWeight: 0.1,
      baselineAffinity: 0.08,
    },
  ],
} as const satisfies MatchScriptParameterSet;

export type GovernedMatchScriptParameterSet =
  typeof GOVERNED_MATCH_SCRIPT_PARAMETER_SET;
