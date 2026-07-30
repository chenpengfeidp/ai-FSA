import { PROBABILITY_MODEL_VERSION } from "../../projection/deterministic-match-projection.js";
import type { IndependentPoissonResult } from "../../projection/projection-math.js";
import { stableChecksum } from "../../projection/stable-checksum.js";

export const PROBABILITY_MATRIX_MODEL_VERSION = PROBABILITY_MODEL_VERSION;

export interface ScorelineCell {
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly probability: number;
}

export interface ProbabilityMatrix {
  readonly modelVersion: typeof PROBABILITY_MATRIX_MODEL_VERSION;
  readonly lambdaHome: number;
  readonly lambdaAway: number;
  readonly matrix: readonly (readonly number[])[];
  readonly truncationMass: number;
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
  readonly topScorelines: readonly ScorelineCell[];
  readonly goalRange: Readonly<{
    readonly range01: number;
    readonly range23: number;
    readonly range4Plus: number;
  }>;
  readonly checksum: string;
}

export function createProbabilityMatrixFromPoisson(
  poisson: IndependentPoissonResult,
  lambdas: Readonly<{ lambdaHome: number; lambdaAway: number }>,
): ProbabilityMatrix {
  const checksum = stableChecksum(
    JSON.stringify({
      modelVersion: PROBABILITY_MATRIX_MODEL_VERSION,
      lambdaHome: lambdas.lambdaHome,
      lambdaAway: lambdas.lambdaAway,
      truncationMass: poisson.truncationMass,
      pHome: poisson.pHome,
      pDraw: poisson.pDraw,
      pAway: poisson.pAway,
    }),
  );

  return Object.freeze({
    modelVersion: PROBABILITY_MATRIX_MODEL_VERSION,
    lambdaHome: lambdas.lambdaHome,
    lambdaAway: lambdas.lambdaAway,
    matrix: poisson.matrix,
    truncationMass: poisson.truncationMass,
    pHome: poisson.pHome,
    pDraw: poisson.pDraw,
    pAway: poisson.pAway,
    topScorelines: Object.freeze(
      poisson.topScorelines.map((scoreline) =>
        Object.freeze({
          homeGoals: scoreline.homeGoals,
          awayGoals: scoreline.awayGoals,
          probability: scoreline.probability,
        }),
      ),
    ),
    goalRange: Object.freeze({ ...poisson.goalRange }),
    checksum,
  });
}
