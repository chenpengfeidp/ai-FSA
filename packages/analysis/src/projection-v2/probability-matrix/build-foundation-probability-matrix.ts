import type { Feature, FeatureName } from "@fas/feature";
import type { FeatureBundle } from "@fas/feature";
import {
  buildIndependentPoissonMatrix,
  computeLambdas,
} from "../../projection/projection-math.js";
import {
  createProbabilityMatrixFromPoisson,
  type ProbabilityMatrix,
} from "./probability-matrix.js";

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

export function buildFoundationProbabilityMatrix(input: {
  readonly featureBundle: FeatureBundle;
}): ProbabilityMatrix | undefined {
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

  if (
    attackHome === undefined ||
    defenseAway === undefined ||
    attackAway === undefined ||
    defenseHome === undefined ||
    momentumHome === undefined ||
    momentumAway === undefined ||
    homeAdvantage === undefined
  ) {
    return undefined;
  }

  const lambdas = computeLambdas({
    attackRatingHome: attackHome,
    defenseRatingAway: defenseAway,
    attackRatingAway: attackAway,
    defenseRatingHome: defenseHome,
    homeAdvantage,
  });
  const poisson = buildIndependentPoissonMatrix(
    lambdas.lambdaHome,
    lambdas.lambdaAway,
  );

  return createProbabilityMatrixFromPoisson(poisson, lambdas);
}

export { REQUIRED_FOUNDATION_FEATURES };
