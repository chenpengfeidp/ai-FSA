import type { Feature, FeatureBundle, FeatureName } from "@fas/feature";
import { clamp } from "../../projection/projection-math.js";
import { LAMBDA_FEATURE_GROUPS } from "../lambda/lambda-feature-groups.js";
import type {
  LambdaFeatureScale,
  LambdaFeatureWeightEntry,
  LambdaGroupContribution,
  LambdaParameterSet,
} from "../lambda/lambda-parameter-set.js";
import { numericFeatureValue } from "./football-state-scoring.js";
import {
  type FootballStateProjectionInputs,
  REQUIRED_FOUNDATION_FEATURES,
} from "./football-state-types.js";

export { REQUIRED_FOUNDATION_FEATURES };

function booleanFeature(
  features: ReadonlyMap<FeatureName, Feature>,
  name: FeatureName,
): boolean | undefined {
  const value = features.get(name)?.value;

  if (typeof value === "boolean") {
    return value;
  }

  return undefined;
}

function centeredContribution(value: number, scale: LambdaFeatureScale): number {
  switch (scale) {
    case "ratingCentered":
      return value / 50 - 1;
    case "unitCentered":
      return (value - 0.5) * 2;
    case "percentCentered":
      return value / 100 - 0.5;
    case "signedDays":
      return clamp(value / 7, -1, 1);
    case "availabilityPenalty":
      return clamp(value, 0, 1);
    default: {
      const exhaustive: never = scale;
      return exhaustive;
    }
  }
}

function weightForFeature(
  weights: readonly LambdaFeatureWeightEntry[],
  featureName: FeatureName,
): LambdaFeatureWeightEntry | undefined {
  return weights.find((entry) => entry.featureName === featureName);
}

function computeGroupFactor(input: {
  readonly features: ReadonlyMap<FeatureName, Feature>;
  readonly group: LambdaFeatureWeightEntry["group"];
  readonly side: "home" | "away";
  readonly featureNames: readonly FeatureName[];
  readonly weights: readonly LambdaFeatureWeightEntry[];
  readonly mode: "multiplier" | "suppressor";
}): LambdaGroupContribution {
  let delta = 0;
  const appliedFeatures: string[] = [];
  const absentFeatures: string[] = [];

  for (const featureName of input.featureNames) {
    const entry = weightForFeature(input.weights, featureName);

    if (entry === undefined || entry.weight === 0) {
      continue;
    }

    const numeric = numericFeatureValue(input.features, featureName);
    const boolean = booleanFeature(input.features, featureName);
    const value = numeric ?? (boolean === undefined ? undefined : boolean ? 1 : 0);

    if (value === undefined) {
      absentFeatures.push(featureName);
      continue;
    }

    const contribution = centeredContribution(
      typeof value === "boolean" ? (value ? 1 : 0) : value,
      entry.scale,
    );

    delta += entry.weight * contribution;
    appliedFeatures.push(featureName);
  }

  const factor =
    input.mode === "suppressor"
      ? clamp(1 + delta, 0.05, 1)
      : clamp(1 + delta, 0.05, 2.5);

  return Object.freeze({
    group: input.group,
    side: input.side,
    factor,
    appliedFeatures: Object.freeze([...appliedFeatures]),
    absentFeatures: Object.freeze([...absentFeatures]),
  });
}

function computeSharedContextFactor(input: {
  readonly features: ReadonlyMap<FeatureName, Feature>;
  readonly side: "home" | "away";
  readonly weights: readonly LambdaFeatureWeightEntry[];
}): LambdaGroupContribution {
  let delta = 0;
  const appliedFeatures: string[] = [];
  const absentFeatures: string[] = [];

  for (const featureName of ["scheduleAdvantage", "knockoutContext"] as const) {
    const entry = weightForFeature(input.weights, featureName);

    if (entry === undefined || entry.weight === 0) {
      continue;
    }

    const numeric = numericFeatureValue(input.features, featureName);

    if (numeric === undefined) {
      absentFeatures.push(featureName);
      continue;
    }

    const directedValue =
      featureName === "scheduleAdvantage" && input.side === "away"
        ? -numeric
        : numeric;
    const contribution = centeredContribution(directedValue, entry.scale);

    delta += entry.weight * contribution;
    appliedFeatures.push(featureName);
  }

  return Object.freeze({
    group: "matchContext",
    side: input.side,
    factor: clamp(1 + delta, 0.05, 2.5),
    appliedFeatures: Object.freeze([...appliedFeatures]),
    absentFeatures: Object.freeze([...absentFeatures]),
  });
}

export function buildFootballStateProjectionInputs(input: {
  readonly featureBundle: FeatureBundle;
  readonly parameters: LambdaParameterSet;
}): FootballStateProjectionInputs {
  const features = new Map(
    input.featureBundle.features.map((feature) => [feature.name, feature]),
  );
  const attackHome = numericFeatureValue(features, "attackRatingHome");
  const defenseAway = numericFeatureValue(features, "defenseRatingAway");
  const attackAway = numericFeatureValue(features, "attackRatingAway");
  const defenseHome = numericFeatureValue(features, "defenseRatingHome");
  const momentumHome = numericFeatureValue(features, "momentumHome");
  const momentumAway = numericFeatureValue(features, "momentumAway");
  const homeAdvantage = numericFeatureValue(features, "homeAdvantage");
  const missingFoundation = REQUIRED_FOUNDATION_FEATURES.filter(
    (name) => numericFeatureValue(features, name) === undefined,
  );

  if (
    attackHome === undefined ||
    defenseAway === undefined ||
    attackAway === undefined ||
    defenseHome === undefined ||
    momentumHome === undefined ||
    momentumAway === undefined ||
    homeAdvantage === undefined
  ) {
    return Object.freeze({
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
      missingFoundationFeatures: Object.freeze([...missingFoundation]),
    });
  }

  const contributions: LambdaGroupContribution[] = [];
  const absentOptionalFeatures: string[] = [];

  for (const side of ["home", "away"] as const) {
    for (const groupDefinition of LAMBDA_FEATURE_GROUPS) {
      const sideFeatures =
        side === "home"
          ? groupDefinition.homeFeatures
          : groupDefinition.awayFeatures;
      const mode =
        groupDefinition.group === "playerAvailability" ? "suppressor" : "multiplier";
      const contribution = computeGroupFactor({
        features,
        group: groupDefinition.group,
        side,
        featureNames: sideFeatures,
        weights: input.parameters.featureWeights,
        mode,
      });

      if (
        contribution.appliedFeatures.length > 0 ||
        contribution.absentFeatures.length > 0
      ) {
        contributions.push(contribution);
        absentOptionalFeatures.push(...contribution.absentFeatures);
      }
    }

    const sharedContext = computeSharedContextFactor({
      features,
      side,
      weights: input.parameters.featureWeights,
    });

    if (
      sharedContext.appliedFeatures.length > 0 ||
      sharedContext.absentFeatures.length > 0
    ) {
      contributions.push(sharedContext);
      absentOptionalFeatures.push(...sharedContext.absentFeatures);
    }
  }

  return Object.freeze({
    homeAttackRating: attackHome,
    awayAttackRating: attackAway,
    homeDefenseRating: defenseHome,
    awayDefenseRating: defenseAway,
    homeMomentum: momentumHome,
    awayMomentum: momentumAway,
    homeAdvantage,
    groupContributions: Object.freeze([...contributions]),
    absentOptionalFeatures: Object.freeze([...new Set(absentOptionalFeatures)]),
    blocked: false,
    missingFoundationFeatures: Object.freeze([]),
  });
}
