import type { FeatureName } from "@fas/feature";

export type LambdaFeatureGroupId =
  | "attack"
  | "defence"
  | "xg"
  | "clubStrength"
  | "playerAvailability"
  | "matchContext";

export type LambdaFeatureScale =
  | "ratingCentered"
  | "unitCentered"
  | "percentCentered"
  | "signedDays"
  | "availabilityPenalty";

export interface LambdaFeatureWeightEntry {
  readonly featureName: FeatureName;
  readonly group: LambdaFeatureGroupId;
  readonly side: "home" | "away" | "shared";
  readonly scale: LambdaFeatureScale;
  readonly weight: number;
}

export interface LambdaParameterSet {
  readonly baseRate: number;
  readonly min: number;
  readonly max: number;
  readonly homeAttackShare: number;
  readonly awaySuppressShare: number;
  readonly ratingScale: number;
  readonly defenseFloor: number;
  readonly featureWeights: readonly LambdaFeatureWeightEntry[];
}

export interface LambdaGroupContribution {
  readonly group: LambdaFeatureGroupId;
  readonly side: "home" | "away";
  readonly factor: number;
  readonly appliedFeatures: readonly string[];
  readonly absentFeatures: readonly string[];
}

export interface LambdaBuilderV2Result {
  readonly lambdaHome: number;
  readonly lambdaAway: number;
  readonly blocked: boolean;
  readonly limitations: readonly string[];
  readonly groupContributions: readonly LambdaGroupContribution[];
  readonly absentOptionalFeatures: readonly string[];
}
