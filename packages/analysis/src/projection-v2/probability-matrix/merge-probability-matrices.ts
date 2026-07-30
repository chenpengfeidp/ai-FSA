import {
  G_MAX,
  type ScorelineProbability,
} from "../../projection/projection-math.js";
import { stableChecksum } from "../../projection/stable-checksum.js";
import {
  PROBABILITY_MATRIX_MODEL_VERSION,
  type ProbabilityMatrix,
  type ScorelineCell,
} from "./probability-matrix.js";

function deriveMarginals(matrix: readonly (readonly number[])[]): {
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
  readonly goalRange: ProbabilityMatrix["goalRange"];
  readonly topScorelines: readonly ScorelineCell[];
} {
  let pHome = 0;
  let pDraw = 0;
  let pAway = 0;
  let range01 = 0;
  let range23 = 0;
  let range4Plus = 0;
  const scorelines: ScorelineProbability[] = [];

  for (let homeGoals = 0; homeGoals <= G_MAX; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= G_MAX; awayGoals += 1) {
      const probability = matrix[homeGoals]?.[awayGoals] ?? 0;

      if (homeGoals > awayGoals) {
        pHome += probability;
      } else if (homeGoals === awayGoals) {
        pDraw += probability;
      } else {
        pAway += probability;
      }

      const goals = homeGoals + awayGoals;

      if (goals <= 1) {
        range01 += probability;
      } else if (goals <= 3) {
        range23 += probability;
      } else {
        range4Plus += probability;
      }

      scorelines.push(
        Object.freeze({
          homeGoals,
          awayGoals,
          probability,
        }),
      );
    }
  }

  scorelines.sort((left, right) => right.probability - left.probability);

  return Object.freeze({
    pHome,
    pDraw,
    pAway,
    goalRange: Object.freeze({
      range01,
      range23,
      range4Plus,
    }),
    topScorelines: Object.freeze(
      scorelines.slice(0, 8).map((scoreline) => Object.freeze({ ...scoreline })),
    ),
  });
}

export function mergeProbabilityMatrices(
  weightedMatrices: readonly Readonly<{
    readonly weight: number;
    readonly matrix: ProbabilityMatrix;
  }>[],
): ProbabilityMatrix | null {
  if (weightedMatrices.length === 0) {
    return null;
  }

  const totalWeight = weightedMatrices.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight <= 0) {
    return null;
  }

  const dimension = weightedMatrices[0]?.matrix.matrix.length ?? 0;

  if (dimension === 0) {
    return null;
  }

  const mergedCells: number[][] = Array.from({ length: dimension }, () =>
    Array.from({ length: dimension }, () => 0),
  );
  let lambdaHome = 0;
  let lambdaAway = 0;
  let truncationMass = 0;

  for (const entry of weightedMatrices) {
    const normalizedWeight = entry.weight / totalWeight;

    lambdaHome += normalizedWeight * entry.matrix.lambdaHome;
    lambdaAway += normalizedWeight * entry.matrix.lambdaAway;
    truncationMass += normalizedWeight * entry.matrix.truncationMass;

    for (let homeGoals = 0; homeGoals < dimension; homeGoals += 1) {
      const row = mergedCells[homeGoals];

      if (row === undefined) {
        continue;
      }

      for (let awayGoals = 0; awayGoals < dimension; awayGoals += 1) {
        row[awayGoals] =
          (row[awayGoals] ?? 0) +
          normalizedWeight * (entry.matrix.matrix[homeGoals]?.[awayGoals] ?? 0);
      }
    }
  }

  const frozenMatrix = Object.freeze(
    mergedCells.map((row) => Object.freeze([...row])),
  );
  const marginals = deriveMarginals(frozenMatrix);
  const checksum = stableChecksum(
    JSON.stringify({
      modelVersion: PROBABILITY_MATRIX_MODEL_VERSION,
      lambdaHome,
      lambdaAway,
      truncationMass,
      pHome: marginals.pHome,
      pDraw: marginals.pDraw,
      pAway: marginals.pAway,
      mergeWeights: weightedMatrices.map((entry) => entry.weight),
    }),
  );

  return Object.freeze({
    modelVersion: PROBABILITY_MATRIX_MODEL_VERSION,
    lambdaHome,
    lambdaAway,
    matrix: frozenMatrix,
    truncationMass,
    pHome: marginals.pHome,
    pDraw: marginals.pDraw,
    pAway: marginals.pAway,
    topScorelines: marginals.topScorelines,
    goalRange: marginals.goalRange,
    checksum,
  });
}
