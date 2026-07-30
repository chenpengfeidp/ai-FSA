import {
  buildIndependentPoissonMatrix,
  clamp,
} from "../../projection/projection-math.js";
import type { LambdaParameterSet } from "../lambda/lambda-parameter-set.js";
import type { MatchScriptLambdaModifiers } from "../match-script/match-script-parameter-set.js";
import { applyDrawBiasToPoisson } from "./apply-draw-bias.js";
import {
  createProbabilityMatrixFromPoisson,
  type ProbabilityMatrix,
} from "./probability-matrix.js";

export function buildScriptProbabilityMatrix(input: {
  readonly baseLambdaHome: number;
  readonly baseLambdaAway: number;
  readonly modifiers: MatchScriptLambdaModifiers;
  readonly parameters: LambdaParameterSet;
}): ProbabilityMatrix {
  const lambdaHome = clamp(
    input.baseLambdaHome * input.modifiers.homeMultiplier,
    input.parameters.min,
    input.parameters.max,
  );
  const lambdaAway = clamp(
    input.baseLambdaAway * input.modifiers.awayMultiplier,
    input.parameters.min,
    input.parameters.max,
  );
  const poisson = buildIndependentPoissonMatrix(lambdaHome, lambdaAway);
  const adjusted = applyDrawBiasToPoisson(poisson, input.modifiers.drawBias);

  return createProbabilityMatrixFromPoisson(adjusted, {
    lambdaHome,
    lambdaAway,
  });
}
