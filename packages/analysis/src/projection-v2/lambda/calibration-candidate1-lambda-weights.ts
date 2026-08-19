import type { FeatureName } from "@fas/feature";
import { FEATURE_ENRICHED_LAMBDA_FEATURE_WEIGHTS } from "./feature-enriched-lambda-weights.js";
import type {
  LambdaFeatureGroupId,
  LambdaFeatureScale,
  LambdaFeatureWeightEntry,
  LambdaParameterSet,
} from "./lambda-parameter-set.js";

/**
 * P2K-CAL-2 governed projection normalization policy.
 *
 * Features observed on Expansion V2 sidecars are predominantly on a ~[0,100]
 * scale. Production uses `unitCentered` (designed for [0,1]), which saturates
 * attack group factors at the 2.5 clamp. Candidate 1 reinterprets those Features
 * with `percentCentered` without mutating stored Feature values.
 */
export const CALIBRATION_CANDIDATE1_PROJECTION_NORMALIZATION_POLICY =
  "projectionNormalization.v1.calibrationCandidate1" as const;

const PERCENT_CENTERED_FEATURE_NAMES = new Set<FeatureName>([
  "goalsScoredRateHome",
  "goalsScoredRateAway",
  "attackEfficiencyHome",
  "attackEfficiencyAway",
  "chanceCreationHome",
  "chanceCreationAway",
  "possessionHome",
  "possessionAway",
  "momentumHome",
  "momentumAway",
  "recentFormHome",
  "recentFormAway",
  "formAtHomeHome",
  "formAtHomeAway",
  "formOnRoadHome",
  "formOnRoadAway",
  "playerAttackContributionHome",
  "playerAttackContributionAway",
  "clubAttackStrengthHome",
  "clubAttackStrengthAway",
  "formStrengthHome",
  "formStrengthAway",
  "goalDifferenceStrengthHome",
  "goalDifferenceStrengthAway",
  "goalsConcededRateHome",
  "goalsConcededRateAway",
  "disciplineRiskHome",
  "disciplineRiskAway",
  "xgDefenseQualityHome",
  "xgDefenseQualityAway",
  "clubDefensiveStrengthHome",
  "clubDefensiveStrengthAway",
  "xgAttackQualityHome",
  "xgAttackQualityAway",
  "finishingEfficiencyHome",
  "finishingEfficiencyAway",
  "clubStrengthHome",
  "clubStrengthAway",
  "pointsPerMatchHome",
  "pointsPerMatchAway",
  "squadAvailabilityScoreHome",
  "squadAvailabilityScoreAway",
  "goalkeeperReliabilityHome",
  "goalkeeperReliabilityAway",
  "rotationPressureHome",
  "rotationPressureAway",
  "venueAdvantage",
  "homeStability",
]);

function candidateScale(
  featureName: FeatureName,
  productionScale: LambdaFeatureScale,
): LambdaFeatureScale {
  if (PERCENT_CENTERED_FEATURE_NAMES.has(featureName)) {
    return "percentCentered";
  }

  return productionScale;
}

function remapWeight(entry: LambdaFeatureWeightEntry): LambdaFeatureWeightEntry {
  return Object.freeze({
    ...entry,
    scale: candidateScale(entry.featureName, entry.scale),
  });
}

export const CALIBRATION_CANDIDATE1_LAMBDA_FEATURE_WEIGHTS = Object.freeze(
  FEATURE_ENRICHED_LAMBDA_FEATURE_WEIGHTS.map(remapWeight),
) satisfies readonly LambdaFeatureWeightEntry[];

export const CALIBRATION_CANDIDATE1_LAMBDA_PARAMETER_SET = Object.freeze({
  baseRate: 1.08,
  min: 0.05,
  max: 5,
  homeAttackShare: 0.58,
  awaySuppressShare: 0.38,
  ratingScale: 50,
  defenseFloor: 0.05,
  featureWeights: CALIBRATION_CANDIDATE1_LAMBDA_FEATURE_WEIGHTS,
  groupFactorMax: 2,
  groupFactorMin: 0.05,
  groupScalars: Object.freeze({
    attack: 0.96,
    xg: 0.98,
    clubStrength: 0.99,
    matchContext: 1,
    defence: 1,
    playerAvailability: 1,
  } satisfies Readonly<Partial<Record<LambdaFeatureGroupId, number>>>),
}) satisfies LambdaParameterSet;
