import type {
  FootballProviderMethod,
  FootballTeamStats,
} from "../domain/football-models.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Maps API-Football `/teams/statistics` into FAS FootballTeamStats (shots basis).
 * xG is left at 0 in F.1 (true xG is F.1.1).
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

  // Prefer shots; if missing, fail closed (no goals-proxy here — that is Odds path).
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
  });
}
