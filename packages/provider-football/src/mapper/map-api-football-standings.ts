import type {
  FootballProviderMethod,
  FootballStandingRow,
  FootballStandingSplit,
  FootballStandings,
} from "../domain/football-models.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function mapStandingSplit(value: unknown): FootballStandingSplit | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const goals = isRecord(value.goals) ? value.goals : undefined;
  const played = asNumber(value.played);
  const won = asNumber(value.win);
  const drawn = asNumber(value.draw);
  const lost = asNumber(value.lose);
  const goalsFor = asNumber(goals?.for);
  const goalsAgainst = asNumber(goals?.against);

  if (
    played === undefined ||
    won === undefined ||
    drawn === undefined ||
    lost === undefined ||
    goalsFor === undefined ||
    goalsAgainst === undefined
  ) {
    return undefined;
  }

  return Object.freeze({
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
  });
}

/**
 * Maps API-Football `/standings` into FAS FootballStandings.
 */
export function mapApiFootballStandings(
  body: unknown,
  options: {
    readonly competitionId: string;
    readonly competitionName: string;
    readonly season: number;
    readonly providerMethod: FootballProviderMethod;
  },
): FootballStandings | undefined {
  if (
    !isRecord(body) ||
    !Array.isArray(body.response) ||
    body.response.length === 0
  ) {
    return undefined;
  }

  const leagueBlock = body.response[0];
  const league =
    isRecord(leagueBlock) && isRecord(leagueBlock.league)
      ? leagueBlock.league
      : undefined;

  if (league === undefined || !Array.isArray(league.standings)) {
    return undefined;
  }

  const rows: FootballStandingRow[] = [];

  for (const group of league.standings) {
    if (!Array.isArray(group)) {
      continue;
    }

    for (const entry of group) {
      if (!isRecord(entry)) {
        continue;
      }

      const team = isRecord(entry.team) ? entry.team : undefined;
      const all = isRecord(entry.all) ? entry.all : undefined;
      const goals = all !== undefined && isRecord(all.goals) ? all.goals : undefined;
      const teamId = asNumber(team?.id);
      const teamName = asString(team?.name);
      const rank = asNumber(entry.rank);
      const played = asNumber(all?.played);
      const won = asNumber(all?.win);
      const drawn = asNumber(all?.draw);
      const lost = asNumber(all?.lose);
      const goalsFor = asNumber(goals?.for);
      const goalsAgainst = asNumber(goals?.against);
      const points = asNumber(entry.points);

      if (
        teamId === undefined ||
        teamName === undefined ||
        rank === undefined ||
        played === undefined ||
        won === undefined ||
        drawn === undefined ||
        lost === undefined ||
        goalsFor === undefined ||
        goalsAgainst === undefined ||
        points === undefined
      ) {
        continue;
      }

      const home = mapStandingSplit(entry.home);
      const away = mapStandingSplit(entry.away);
      const goalsDiff = asNumber(entry.goalsDiff);
      const form = asString(entry.form);
      const description = asString(entry.description);

      rows.push(
        Object.freeze({
          rank,
          teamId: String(teamId),
          teamName,
          played,
          won,
          drawn,
          lost,
          goalsFor,
          goalsAgainst,
          points,
          ...(goalsDiff === undefined ? {} : { goalsDiff }),
          ...(form === undefined ? {} : { form }),
          ...(description === undefined ? {} : { description }),
          ...(home === undefined ? {} : { home }),
          ...(away === undefined ? {} : { away }),
        }),
      );
    }
  }

  if (rows.length === 0) {
    return undefined;
  }

  return Object.freeze({
    competitionId: options.competitionId,
    competitionName: options.competitionName,
    season: options.season,
    rows: Object.freeze(rows),
    providerMethod: options.providerMethod,
  });
}
