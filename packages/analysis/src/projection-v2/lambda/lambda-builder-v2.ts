import type { Feature, FeatureBundle, FeatureName } from "@fas/feature";
import { clamp } from "../../projection/projection-math.js";
import { LAMBDA_FEATURE_GROUPS } from "./lambda-feature-groups.js";
import type {
  LambdaBuilderV2Result,
  LambdaFeatureScale,
  LambdaFeatureWeightEntry,
  LambdaGroupContribution,
  LambdaParameterSet,
} from "./lambda-parameter-set.js";

const REQUIRED_FOUNDATION_FEATURES = Object.freeze([
  "attackRatingHome",
  "attackRatingAway",
  "defenseRatingHome",
  "defenseRatingAway",
  "momentumHome",
  "momentumAway",
  "homeAdvantage",
] as const satisfies readonly FeatureName[]);

function numericFeature(
  features: ReadonlyMap<FeatureName, Feature>,
  name: FeatureName,
): number | undefined {
  const value = features.get(name)?.value;

  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

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

    const numeric = numericFeature(input.features, featureName);
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

    const numeric = numericFeature(input.features, featureName);

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

function sideLambda(input: {
  readonly attackRating: number;
  readonly opponentDefenseRating: number;
  readonly homeAdvantage: number;
  readonly side: "home" | "away";
  readonly features: ReadonlyMap<FeatureName, Feature>;
  readonly parameters: LambdaParameterSet;
}): {
  readonly lambda: number;
  readonly contributions: readonly LambdaGroupContribution[];
  readonly absentOptionalFeatures: readonly string[];
} {
  const {
    attackRating,
    opponentDefenseRating,
    homeAdvantage,
    side,
    features,
    parameters,
  } = input;
  const contributions: LambdaGroupContribution[] = [];
  const absentOptionalFeatures: string[] = [];
  const attackBase = attackRating / parameters.ratingScale;
  const defenseBase = Math.max(
    opponentDefenseRating / parameters.ratingScale,
    parameters.defenseFloor,
  );

  for (const groupDefinition of LAMBDA_FEATURE_GROUPS) {
    const sideFeatures =
      side === "home" ? groupDefinition.homeFeatures : groupDefinition.awayFeatures;
    const mode =
      groupDefinition.group === "playerAvailability" ? "suppressor" : "multiplier";
    const contribution = computeGroupFactor({
      features,
      group: groupDefinition.group,
      side,
      featureNames: sideFeatures,
      weights: parameters.featureWeights,
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
    weights: parameters.featureWeights,
  });

  if (
    sharedContext.appliedFeatures.length > 0 ||
    sharedContext.absentFeatures.length > 0
  ) {
    contributions.push(sharedContext);
    absentOptionalFeatures.push(...sharedContext.absentFeatures);
  }

  const opponentSide = side === "home" ? "away" : "home";
  const attackFactor =
    attackBase *
    contributions
      .filter(
        (entry) =>
          entry.side === side &&
          (entry.group === "attack" ||
            entry.group === "xg" ||
            entry.group === "clubStrength"),
      )
      .reduce((product, entry) => product * entry.factor, 1);
  const defenseFactor =
    defenseBase *
    contributions
      .filter((entry) => entry.side === opponentSide && entry.group === "defence")
      .reduce((product, entry) => product * entry.factor, 1);
  const contextFactor = contributions
    .filter((entry) => entry.side === side && entry.group === "matchContext")
    .reduce((product, entry) => product * entry.factor, 1);
  const availabilityFactor = contributions
    .filter((entry) => entry.side === side && entry.group === "playerAvailability")
    .reduce((product, entry) => product * entry.factor, 1);
  const homeFieldFactor =
    side === "home"
      ? 1 + parameters.homeAttackShare * homeAdvantage
      : 1 - parameters.awaySuppressShare * homeAdvantage;

  const lambda = clamp(
    ((parameters.baseRate * attackFactor * contextFactor * availabilityFactor) /
      defenseFactor) *
      homeFieldFactor,
    parameters.min,
    parameters.max,
  );

  return Object.freeze({
    lambda,
    contributions: Object.freeze([...contributions]),
    absentOptionalFeatures: Object.freeze([...absentOptionalFeatures]),
  });
}

export function buildLambdasV2(input: {
  readonly featureBundle: FeatureBundle;
  readonly parameters: LambdaParameterSet;
}): LambdaBuilderV2Result {
  const features = new Map(
    input.featureBundle.features.map((feature) => [feature.name, feature]),
  );
  const attackHome = numericFeature(features, "attackRatingHome");
  const defenseAway = numericFeature(features, "defenseRatingAway");
  const attackAway = numericFeature(features, "attackRatingAway");
  const defenseHome = numericFeature(features, "defenseRatingHome");
  const momentumHome = numericFeature(features, "momentumHome");
  const momentumAway = numericFeature(features, "momentumAway");
  const homeAdvantage = numericFeature(features, "homeAdvantage");
  const missingRequired = REQUIRED_FOUNDATION_FEATURES.filter(
    (name) => numericFeature(features, name) === undefined,
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
      lambdaHome: 0,
      lambdaAway: 0,
      blocked: true,
      limitations: Object.freeze([
        "Required foundation Features are missing for LambdaBuilderV2.",
        `Missing: ${missingRequired.join(", ")}.`,
      ]),
      groupContributions: Object.freeze([]),
      absentOptionalFeatures: Object.freeze([]),
    });
  }

  const home = sideLambda({
    attackRating: attackHome,
    opponentDefenseRating: defenseAway,
    homeAdvantage,
    side: "home",
    features,
    parameters: input.parameters,
  });
  const away = sideLambda({
    attackRating: attackAway,
    opponentDefenseRating: defenseHome,
    homeAdvantage,
    side: "away",
    features,
    parameters: input.parameters,
  });
  const absentOptionalFeatures = Object.freeze([
    ...new Set([...home.absentOptionalFeatures, ...away.absentOptionalFeatures]),
  ]);
  const limitations = [
    "Projection V2 uses Feature-enriched expected goals; RuleResults are explainability-only in this pin.",
    "Optional Feature factors default to neutral (1.0) when absent.",
  ];

  if (absentOptionalFeatures.length > 0) {
    limitations.push(
      `Absent optional lambda Features (neutral default): ${absentOptionalFeatures.join(", ")}.`,
    );
  }

  return Object.freeze({
    lambdaHome: home.lambda,
    lambdaAway: away.lambda,
    blocked: false,
    limitations: Object.freeze(limitations),
    groupContributions: Object.freeze([
      ...home.contributions,
      ...away.contributions,
    ]),
    absentOptionalFeatures,
  });
}

export { REQUIRED_FOUNDATION_FEATURES };
