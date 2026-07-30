import type { FeatureBundle } from "@fas/feature";
import { buildIndependentPoissonMatrix } from "../../projection/projection-math.js";
import { computeFootballState } from "../football-state/compute-football-state.js";
import { buildLambdasV2 } from "../lambda/lambda-builder-v2.js";
import type { ProjectionParameterArtifact } from "../projection-parameter-artifact.js";
import {
  createProbabilityMatrixFromPoisson,
  type ProbabilityMatrix,
} from "./probability-matrix.js";

export function buildFeatureEnrichedProbabilityMatrix(input: {
  readonly featureBundle: FeatureBundle;
  readonly parameters: ProjectionParameterArtifact;
}): ProbabilityMatrix | null {
  const footballState = computeFootballState({
    featureBundle: input.featureBundle,
    lambdaParameters: input.parameters.lambda,
  });
  const lambdaResult = buildLambdasV2({
    footballState,
    parameters: input.parameters.lambda,
  });

  if (lambdaResult.blocked) {
    return null;
  }

  const poisson = buildIndependentPoissonMatrix(
    lambdaResult.lambdaHome,
    lambdaResult.lambdaAway,
  );

  return createProbabilityMatrixFromPoisson(poisson, {
    lambdaHome: lambdaResult.lambdaHome,
    lambdaAway: lambdaResult.lambdaAway,
  });
}

export { REQUIRED_FOUNDATION_FEATURES } from "../football-state/football-state-types.js";
