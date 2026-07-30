import type { FeatureName } from "@fas/feature";
import type { LambdaGroupContribution } from "../lambda/lambda-parameter-set.js";

export type StateDimensionLevel = "absent" | "low" | "medium" | "high";

export type StateDimensionBasis = "derived" | "feature" | "identity";

export interface StateDimensionValue {
  readonly level: StateDimensionLevel;
  readonly score: number;
  readonly basis: StateDimensionBasis;
  readonly sourceRefs: readonly string[];
}

export const REQUIRED_FOUNDATION_FEATURES = Object.freeze([
  "attackRatingHome",
  "attackRatingAway",
  "defenseRatingHome",
  "defenseRatingAway",
  "momentumHome",
  "momentumAway",
  "homeAdvantage",
] as const satisfies readonly FeatureName[]);

export interface FootballStateProjectionInputs {
  readonly homeAttackRating: number;
  readonly awayAttackRating: number;
  readonly homeDefenseRating: number;
  readonly awayDefenseRating: number;
  readonly homeMomentum: number;
  readonly awayMomentum: number;
  readonly homeAdvantage: number;
  readonly groupContributions: readonly LambdaGroupContribution[];
  readonly absentOptionalFeatures: readonly string[];
  readonly blocked: boolean;
  readonly missingFoundationFeatures: readonly string[];
}

export const EMPTY_PROJECTION_INPUTS: FootballStateProjectionInputs = Object.freeze({
  homeAttackRating: 0,
  awayAttackRating: 0,
  homeDefenseRating: 0,
  awayDefenseRating: 0,
  homeMomentum: 0,
  awayMomentum: 0,
  homeAdvantage: 0,
  groupContributions: Object.freeze([]),
  absentOptionalFeatures: Object.freeze([]),
  blocked: true,
  missingFoundationFeatures: Object.freeze([]),
});
