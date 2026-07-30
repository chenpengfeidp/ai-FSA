import type { FeatureName } from "@fas/feature";
import type { LambdaFeatureGroupId } from "./lambda-parameter-set.js";

export interface LambdaFeatureGroupDefinition {
  readonly group: LambdaFeatureGroupId;
  readonly homeFeatures: readonly FeatureName[];
  readonly awayFeatures: readonly FeatureName[];
  readonly sharedFeatures: readonly FeatureName[];
}

export const LAMBDA_FEATURE_GROUPS = Object.freeze([
  Object.freeze({
    group: "attack",
    homeFeatures: Object.freeze([
      "goalsScoredRateHome",
      "attackEfficiencyHome",
      "chanceCreationHome",
      "possessionHome",
      "momentumHome",
      "recentFormHome",
      "formAtHomeHome",
      "formOnRoadHome",
      "playerAttackContributionHome",
      "clubAttackStrengthHome",
      "formStrengthHome",
      "goalDifferenceStrengthHome",
    ] satisfies readonly FeatureName[]),
    awayFeatures: Object.freeze([
      "goalsScoredRateAway",
      "attackEfficiencyAway",
      "chanceCreationAway",
      "possessionAway",
      "momentumAway",
      "recentFormAway",
      "formAtHomeAway",
      "formOnRoadAway",
      "playerAttackContributionAway",
      "clubAttackStrengthAway",
      "formStrengthAway",
      "goalDifferenceStrengthAway",
    ] satisfies readonly FeatureName[]),
    sharedFeatures: Object.freeze([] satisfies readonly FeatureName[]),
  }),
  Object.freeze({
    group: "defence",
    homeFeatures: Object.freeze([
      "goalsConcededRateHome",
      "disciplineRiskHome",
      "xgDefenseQualityHome",
      "clubDefensiveStrengthHome",
    ] satisfies readonly FeatureName[]),
    awayFeatures: Object.freeze([
      "goalsConcededRateAway",
      "disciplineRiskAway",
      "xgDefenseQualityAway",
      "clubDefensiveStrengthAway",
    ] satisfies readonly FeatureName[]),
    sharedFeatures: Object.freeze([] satisfies readonly FeatureName[]),
  }),
  Object.freeze({
    group: "xg",
    homeFeatures: Object.freeze([
      "xgAttackQualityHome",
      "finishingEfficiencyHome",
    ] satisfies readonly FeatureName[]),
    awayFeatures: Object.freeze([
      "xgAttackQualityAway",
      "finishingEfficiencyAway",
    ] satisfies readonly FeatureName[]),
    sharedFeatures: Object.freeze([] satisfies readonly FeatureName[]),
  }),
  Object.freeze({
    group: "clubStrength",
    homeFeatures: Object.freeze([
      "clubStrengthHome",
      "pointsPerMatchHome",
    ] satisfies readonly FeatureName[]),
    awayFeatures: Object.freeze([
      "clubStrengthAway",
      "pointsPerMatchAway",
    ] satisfies readonly FeatureName[]),
    sharedFeatures: Object.freeze([] satisfies readonly FeatureName[]),
  }),
  Object.freeze({
    group: "playerAvailability",
    homeFeatures: Object.freeze([
      "availabilityPenaltyHome",
      "playerAvailabilityImpactHome",
      "keyPlayerAvailabilityHome",
      "squadAvailabilityScoreHome",
      "goalkeeperReliabilityHome",
    ] satisfies readonly FeatureName[]),
    awayFeatures: Object.freeze([
      "availabilityPenaltyAway",
      "playerAvailabilityImpactAway",
      "keyPlayerAvailabilityAway",
      "squadAvailabilityScoreAway",
      "goalkeeperReliabilityAway",
    ] satisfies readonly FeatureName[]),
    sharedFeatures: Object.freeze([] satisfies readonly FeatureName[]),
  }),
  Object.freeze({
    group: "matchContext",
    homeFeatures: Object.freeze([
      "fatigueIndexHome",
      "rotationPressureHome",
      "venueAdvantage",
      "homeStability",
    ] satisfies readonly FeatureName[]),
    awayFeatures: Object.freeze([
      "fatigueIndexAway",
      "rotationPressureAway",
    ] satisfies readonly FeatureName[]),
    sharedFeatures: Object.freeze([
      "scheduleAdvantage",
      "knockoutContext",
    ] satisfies readonly FeatureName[]),
  }),
] satisfies readonly LambdaFeatureGroupDefinition[]);
