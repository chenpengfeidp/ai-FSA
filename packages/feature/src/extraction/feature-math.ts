export const BASELINE_ATTACK = 50;
export const BASELINE_DEFENSE = 50;
export const BASELINE_SHOTS_FOR = 12;
export const BASELINE_SHOTS_AGAINST = 12;
export const BASELINE_XG_FOR = 1.3;
export const BASELINE_XG_AGAINST = 1.3;
export const SHRINK_K = 3;
export const MOMENTUM_DECAY = 0.75;
export const DEFAULT_HOME_ADVANTAGE = 0.35;

export function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

export function shrink(raw: number, baseline: number, n: number): number {
  return (n * raw + SHRINK_K * baseline) / (n + SHRINK_K);
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function computeAttackRating(input: {
  readonly shotsForPerMatch: number;
  readonly xgForPerMatch: number;
  readonly goalsFor: readonly number[];
  readonly windowMatches: number;
}): number {
  const shotsIndex = 100 * (input.shotsForPerMatch / BASELINE_SHOTS_FOR);
  const xgIndex = 100 * (input.xgForPerMatch / BASELINE_XG_FOR);
  const gfIndex = 100 * (mean(input.goalsFor) / BASELINE_XG_FOR);
  const raw = 0.4 * shotsIndex + 0.4 * xgIndex + 0.2 * gfIndex;

  return clamp(shrink(raw, BASELINE_ATTACK, input.windowMatches), 0, 100);
}

export function computeDefenseRating(input: {
  readonly shotsAgainstPerMatch: number;
  readonly xgAgainstPerMatch: number;
  readonly goalsAgainst: readonly number[];
  readonly windowMatches: number;
}): number {
  const shotsAgainstIndex =
    100 * (BASELINE_SHOTS_AGAINST / Math.max(input.shotsAgainstPerMatch, 0.01));
  const xgAgainstIndex =
    100 * (BASELINE_XG_AGAINST / Math.max(input.xgAgainstPerMatch, 0.01));
  const gaIndex =
    100 * (BASELINE_XG_AGAINST / Math.max(mean(input.goalsAgainst), 0.01));
  const raw = 0.4 * shotsAgainstIndex + 0.4 * xgAgainstIndex + 0.2 * gaIndex;

  return clamp(shrink(raw, BASELINE_DEFENSE, input.windowMatches), 0, 100);
}

export function computeMomentum(results: readonly ("D" | "L" | "W")[]): number {
  let weighted = 0;
  let weightSum = 0;

  for (let index = 0; index < results.length; index += 1) {
    const weight = MOMENTUM_DECAY ** index;
    const points = results[index] === "W" ? 1 : results[index] === "L" ? -1 : 0;
    weighted += weight * points;
    weightSum += weight;
  }

  if (weightSum === 0) {
    return 0;
  }

  return clamp(weighted / weightSum, -1, 1);
}

export function roundFeature(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
