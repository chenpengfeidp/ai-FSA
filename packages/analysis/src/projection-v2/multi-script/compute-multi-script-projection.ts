import type { LambdaParameterSet } from "../lambda/lambda-parameter-set.js";
import type { MatchScriptSet } from "../match-script/match-script-set.js";
import { buildScriptProbabilityMatrix } from "../probability-matrix/build-script-probability-matrix.js";
import { mergeProbabilityMatrices } from "../probability-matrix/merge-probability-matrices.js";
import type { ProbabilityMatrix } from "../probability-matrix/probability-matrix.js";

export const MULTI_SCRIPT_MERGE_ALGORITHM = "convex_cell_merge_v1" as const;

export interface PerScriptProjection {
  readonly scriptId: string;
  readonly label: string;
  readonly weight: number;
  readonly matrix: ProbabilityMatrix;
}

export interface MultiScriptProjectionOutput {
  readonly perScriptProjections: readonly PerScriptProjection[];
  readonly mergedMatrix: ProbabilityMatrix | null;
}

export function computeMultiScriptProjection(input: {
  readonly matchScriptSet: MatchScriptSet;
  readonly baseLambdaHome: number;
  readonly baseLambdaAway: number;
  readonly parameters: LambdaParameterSet;
}): MultiScriptProjectionOutput {
  const perScriptProjections: PerScriptProjection[] = [];

  for (const script of input.matchScriptSet.scripts) {
    const matrix = buildScriptProbabilityMatrix({
      baseLambdaHome: input.baseLambdaHome,
      baseLambdaAway: input.baseLambdaAway,
      modifiers: script.lambdaModifiers,
      parameters: input.parameters,
    });

    perScriptProjections.push(
      Object.freeze({
        scriptId: script.scriptId,
        label: script.label,
        weight: script.weight,
        matrix,
      }),
    );
  }

  const mergedMatrix = mergeProbabilityMatrices(
    perScriptProjections.map((entry) =>
      Object.freeze({
        weight: entry.weight,
        matrix: entry.matrix,
      }),
    ),
  );

  return Object.freeze({
    perScriptProjections: Object.freeze([...perScriptProjections]),
    mergedMatrix,
  });
}
