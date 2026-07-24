import type { FootballPlayerSeasonStats } from "../domain/football-models.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asInteger(value: unknown): number | undefined {
  const parsed = asNumber(value);
  return parsed !== undefined && Number.isInteger(parsed) ? parsed : undefined;
}

/** Vendor rating arrives as a string (e.g. "7.166667") or null. */
function asRating(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100) / 100;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : undefined;
  }

  return undefined;
}

export interface FootballPlayerStatsEnrichment {
  readonly age: number | undefined;
  readonly captain: boolean | undefined;
  readonly seasonStats: FootballPlayerSeasonStats | undefined;
}

/**
 * Selects the statistics entry for the requested team, preferring the entry
 * that also matches the requested competition. Falls back to the entry with
 * the most appearances for that team (the player's primary competition).
 * Never guesses a different team's statistics.
 */
function selectStatisticsEntry(
  statistics: readonly unknown[],
  teamId: string,
  competitionId: string | undefined,
): Record<string, unknown> | undefined {
  const teamEntries = statistics.filter(
    (entry): entry is Record<string, unknown> => {
      if (!isRecord(entry)) {
        return false;
      }

      const team = isRecord(entry.team) ? entry.team : undefined;
      const teamIdNum = asNumber(team?.id);
      return teamIdNum !== undefined && String(teamIdNum) === teamId;
    },
  );

  if (teamEntries.length === 0) {
    return undefined;
  }

  if (competitionId !== undefined) {
    const competitionMatch = teamEntries.find((entry) => {
      const league = isRecord(entry.league) ? entry.league : undefined;
      const leagueIdNum = asNumber(league?.id);
      return leagueIdNum !== undefined && String(leagueIdNum) === competitionId;
    });

    if (competitionMatch !== undefined) {
      return competitionMatch;
    }
  }

  return teamEntries.reduce((primary, candidate) => {
    const primaryGames = isRecord(primary.games) ? primary.games : undefined;
    const candidateGames = isRecord(candidate.games) ? candidate.games : undefined;
    const primaryAppearances = asInteger(primaryGames?.appearences) ?? 0;
    const candidateAppearances = asInteger(candidateGames?.appearences) ?? 0;
    return candidateAppearances > primaryAppearances ? candidate : primary;
  });
}

function toSeasonStats(
  entry: Record<string, unknown>,
): FootballPlayerSeasonStats | undefined {
  const games = isRecord(entry.games) ? entry.games : undefined;
  const goals = isRecord(entry.goals) ? entry.goals : undefined;
  const cards = isRecord(entry.cards) ? entry.cards : undefined;
  const league = isRecord(entry.league) ? entry.league : undefined;

  const stats: FootballPlayerSeasonStats = Object.freeze({
    competitionId: (() => {
      const leagueIdNum = asNumber(league?.id);
      return leagueIdNum === undefined ? undefined : String(leagueIdNum);
    })(),
    season: asInteger(league?.season),
    appearances: asInteger(games?.appearences),
    starts: asInteger(games?.lineups),
    minutesPlayed: asInteger(games?.minutes),
    rating: asRating(games?.rating),
    goals: asInteger(goals?.total),
    assists: asInteger(goals?.assists),
    yellowCards: asInteger(cards?.yellow),
    redCards: asInteger(cards?.red),
    saves: asInteger(goals?.saves),
    goalsConceded: asInteger(goals?.conceded),
  });

  const hasAny = Object.values(stats).some((value) => value !== undefined);

  return hasAny ? stats : undefined;
}

/**
 * Maps API-Football `/players?id=&season=` into an optional per-player
 * enrichment (age, captain flag, season statistics at the requested team).
 * Returns undefined when the provider has no matching row — honest absence.
 */
export function mapApiFootballPlayerStatsResponse(
  body: unknown,
  options: {
    readonly teamId: string;
    readonly competitionId?: string;
  },
): FootballPlayerStatsEnrichment | undefined {
  if (
    !isRecord(body) ||
    !Array.isArray(body.response) ||
    body.response.length === 0
  ) {
    return undefined;
  }

  const first = body.response[0];
  if (!isRecord(first)) {
    return undefined;
  }

  const player = isRecord(first.player) ? first.player : undefined;
  const statistics = Array.isArray(first.statistics) ? first.statistics : [];

  const entry = selectStatisticsEntry(
    statistics,
    options.teamId,
    options.competitionId,
  );

  const age = asInteger(player?.age);
  const games =
    entry !== undefined && isRecord(entry.games) ? entry.games : undefined;
  const captain = typeof games?.captain === "boolean" ? games.captain : undefined;
  const seasonStats = entry === undefined ? undefined : toSeasonStats(entry);

  if (age === undefined && captain === undefined && seasonStats === undefined) {
    return undefined;
  }

  return Object.freeze({ age, captain, seasonStats });
}
