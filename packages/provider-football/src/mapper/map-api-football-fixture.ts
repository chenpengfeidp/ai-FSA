import type {
  FootballFixture,
  FootballProviderMethod,
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
  const status =
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
  const shortStatus = asString(status?.short);
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
    status: mapStatus(shortStatus),
    venue,
    providerMethod,
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
