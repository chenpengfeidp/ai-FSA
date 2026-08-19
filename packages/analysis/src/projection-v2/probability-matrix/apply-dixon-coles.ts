import { G_MAX } from "../../projection/projection-math.js";
import { stableChecksum } from "../../projection/stable-checksum.js";
import { deriveMatrixPredictions } from "../unified-matrix/derive-matrix-predictions.js";
import {
  PROBABILITY_MATRIX_MODEL_VERSION,
  type ProbabilityMatrix,
  type ScorelineCell,
} from "./probability-matrix.js";

export interface GovernedLowScoreDependence {
  readonly enabled: boolean;
  readonly rho: number;
}

function dixonColesTau(
  homeGoals: number,
  awayGoals: number,
  lambdaHome: number,
  lambdaAway: number,
  rho: number,
): number {
  if (homeGoals === 0 && awayGoals === 0) {
    return 1 - lambdaHome * lambdaAway * rho;
  }

  if (homeGoals === 0 && awayGoals === 1) {
    return 1 + lambdaAway * rho;
  }

  if (homeGoals === 1 && awayGoals === 0) {
    return 1 + lambdaHome * rho;
  }

  if (homeGoals === 1 && awayGoals === 1) {
    return 1 - rho;
  }

  return 1;
}

export function applyDixonColesToProbabilityMatrix(input: {
  readonly matrix: ProbabilityMatrix;
  readonly lowScoreDependence: GovernedLowScoreDependence;
}): ProbabilityMatrix {
  const { matrix, lowScoreDependence } = input;

  if (!lowScoreDependence.enabled || lowScoreDependence.rho === 0) {
    return matrix;
  }

  const rho = lowScoreDependence.rho;
  const dimension = matrix.matrix.length;
  const adjustedCells: number[][] = Array.from({ length: dimension }, () =>
    Array.from({ length: dimension }, () => 0),
  );
  let total = 0;

  for (let homeGoals = 0; homeGoals < dimension; homeGoals += 1) {
    const row = adjustedCells[homeGoals];

    if (row === undefined) {
      continue;
    }

    for (let awayGoals = 0; awayGoals < dimension; awayGoals += 1) {
      const base = matrix.matrix[homeGoals]?.[awayGoals] ?? 0;
      const tau = dixonColesTau(
        homeGoals,
        awayGoals,
        matrix.lambdaHome,
        matrix.lambdaAway,
        rho,
      );
      const adjusted = base * tau;

      row[awayGoals] = adjusted;
      total += adjusted;
    }
  }

  if (total <= 0) {
    return matrix;
  }

  const normalized = Object.freeze(
    adjustedCells.map((row) => Object.freeze(row.map((value) => value / total))),
  );
  const derived = deriveMatrixPredictions(normalized);
  const checksum = stableChecksum(
    JSON.stringify({
      modelVersion: PROBABILITY_MATRIX_MODEL_VERSION,
      lambdaHome: matrix.lambdaHome,
      lambdaAway: matrix.lambdaAway,
      truncationMass: matrix.truncationMass,
      lowScoreDependence,
      pHome: derived.pHome,
      pDraw: derived.pDraw,
      pAway: derived.pAway,
      pBttsYes: derived.pBttsYes,
      pOver25: derived.pOver25,
    }),
  );

  return Object.freeze({
    modelVersion: PROBABILITY_MATRIX_MODEL_VERSION,
    lambdaHome: matrix.lambdaHome,
    lambdaAway: matrix.lambdaAway,
    matrix: normalized,
    truncationMass: matrix.truncationMass,
    pHome: derived.pHome,
    pDraw: derived.pDraw,
    pAway: derived.pAway,
    topScorelines: derived.topScorelines.slice(0, 8) as readonly ScorelineCell[],
    goalRange: derived.goalRange,
    checksum,
  });
}

export function applyGovernedLowScoreDependence(
  matrix: ProbabilityMatrix | null,
  lowScoreDependence: GovernedLowScoreDependence | undefined,
): ProbabilityMatrix | null {
  if (matrix === null || lowScoreDependence === undefined) {
    return matrix;
  }

  return applyDixonColesToProbabilityMatrix({
    matrix,
    lowScoreDependence,
  });
}

export { G_MAX };
