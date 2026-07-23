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

/** Recent form score in [0, 100] from W/D/L (W=1, D=0.5, L=0). */
export function computeRecentFormScore(
  results: readonly ("D" | "L" | "W")[],
): number {
  if (results.length === 0) {
    return 0;
  }

  const points = results.reduce((sum, result) => {
    if (result === "W") {
      return sum + 1;
    }

    if (result === "D") {
      return sum + 0.5;
    }

    return sum;
  }, 0);

  return clamp((points / results.length) * 100, 0, 100);
}

/**
 * Availability penalty magnitude from absence counts.
 * Emitted only when at least one absence Fact exists for the side.
 */
export function computeAvailabilityPenalty(input: {
  readonly injuryCount: number;
  readonly suspensionCount: number;
}): number {
  const raw = input.injuryCount * 8 + input.suspensionCount * 10;
  return clamp(raw, 0, 40);
}

/** Bounded venue advantage score when VENUE Evidence is present. */
export const VENUE_ADVANTAGE_SCORE = 8;

export function roundFeature(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export interface AdvancedStatInputs {
  readonly shotsTotal: number | undefined;
  readonly shotsOnTarget: number | undefined;
  readonly possessionPct: number | undefined;
  readonly corners: number | undefined;
  readonly dangerousAttacks: number | undefined;
  readonly yellowCards: number | undefined;
  readonly redCards: number | undefined;
  readonly fouls: number | undefined;
}

/**
 * F1.2b Attack Efficiency in [0, 100] from shots + shots on target.
 * Honest absence when neither measurement exists.
 */
export function computeAttackEfficiency(
  input: AdvancedStatInputs,
): number | undefined {
  const { shotsTotal, shotsOnTarget } = input;

  if (shotsTotal === undefined && shotsOnTarget === undefined) {
    return undefined;
  }

  if (shotsTotal !== undefined && shotsOnTarget !== undefined) {
    const rate = shotsTotal > 0 ? shotsOnTarget / shotsTotal : 0;
    return clamp(rate * 55 + Math.min(shotsTotal, 20) * 2.25, 0, 100);
  }

  if (shotsOnTarget !== undefined) {
    return clamp(shotsOnTarget * 9, 0, 100);
  }

  return clamp((shotsTotal ?? 0) * 4.5, 0, 100);
}

/**
 * F1.2b Possession Dominance — provider possession % when supplied.
 */
export function computePossessionDominance(
  input: AdvancedStatInputs,
): number | undefined {
  return input.possessionPct === undefined
    ? undefined
    : clamp(input.possessionPct, 0, 100);
}

/**
 * F1.2b Chance Creation in [0, 100] from dangerous attacks + shots + corners.
 * Honest absence when none of the three measurements exist.
 */
export function computeChanceCreation(
  input: AdvancedStatInputs,
): number | undefined {
  const { dangerousAttacks, shotsTotal, corners } = input;

  if (
    dangerousAttacks === undefined &&
    shotsTotal === undefined &&
    corners === undefined
  ) {
    return undefined;
  }

  const raw =
    (dangerousAttacks ?? 0) * 0.45 + (shotsTotal ?? 0) * 3.5 + (corners ?? 0) * 4.5;

  return clamp(raw, 0, 100);
}

/**
 * F1.2b Discipline Risk — higher means more cards/fouls pressure on that side.
 * Honest absence when yellow, red, and fouls are all missing.
 */
export function computeDisciplineRisk(
  input: AdvancedStatInputs,
): number | undefined {
  const { yellowCards, redCards, fouls } = input;

  if (yellowCards === undefined && redCards === undefined && fouls === undefined) {
    return undefined;
  }

  return clamp(
    (yellowCards ?? 0) * 8 + (redCards ?? 0) * 25 + (fouls ?? 0) * 2,
    0,
    100,
  );
}

/**
 * F1.3B Attack Quality in [0, 100] from provider Expected Goals (xG).
 * Honest absence when xG is unavailable — never estimate from shots.
 */
export function computeXgAttackQuality(xg: number): number {
  return clamp(100 * (xg / BASELINE_XG_FOR), 0, 100);
}

/**
 * F1.3B Defensive Quality in [0, 100] from provider Expected Goals Against (xGA).
 * Higher means stronger defense (fewer expected goals conceded).
 */
export function computeXgDefenseQuality(xga: number): number {
  return clamp(100 * (BASELINE_XG_AGAINST / Math.max(xga, 0.01)), 0, 100);
}

/**
 * F1.3B signed xG dominance: home xG minus away xG (provider values only).
 */
export function computeXgDominance(homeXg: number, awayXg: number): number {
  return roundFeature(homeXg - awayXg);
}

/**
 * F1.3B Finishing Efficiency in [0, 100].
 * 50 = finishing in line with xG; above 50 = goals exceed xG.
 * Honest absence when either goals rate or xG is missing.
 */
export function computeFinishingEfficiency(
  goalsPerMatch: number,
  xg: number,
): number {
  return clamp(50 + 25 * (goalsPerMatch - xg), 0, 100);
}

/**
 * I1B Fatigue Index in [0, 100] from Match Context schedule facts.
 * Higher = more fatigued. Never invents missing rest/congestion.
 */
export function computeFatigueIndex(input: {
  readonly restDays: number;
  readonly matchesInLast7Days: number;
  readonly matchesInLast14Days?: number;
}): number {
  const restComponent = clamp(100 * (1 - input.restDays / 7), 0, 100);
  const congestionComponent = clamp(input.matchesInLast7Days * 25, 0, 100);

  if (input.matchesInLast14Days === undefined) {
    return clamp(0.5 * restComponent + 0.5 * congestionComponent, 0, 100);
  }

  const frequencyComponent = clamp(input.matchesInLast14Days * 12.5, 0, 100);

  return clamp(
    0.4 * restComponent + 0.4 * congestionComponent + 0.2 * frequencyComponent,
    0,
    100,
  );
}

/**
 * I1B signed Schedule Advantage: positive favors the home side
 * (more rest and/or less congestion than the opponent).
 */
export function computeScheduleAdvantage(input: {
  readonly homeRestDays: number;
  readonly awayRestDays: number;
  readonly homeMatchesInLast7Days?: number;
  readonly awayMatchesInLast7Days?: number;
}): number {
  const restDiff = input.homeRestDays - input.awayRestDays;
  const homeCongestion = input.homeMatchesInLast7Days;
  const awayCongestion = input.awayMatchesInLast7Days;

  if (homeCongestion === undefined || awayCongestion === undefined) {
    return roundFeature(restDiff);
  }

  return roundFeature(restDiff + 0.5 * (awayCongestion - homeCongestion));
}

/**
 * I1B Home Stability in [0, 100] from home/away context posture.
 * Present only when the home side's MATCH_CONTEXT declares homeAwayContext.
 */
export function computeHomeStability(homeAwayContext: "away" | "home"): number {
  return homeAwayContext === "home" ? 100 : 35;
}

/**
 * I1B Rotation Pressure in [0, 100] from fixture congestion count.
 */
export function computeRotationPressure(matchesInLast7Days: number): number {
  return clamp(matchesInLast7Days * 25, 0, 100);
}

/**
 * I1B Knockout Context score in [0, 100].
 * 0 = non-knockout when explicitly known; higher for knockout legs.
 */
export function computeKnockoutContext(input: {
  readonly isKnockout: boolean;
  readonly leg?: "first" | "second";
  readonly hasAggregateScore: boolean;
}): number {
  if (!input.isKnockout) {
    return 0;
  }

  let score = 50;

  if (input.leg === "first") {
    score = 60;
  } else if (input.leg === "second") {
    score = 75;
  }

  if (input.hasAggregateScore) {
    score += 10;
  }

  return clamp(score, 0, 100);
}

/**
 * Head-to-head lean from meetings oriented to the current fixture.
 * Positive favors the current home side. Shrinks toward 0 with small samples.
 */
export function computeH2hLean(
  meetings: readonly Readonly<{
    homeGoals: number;
    awayGoals: number;
  }>[],
): number {
  if (meetings.length === 0) {
    return 0;
  }

  const points = meetings.map((meeting) => {
    if (meeting.homeGoals > meeting.awayGoals) {
      return 1;
    }

    if (meeting.homeGoals < meeting.awayGoals) {
      return -1;
    }

    return 0;
  });
  const raw = mean(points);

  return clamp(shrink(raw, 0, meetings.length), -1, 1);
}

/**
 * Convert decimal 1X2 odds into de-vigged implied probabilities.
 * Market signal only — not an outcome forecast.
 */
export function computeImpliedProbabilities(input: {
  readonly homeOdds: number;
  readonly drawOdds: number;
  readonly awayOdds: number;
}): Readonly<{
  home: number;
  draw: number;
  away: number;
}> {
  const rawHome = 1 / input.homeOdds;
  const rawDraw = 1 / input.drawOdds;
  const rawAway = 1 / input.awayOdds;
  const sum = rawHome + rawDraw + rawAway;

  return Object.freeze({
    home: rawHome / sum,
    draw: rawDraw / sum,
    away: rawAway / sum,
  });
}

/** Positive favors the home side in market-implied terms. */
export function computeMarketLean(input: {
  readonly homeOdds: number;
  readonly drawOdds: number;
  readonly awayOdds: number;
}): number {
  const implied = computeImpliedProbabilities(input);

  return clamp(implied.home - implied.away, -1, 1);
}

/**
 * Two-way de-vigged lean from Asian handicap prices.
 * Positive favors the home side on the given line (market signal only).
 */
export function computeAsianHandicapLean(input: {
  readonly asianHandicapHomeOdds: number;
  readonly asianHandicapAwayOdds: number;
}): number {
  const rawHome = 1 / input.asianHandicapHomeOdds;
  const rawAway = 1 / input.asianHandicapAwayOdds;
  const sum = rawHome + rawAway;

  return clamp(rawHome / sum - rawAway / sum, -1, 1);
}

const STEAM_ODDS_SCALE = 0.3;
const STEAM_HANDICAP_SCALE = 0.25;
const VOLATILITY_SCALE = 0.5;
const PUBLIC_BETTING_THRESHOLD_PCT = 55;

/**
 * Agreement across available directional market leans (I2B).
 * Requires ≥2 leans; opposing signs → 0 (no consensus); never invents sources.
 */
export function computeMarketConsensus(
  leans: readonly number[],
): number | undefined {
  if (leans.length < 2) {
    return undefined;
  }

  const nonzeroSigns = leans
    .map((lean) => Math.sign(lean))
    .filter((sign) => sign !== 0);

  if (nonzeroSigns.length >= 2) {
    const first = nonzeroSigns[0];
    if (first === undefined || nonzeroSigns.some((sign) => sign !== first)) {
      return 0;
    }
  }

  return clamp(mean(leans), -1, 1);
}

/**
 * Signed steam from provider-supplied movement only.
 * Positive = steam toward home; negative = toward away.
 */
export function computeSteamMove(input: {
  readonly handicapMovement?: number;
  readonly oddsMovementHome?: number;
  readonly oddsMovementAway?: number;
}): number | undefined {
  const components: number[] = [];

  if (input.handicapMovement !== undefined) {
    components.push(clamp(-input.handicapMovement / STEAM_HANDICAP_SCALE, -1, 1));
  }

  if (input.oddsMovementHome !== undefined) {
    components.push(clamp(-input.oddsMovementHome / STEAM_ODDS_SCALE, -1, 1));
  }

  if (input.oddsMovementAway !== undefined) {
    components.push(clamp(input.oddsMovementAway / STEAM_ODDS_SCALE, -1, 1));
  }

  if (components.length === 0) {
    return undefined;
  }

  return clamp(mean(components), -1, 1);
}

/**
 * Reverse line movement only when public betting % and line movement both exist.
 * Positive = sharp/home side vs public away; negative = sharp/away vs public home.
 */
export function computeReverseLineMovement(input: {
  readonly publicBettingHomePct?: number;
  readonly publicBettingAwayPct?: number;
  readonly handicapMovement?: number;
  readonly oddsMovementHome?: number;
}): number | undefined {
  const pubHome = input.publicBettingHomePct;
  const pubAway = input.publicBettingAwayPct;

  if (pubHome === undefined && pubAway === undefined) {
    return undefined;
  }

  const hasMove =
    input.handicapMovement !== undefined || input.oddsMovementHome !== undefined;

  if (!hasMove) {
    return undefined;
  }

  const lineTowardHome =
    (input.handicapMovement !== undefined && input.handicapMovement < 0) ||
    (input.oddsMovementHome !== undefined && input.oddsMovementHome < 0);
  const lineTowardAway =
    (input.handicapMovement !== undefined && input.handicapMovement > 0) ||
    (input.oddsMovementHome !== undefined && input.oddsMovementHome > 0);

  if (
    pubHome !== undefined &&
    pubHome >= PUBLIC_BETTING_THRESHOLD_PCT &&
    lineTowardAway
  ) {
    return clamp(-(pubHome - 50) / 50, -1, 1);
  }

  if (
    pubAway !== undefined &&
    pubAway >= PUBLIC_BETTING_THRESHOLD_PCT &&
    lineTowardHome
  ) {
    return clamp((pubAway - 50) / 50, -1, 1);
  }

  return 0;
}

/**
 * Magnitude-based volatility from available movement samples only.
 * Does not invent tick frequency when the provider supplies only open→current.
 */
export function computeMarketVolatility(input: {
  readonly oddsMovementHome?: number;
  readonly oddsMovementDraw?: number;
  readonly oddsMovementAway?: number;
  readonly handicapMovement?: number;
  readonly overUnderLineMovement?: number;
}): number | undefined {
  const magnitudes: number[] = [];

  for (const value of [
    input.oddsMovementHome,
    input.oddsMovementDraw,
    input.oddsMovementAway,
  ]) {
    if (value !== undefined) {
      magnitudes.push(Math.abs(value));
    }
  }

  if (input.handicapMovement !== undefined) {
    magnitudes.push(Math.abs(input.handicapMovement) * 1.5);
  }

  if (input.overUnderLineMovement !== undefined) {
    magnitudes.push(Math.abs(input.overUnderLineMovement) * 1.5);
  }

  if (magnitudes.length === 0) {
    return undefined;
  }

  return clamp((mean(magnitudes) / VOLATILITY_SCALE) * 100, 0, 100);
}

/**
 * Sharp support only when the provider supplies a sharp indicator.
 * Direction follows marketLean (preferred) or asianHandicapLean.
 */
export function computeSharpSupport(input: {
  readonly sharpMoneyIndicator?: boolean | string;
  readonly marketLean?: number;
  readonly asianHandicapLean?: number;
}): number | undefined {
  if (input.sharpMoneyIndicator === undefined) {
    return undefined;
  }

  const sharp =
    input.sharpMoneyIndicator === true ||
    (typeof input.sharpMoneyIndicator === "string" &&
      ["1", "sharp", "true", "yes"].includes(
        input.sharpMoneyIndicator.trim().toLowerCase(),
      ));

  if (!sharp) {
    return 0;
  }

  const lean = input.marketLean ?? input.asianHandicapLean;

  if (lean === undefined) {
    return undefined;
  }

  if (lean === 0) {
    return 0;
  }

  return clamp(Math.sign(lean) * Math.max(Math.abs(lean), 0.5), -1, 1);
}
