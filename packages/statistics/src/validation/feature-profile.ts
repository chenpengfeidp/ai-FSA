import type { FeatureProfileId } from "../domain/validation-report.js";

/**
 * Feature-name families used only to classify already-sealed predictions
 * for V1A Validation. This module never extracts, computes, or renames
 * Features — it reads the `featureNames` already recorded on a sealed
 * Evaluation History `predictionSnapshot` (A1.5) and reports which
 * Football Intelligence families were observed to be present.
 */

/** L1 Club Intelligence Feature names (see feature-extractor.ts extractClubIntelligenceFeatures). */
export const CLUB_INTELLIGENCE_FEATURE_NAMES: ReadonlySet<string> = new Set([
  "clubStrengthHome",
  "clubStrengthAway",
  "clubAttackStrengthHome",
  "clubAttackStrengthAway",
  "clubDefensiveStrengthHome",
  "clubDefensiveStrengthAway",
  "goalDifferenceStrengthHome",
  "goalDifferenceStrengthAway",
  "leagueStrengthHome",
  "leagueStrengthAway",
  "formStrengthHome",
  "formStrengthAway",
  "managerStabilityHome",
  "managerStabilityAway",
  "pointsPerMatchHome",
  "pointsPerMatchAway",
  "homeLeagueStrength",
  "awayLeagueStrength",
]);

/** P1B Player Intelligence Feature names (see feature-extractor.ts extractPlayerIntelligenceFeaturesForSide). */
export const PLAYER_INTELLIGENCE_FEATURE_NAMES: ReadonlySet<string> = new Set([
  "playerAvailabilityImpactHome",
  "playerAvailabilityImpactAway",
  "keyPlayerAvailabilityHome",
  "keyPlayerAvailabilityAway",
  "squadAvailabilityScoreHome",
  "squadAvailabilityScoreAway",
  "playerAttackContributionHome",
  "playerAttackContributionAway",
  "goalkeeperReliabilityHome",
  "goalkeeperReliabilityAway",
]);

/** F1.3 Expected Goals Feature names (see feature-extractor.ts extractExpectedGoalsFeatures). */
export const EXPECTED_GOALS_FEATURE_NAMES: ReadonlySet<string> = new Set([
  "xgAttackQualityHome",
  "xgAttackQualityAway",
  "xgDefenseQualityHome",
  "xgDefenseQualityAway",
  "xgDominance",
  "finishingEfficiencyHome",
  "finishingEfficiencyAway",
]);

/** I1B Match Context Feature names (see feature-extractor.ts extractMatchContextFeatures). */
export const MATCH_CONTEXT_FEATURE_NAMES: ReadonlySet<string> = new Set([
  "fatigueIndexHome",
  "fatigueIndexAway",
  "rotationPressureHome",
  "rotationPressureAway",
  "scheduleAdvantage",
  "knockoutContext",
]);

/** F1.2 Advanced Match Statistics Feature names (see feature-extractor.ts extractAdvancedStatisticsFeatures). */
export const ADVANCED_STATISTICS_FEATURE_NAMES: ReadonlySet<string> = new Set([
  "attackEfficiencyHome",
  "attackEfficiencyAway",
  "possessionHome",
  "possessionAway",
  "chanceCreationHome",
  "chanceCreationAway",
  "disciplineRiskHome",
  "disciplineRiskAway",
]);

function hasAny(
  featureNames: readonly string[],
  family: ReadonlySet<string>,
): boolean {
  return featureNames.some((name) => family.has(name));
}

/**
 * Classifies one sealed prediction's Feature-name snapshot into the single
 * highest Feature-configuration profile it satisfies. Purely observational:
 * derived only from Feature names already present on the sealed
 * `predictionSnapshot`, never a re-run under an alternate configuration.
 */
export function classifyFeatureProfile(
  featureNames: readonly string[],
): FeatureProfileId {
  const hasClub = hasAny(featureNames, CLUB_INTELLIGENCE_FEATURE_NAMES);
  const hasPlayer = hasAny(featureNames, PLAYER_INTELLIGENCE_FEATURE_NAMES);
  const hasXg = hasAny(featureNames, EXPECTED_GOALS_FEATURE_NAMES);
  const hasMatchContext = hasAny(featureNames, MATCH_CONTEXT_FEATURE_NAMES);
  const hasAdvancedStatistics = hasAny(
    featureNames,
    ADVANCED_STATISTICS_FEATURE_NAMES,
  );

  if (hasClub && hasPlayer && hasXg && hasMatchContext && hasAdvancedStatistics) {
    return "full_football_intelligence";
  }

  if (hasClub && hasPlayer && hasXg) {
    return "club_player_xg";
  }

  if (hasClub && hasPlayer) {
    return "club_player";
  }

  if (hasClub) {
    return "club_intelligence";
  }

  return "baseline";
}
