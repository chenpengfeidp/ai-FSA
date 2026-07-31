import { stableChecksum } from "../../projection/stable-checksum.js";
import { deriveMatrixPredictions } from "../unified-matrix/derive-matrix-predictions.js";
import {
  PROBABILITY_MATRIX_MODEL_VERSION,
  type ProbabilityMatrix,
  type ScorelineCell,
} from "./probability-matrix.js";

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
  const derived = deriveMatrixPredictions(frozenMatrix);
  const checksum = stableChecksum(
    JSON.stringify({
      modelVersion: PROBABILITY_MATRIX_MODEL_VERSION,
      lambdaHome,
      lambdaAway,
      truncationMass,
      pHome: derived.pHome,
      pDraw: derived.pDraw,
      pAway: derived.pAway,
      pBttsYes: derived.pBttsYes,
      pOver25: derived.pOver25,
      mergeWeights: weightedMatrices.map((entry) => entry.weight),
    }),
  );

  return Object.freeze({
    modelVersion: PROBABILITY_MATRIX_MODEL_VERSION,
    lambdaHome,
    lambdaAway,
    matrix: frozenMatrix,
    truncationMass,
    pHome: derived.pHome,
    pDraw: derived.pDraw,
    pAway: derived.pAway,
    topScorelines: derived.topScorelines as readonly ScorelineCell[],
    goalRange: derived.goalRange,
    checksum,
  });
}

export { deriveMatrixPredictions };
