export {
  createFeature,
  FeatureValidationError,
} from "./domain/feature.js";
export type {
  CreateFeatureInput,
  Feature,
  FeatureName,
} from "./domain/feature.js";
export {
  createFeatureBundle,
  FEATURE_MODEL_VERSION,
  FeatureBundleValidationError,
} from "./domain/feature-bundle.js";
export type {
  CreateFeatureBundleInput,
  FeatureBundle,
  FeatureBundleStatus,
} from "./domain/feature-bundle.js";
export {
  FeatureExtractionError,
  FeatureExtractor,
} from "./extraction/feature-extractor.js";
export type { FeatureExtractionErrorCode } from "./extraction/feature-extractor.js";
export {
  BASELINE_ATTACK,
  BASELINE_DEFENSE,
  BASELINE_SHOTS_AGAINST,
  BASELINE_SHOTS_FOR,
  BASELINE_XG_AGAINST,
  BASELINE_XG_FOR,
  clamp,
  computeAttackEfficiency,
  computeAttackRating,
  computeAvailabilityPenalty,
  computeChanceCreation,
  computeDefenseRating,
  computeDisciplineRisk,
  computeFatigueIndex,
  computeFinishingEfficiency,
  computeH2hLean,
  computeAsianHandicapLean,
  computeHomeStability,
  computeImpliedProbabilities,
  computeKnockoutContext,
  computeMarketConsensus,
  computeMarketLean,
  computeMarketVolatility,
  computeMomentum,
  computePossessionDominance,
  computeRecentFormScore,
  computeReverseLineMovement,
  computeRotationPressure,
  computeSharpSupport,
  computeSteamMove,
  computeScheduleAdvantage,
  computeXgAttackQuality,
  computeXgDefenseQuality,
  computeXgDominance,
  DEFAULT_HOME_ADVANTAGE,
  mean,
  MOMENTUM_DECAY,
  roundFeature,
  shrink,
  SHRINK_K,
  VENUE_ADVANTAGE_SCORE,
} from "./extraction/feature-math.js";
