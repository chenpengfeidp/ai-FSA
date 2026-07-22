import type {
  FootballAdvancedTeamStats,
  FootballProviderMethod,
  FootballTeamStats,
} from "../domain/football-models.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function roundRate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function freezeSeasonAdvanced(input: {
  readonly yellowCards: number | undefined;
  readonly redCards: number | undefined;
  readonly shotsTotal: number | undefined;
  readonly shotsOnTarget: number | undefined;
}): FootballAdvancedTeamStats | undefined {
  const hasAny = [
    input.yellowCards,
    input.redCards,
    input.shotsTotal,
    input.shotsOnTarget,
  ].some((value) => value !== undefined);

  if (!hasAny) {
    return undefined;
  }

  return Object.freeze({
    scope: "season-average" as const,
    shotsTotal: input.shotsTotal,
    shotsOnTarget: input.shotsOnTarget,
    shotsOffTarget: undefined,
    possessionPct: undefined,
    corners: undefined,
    yellowCards: input.yellowCards,
    redCards: input.redCards,
    attacks: undefined,
    dangerousAttacks: undefined,
    fouls: undefined,
    saves: undefined,
    passingAccuracyPct: undefined,
  });
}

/**
 * Maps API-Football `/teams/statistics` into FAS FootballTeamStats.
 * Base shots rates when provider supplies shots totals; cards → optional advanced.
 * xG stays 0 until F1.3 (true provider xG). Never invent advanced metrics.
 */
export function mapApiFootballTeamStats(
  body: unknown,
  options: {
    readonly teamId: string;
    readonly teamName: string;
    readonly teamSide: "away" | "home";
    readonly providerMethod: FootballProviderMethod;
    readonly windowMatches?: number;
  },
): FootballTeamStats | undefined {
  if (!isRecord(body)) {
    return undefined;
  }

  const response = isRecord(body.response) ? body.response : undefined;

  if (response === undefined) {
    return undefined;
  }

  const fixtures = isRecord(response.fixtures) ? response.fixtures : undefined;
  const playedTotal =
    fixtures !== undefined && isRecord(fixtures.played)
      ? asNumber(fixtures.played.total)
      : undefined;

  const windowMatches =
    options.windowMatches ??
    (playedTotal !== undefined && playedTotal > 0
      ? Math.min(playedTotal, 10)
      : undefined);

  if (windowMatches === undefined || windowMatches < 1) {
    return undefined;
  }

  const shots = isRecord(response.shots) ? response.shots : undefined;
  const totalShots =
    shots !== undefined && isRecord(shots.total)
      ? asNumber(shots.total.total)
      : undefined;
  const shotsAgainst =
    shots !== undefined && isRecord(shots.against)
      ? asNumber(shots.against.total)
      : undefined;
  const shotsOn =
    shots !== undefined && isRecord(shots.on) ? asNumber(shots.on.total) : undefined;

  const cards = isRecord(response.cards) ? response.cards : undefined;
  const yellowTotal =
    cards !== undefined && isRecord(cards.yellow)
      ? (asNumber(cards.yellow.total) ?? sumCardBuckets(cards.yellow))
      : undefined;
  const redTotal =
    cards !== undefined && isRecord(cards.red)
      ? (asNumber(cards.red.total) ?? sumCardBuckets(cards.red))
      : undefined;

  const seasonAdvanced = freezeSeasonAdvanced({
    yellowCards:
      yellowTotal !== undefined ? roundRate(yellowTotal / windowMatches) : undefined,
    redCards:
      redTotal !== undefined ? roundRate(redTotal / windowMatches) : undefined,
    shotsTotal:
      totalShots !== undefined ? roundRate(totalShots / windowMatches) : undefined,
    shotsOnTarget:
      shotsOn !== undefined ? roundRate(shotsOn / windowMatches) : undefined,
  });

  // Prefer shots for base STATISTICS; if missing, fail closed (goals-proxy is live fallback).
  if (totalShots === undefined) {
    return undefined;
  }

  const shotsForPerMatch = totalShots / windowMatches;
  const shotsAgainstPerMatch =
    shotsAgainst !== undefined ? shotsAgainst / windowMatches : 0;

  return Object.freeze({
    teamId: options.teamId,
    teamName: options.teamName,
    teamSide: options.teamSide,
    windowMatches,
    shotsForPerMatch,
    shotsAgainstPerMatch,
    xgForPerMatch: 0,
    xgAgainstPerMatch: 0,
    providerMethod: options.providerMethod,
    statsBasis: "shots" as const,
    advanced: seasonAdvanced,
  });
}

function sumCardBuckets(value: Record<string, unknown>): number | undefined {
  let sum = 0;
  let saw = false;

  for (const entry of Object.values(value)) {
    if (typeof entry === "number" && Number.isFinite(entry)) {
      sum += entry;
      saw = true;
      continue;
    }

    if (isRecord(entry)) {
      const total = asNumber(entry.total);
      if (total !== undefined) {
        sum += total;
        saw = true;
      }
    }
  }

  return saw ? sum : undefined;
}

/** Prefer fixture advanced measurements over season-average when both exist. */
export function withAdvancedStats(
  stats: FootballTeamStats,
  advanced: FootballAdvancedTeamStats | undefined,
): FootballTeamStats {
  if (advanced === undefined) {
    return stats;
  }

  return Object.freeze({
    ...stats,
    advanced,
  });
}
