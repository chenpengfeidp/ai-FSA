import type {
  FootballFixture,
  FootballProviderMethod,
  FootballReferee,
  FootballRefereeStatistics,
  FootballVenue,
} from "../domain/football-models.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function mapStatus(raw: string | undefined): FootballFixture["status"] {
  if (raw === "NS" || raw === "TBD" || raw === "PST") {
    return "SCHEDULED";
  }

  if (raw === "FT" || raw === "AET" || raw === "PEN") {
    return "FINISHED";
  }

  return "OTHER";
}

/**
 * Maps one API-Football `/fixtures` response item into FAS FootballFixture.
 * Returns undefined when required fields are missing — never returns raw JSON.
 */
export function mapApiFootballFixtureItem(
  item: unknown,
  providerMethod: FootballProviderMethod,
): FootballFixture | undefined {
  if (!isRecord(item)) {
    return undefined;
  }

  const fixture = isRecord(item.fixture) ? item.fixture : undefined;
  const league = isRecord(item.league) ? item.league : undefined;
  const teams = isRecord(item.teams) ? item.teams : undefined;
  const home = teams !== undefined && isRecord(teams.home) ? teams.home : undefined;
  const away = teams !== undefined && isRecord(teams.away) ? teams.away : undefined;
  const statusRaw =
    fixture !== undefined && isRecord(fixture.status) ? fixture.status : undefined;

  const fixtureIdNum = asNumber(fixture?.id);
  const homeId = asNumber(home?.id);
  const awayId = asNumber(away?.id);
  const leagueId = asNumber(league?.id);
  const season = asNumber(league?.season);
  const kickoff = asString(fixture?.date);
  const homeName = asString(home?.name);
  const awayName = asString(away?.name);
  const competitionName = asString(league?.name) ?? "Unknown";
  const shortStatus = asString(statusRaw?.short);
  const venueRaw =
    fixture !== undefined && isRecord(fixture.venue) ? fixture.venue : undefined;
  const venueName = asString(venueRaw?.name);
  const venueCity = asString(venueRaw?.city);
  const venueIdNum = asNumber(venueRaw?.id);
  const venue: FootballVenue | undefined =
    venueName === undefined
      ? undefined
      : Object.freeze({
          venueId: venueIdNum === undefined ? undefined : String(venueIdNum),
          name: venueName,
          city: venueCity,
        });
  const referee = mapReferee(fixture?.referee);

  if (
    fixtureIdNum === undefined ||
    homeId === undefined ||
    awayId === undefined ||
    leagueId === undefined ||
    season === undefined ||
    kickoff === undefined ||
    homeName === undefined ||
    awayName === undefined
  ) {
    return undefined;
  }

  const fixtureId = String(fixtureIdNum);
  const status = mapStatus(shortStatus);
  const goals = isRecord(item.goals) ? item.goals : undefined;
  const homeGoals = asNumber(goals?.home);
  const awayGoals = asNumber(goals?.away);
  const completedScore =
    status === "FINISHED" &&
    homeGoals !== undefined &&
    awayGoals !== undefined &&
    Number.isInteger(homeGoals) &&
    Number.isInteger(awayGoals) &&
    homeGoals >= 0 &&
    awayGoals >= 0
      ? Object.freeze({ homeGoals, awayGoals })
      : undefined;

  return Object.freeze({
    fixtureId,
    matchId: `football:${fixtureId}`,
    competitionId: String(leagueId),
    competitionName,
    season,
    kickoff,
    homeTeamId: String(homeId),
    homeTeamName: homeName,
    awayTeamId: String(awayId),
    awayTeamName: awayName,
    status,
    completedScore,
    venue,
    referee,
    providerMethod,
  });
}

/**
 * Maps fixture.referee when the provider supplies it.
 * String → identity only. Object fields used only when present (no inference).
 */
function mapReferee(raw: unknown): FootballReferee | undefined {
  if (typeof raw === "string") {
    const name = asString(raw);

    return name === undefined
      ? undefined
      : Object.freeze({
          name,
          country: undefined,
          league: undefined,
          statistics: undefined,
        });
  }

  if (!isRecord(raw)) {
    return undefined;
  }

  const name = asString(raw.name) ?? asString(raw.referee);

  if (name === undefined) {
    return undefined;
  }

  const country = asString(raw.country) ?? asString(raw.nationality);
  const league = asString(raw.league) ?? asString(raw.competition);
  const statsRaw = isRecord(raw.statistics) ? raw.statistics : undefined;
  const appearances = asNumber(statsRaw?.appearances ?? raw.appearances);
  const yellowCardsPerMatch = asNumber(
    statsRaw?.yellowCardsPerMatch ?? raw.yellowCardsPerMatch,
  );
  const redCardsPerMatch = asNumber(
    statsRaw?.redCardsPerMatch ?? raw.redCardsPerMatch,
  );
  const statistics: FootballRefereeStatistics | undefined =
    appearances === undefined &&
    yellowCardsPerMatch === undefined &&
    redCardsPerMatch === undefined
      ? undefined
      : Object.freeze({
          appearances,
          yellowCardsPerMatch,
          redCardsPerMatch,
        });

  return Object.freeze({
    name,
    country,
    league,
    statistics,
  });
}

export function mapApiFootballFixturesResponse(
  body: unknown,
  providerMethod: FootballProviderMethod,
): readonly FootballFixture[] {
  if (!isRecord(body) || !Array.isArray(body.response)) {
    return Object.freeze([]);
  }

  const rows: FootballFixture[] = [];

  for (const item of body.response) {
    const mapped = mapApiFootballFixtureItem(item, providerMethod);

    if (mapped !== undefined) {
      rows.push(mapped);
    }
  }

  return Object.freeze(rows);
}
