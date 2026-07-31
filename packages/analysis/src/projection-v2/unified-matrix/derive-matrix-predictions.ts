import { G_MAX } from "../../projection/projection-math.js";
import { roundProbability } from "../../projection/projection-math.js";
import type { ScorelineCell } from "../probability-matrix/probability-matrix.js";

export const UNIFIED_MATRIX_DERIVATION_POLICY = "unifiedMatrix.v1";

export interface MatrixGoalRange {
  readonly range01: number;
  readonly range23: number;
  readonly range4Plus: number;
}

export interface MatrixDerivedPredictions {
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
  readonly goalRange: MatrixGoalRange;
  readonly topScorelines: readonly ScorelineCell[];
  readonly mostLikelyScoreline: ScorelineCell;
  readonly secondScoreline: ScorelineCell | null;
  readonly pBttsYes: number;
  readonly pBttsNo: number;
  readonly pOver25: number;
  readonly pUnder25: number;
}

export function deriveMatrixPredictions(
  matrix: readonly (readonly number[])[],
): MatrixDerivedPredictions {
  let pHome = 0;
  let pDraw = 0;
  let pAway = 0;
  let range01 = 0;
  let range23 = 0;
  let range4Plus = 0;
  let pBttsYes = 0;
  let pOver25 = 0;
  const scorelines: ScorelineCell[] = [];

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

      const totalGoals = homeGoals + awayGoals;

      if (totalGoals <= 1) {
        range01 += probability;
      } else if (totalGoals <= 3) {
        range23 += probability;
      } else {
        range4Plus += probability;
      }

      if (homeGoals > 0 && awayGoals > 0) {
        pBttsYes += probability;
      }

      if (totalGoals >= 3) {
        pOver25 += probability;
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

  scorelines.sort(
    (left, right) =>
      right.probability - left.probability ||
      left.homeGoals - right.homeGoals ||
      left.awayGoals - right.awayGoals,
  );
  const mostLikelyScoreline = scorelines[0] ?? {
    homeGoals: 0,
    awayGoals: 0,
    probability: 0,
  };
  const secondScoreline = scorelines[1] ?? null;

  return Object.freeze({
    pHome: roundProbability(pHome),
    pDraw: roundProbability(pDraw),
    pAway: roundProbability(pAway),
    goalRange: Object.freeze({
      range01: roundProbability(range01),
      range23: roundProbability(range23),
      range4Plus: roundProbability(range4Plus),
    }),
    topScorelines: Object.freeze(
      scorelines.slice(0, 8).map((scoreline) => Object.freeze({ ...scoreline })),
    ),
    mostLikelyScoreline: Object.freeze({ ...mostLikelyScoreline }),
    secondScoreline:
      secondScoreline === null ? null : Object.freeze({ ...secondScoreline }),
    pBttsYes: roundProbability(pBttsYes),
    pBttsNo: roundProbability(1 - pBttsYes),
    pOver25: roundProbability(pOver25),
    pUnder25: roundProbability(1 - pOver25),
  });
}

export function buildUnifiedMatrixDerivationNotes(
  derived: MatrixDerivedPredictions,
): readonly string[] {
  return Object.freeze([
    "Winner probabilities sum home-win, draw, and away-win cells in the unified matrix.",
    `Most likely scoreline ${derived.mostLikelyScoreline.homeGoals}-${derived.mostLikelyScoreline.awayGoals} is the highest-probability cell.`,
    "Goal range buckets aggregate total-goals mass from the same matrix.",
    "BTTS Yes sums all cells where both teams score at least once.",
    "Over 2.5 sums all cells with three or more total goals; Under 2.5 is the complement.",
  ]);
}
