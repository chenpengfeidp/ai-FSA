import {
  G_MAX,
  type IndependentPoissonResult,
  type ScorelineProbability,
} from "../../projection/projection-math.js";

export function applyDrawBiasToPoisson(
  poisson: IndependentPoissonResult,
  drawBias: number,
): IndependentPoissonResult {
  if (drawBias === 0) {
    return poisson;
  }

  const raw: number[][] = [];

  for (let homeGoals = 0; homeGoals <= G_MAX; homeGoals += 1) {
    const row: number[] = [];

    for (let awayGoals = 0; awayGoals <= G_MAX; awayGoals += 1) {
      const base = poisson.matrix[homeGoals]?.[awayGoals] ?? 0;
      const multiplier =
        homeGoals === awayGoals ? 1 + drawBias * 3 : 1 - drawBias / 2;

      row.push(base * multiplier);
    }

    raw.push(row);
  }

  const total = raw.reduce(
    (sum, row) => sum + row.reduce((rowSum, value) => rowSum + value, 0),
    0,
  );
  const matrix = raw.map((row) =>
    Object.freeze(row.map((value) => (total <= 0 ? 0 : value / total))),
  );
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
    matrix: Object.freeze(matrix.map((row) => Object.freeze([...row]))),
    truncationMass: poisson.truncationMass,
    pHome,
    pDraw,
    pAway,
    topScorelines: Object.freeze(scorelines.slice(0, 8)),
    goalRange: Object.freeze({
      range01,
      range23,
      range4Plus,
    }),
  });
}
