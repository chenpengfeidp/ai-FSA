export const LAMBDA0 = 1.3;
export const HOME_ATTACK_SHARE = 0.6;
export const AWAY_SUPPRESS_SHARE = 0.4;
export const LAMBDA_MIN = 0.05;
export const LAMBDA_MAX = 5;
export const G_MAX = 6;
export const RULE_ADJUSTMENT_SCALE = 0.08;

export function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

export function factorial(n: number): number {
  let result = 1;

  for (let i = 2; i <= n; i += 1) {
    result *= i;
  }

  return result;
}

export function poissonPmf(lambda: number, k: number): number {
  return (Math.exp(-lambda) * lambda ** k) / factorial(k);
}

export function computeLambdas(input: {
  readonly attackRatingHome: number;
  readonly defenseRatingAway: number;
  readonly attackRatingAway: number;
  readonly defenseRatingHome: number;
  readonly homeAdvantage: number;
}): Readonly<{ lambdaHome: number; lambdaAway: number }> {
  const attackHome = input.attackRatingHome / 50;
  const defenseAway = input.defenseRatingAway / 50;
  const attackAway = input.attackRatingAway / 50;
  const defenseHome = input.defenseRatingHome / 50;
  const homeFactor = 1 + HOME_ATTACK_SHARE * input.homeAdvantage;
  const awayFactor = 1 - AWAY_SUPPRESS_SHARE * input.homeAdvantage;

  return Object.freeze({
    lambdaHome: clamp(
      ((LAMBDA0 * attackHome) / Math.max(defenseAway, 0.05)) * homeFactor,
      LAMBDA_MIN,
      LAMBDA_MAX,
    ),
    lambdaAway: clamp(
      ((LAMBDA0 * attackAway) / Math.max(defenseHome, 0.05)) * awayFactor,
      LAMBDA_MIN,
      LAMBDA_MAX,
    ),
  });
}

export interface ScorelineProbability {
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly probability: number;
}

export interface IndependentPoissonResult {
  readonly matrix: readonly (readonly number[])[];
  readonly truncationMass: number;
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
  readonly topScorelines: readonly ScorelineProbability[];
  readonly goalRange: Readonly<{
    range01: number;
    range23: number;
    range4Plus: number;
  }>;
}

export function buildIndependentPoissonMatrix(
  lambdaHome: number,
  lambdaAway: number,
): IndependentPoissonResult {
  const raw: number[][] = [];
  let total = 0;

  for (let i = 0; i <= G_MAX; i += 1) {
    const row: number[] = [];

    for (let j = 0; j <= G_MAX; j += 1) {
      const probability = poissonPmf(lambdaHome, i) * poissonPmf(lambdaAway, j);
      row.push(probability);
      total += probability;
    }

    raw.push(row);
  }

  const truncationMass = 1 - total;
  const matrix = raw.map((row) => Object.freeze(row.map((value) => value / total)));

  let pHome = 0;
  let pDraw = 0;
  let pAway = 0;
  let range01 = 0;
  let range23 = 0;
  let range4Plus = 0;
  const scorelines: ScorelineProbability[] = [];

  for (let i = 0; i <= G_MAX; i += 1) {
    for (let j = 0; j <= G_MAX; j += 1) {
      const probability = matrix[i]?.[j] ?? 0;

      if (i > j) {
        pHome += probability;
      } else if (i === j) {
        pDraw += probability;
      } else {
        pAway += probability;
      }

      const goals = i + j;

      if (goals <= 1) {
        range01 += probability;
      } else if (goals <= 3) {
        range23 += probability;
      } else {
        range4Plus += probability;
      }

      scorelines.push(
        Object.freeze({
          homeGoals: i,
          awayGoals: j,
          probability,
        }),
      );
    }
  }

  scorelines.sort((left, right) => {
    if (right.probability !== left.probability) {
      return right.probability - left.probability;
    }

    const leftSum = left.homeGoals + left.awayGoals;
    const rightSum = right.homeGoals + right.awayGoals;

    if (leftSum !== rightSum) {
      return leftSum - rightSum;
    }

    if (right.homeGoals !== left.homeGoals) {
      return right.homeGoals - left.homeGoals;
    }

    return left.awayGoals - right.awayGoals;
  });

  return Object.freeze({
    matrix: Object.freeze(matrix.map((row) => Object.freeze([...row]))),
    truncationMass,
    pHome,
    pDraw,
    pAway,
    topScorelines: Object.freeze(scorelines.slice(0, 3)),
    goalRange: Object.freeze({
      range01,
      range23,
      range4Plus,
    }),
  });
}

export function softmaxAdjust(
  pHome: number,
  pDraw: number,
  pAway: number,
  delta: number,
): Readonly<{ pHome: number; pDraw: number; pAway: number }> {
  const eps = 1e-12;
  const logitHome = Math.log(pHome + eps) + delta;
  const logitDraw = Math.log(pDraw + eps);
  const logitAway = Math.log(pAway + eps) - delta;
  const maxLogit = Math.max(logitHome, logitDraw, logitAway);
  const expHome = Math.exp(logitHome - maxLogit);
  const expDraw = Math.exp(logitDraw - maxLogit);
  const expAway = Math.exp(logitAway - maxLogit);
  const sum = expHome + expDraw + expAway;

  return Object.freeze({
    pHome: expHome / sum,
    pDraw: expDraw / sum,
    pAway: expAway / sum,
  });
}

export function roundProbability(value: number): number {
  return Math.round(value * 1e12) / 1e12;
}
