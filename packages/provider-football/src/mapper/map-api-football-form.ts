import type {
  FootballProviderMethod,
  FootballResultCode,
  FootballTeamForm,
} from "../domain/football-models.js";
import { mapApiFootballFixturesResponse } from "./map-api-football-fixture.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Builds TeamForm from API-Football `/fixtures?team=&last=` response.
 * Vendor JSON is consumed only inside this mapper.
 */
export function mapApiFootballTeamForm(
  body: unknown,
  options: {
    readonly teamId: string;
    readonly teamName: string;
    readonly teamSide: "away" | "home";
    readonly providerMethod: FootballProviderMethod;
    readonly maxWindow?: number;
  },
): FootballTeamForm | undefined {
  const fixtures = mapApiFootballFixturesResponse(body, options.providerMethod);
  const maxWindow = options.maxWindow ?? 5;
  const results: FootballResultCode[] = [];
  const goalsFor: number[] = [];
  const goalsAgainst: number[] = [];

  // API returns most-recent first; keep chronological for evidence windows.
  const finished = [...fixtures]
    .filter((fixture) => fixture.status === "FINISHED")
    .slice(0, maxWindow)
    .reverse();

  for (const fixture of finished) {
    const isHome = fixture.homeTeamId === options.teamId;
    const isAway = fixture.awayTeamId === options.teamId;

    if (!isHome && !isAway) {
      continue;
    }

    const item = findRawGoals(body, fixture.fixtureId);

    if (item === undefined) {
      continue;
    }

    const teamGoals = isHome ? item.home : item.away;
    const oppGoals = isHome ? item.away : item.home;

    if (teamGoals === undefined || oppGoals === undefined) {
      continue;
    }

    goalsFor.push(teamGoals);
    goalsAgainst.push(oppGoals);

    if (teamGoals > oppGoals) {
      results.push("W");
    } else if (teamGoals < oppGoals) {
      results.push("L");
    } else {
      results.push("D");
    }
  }

  if (results.length === 0) {
    return undefined;
  }

  return Object.freeze({
    teamId: options.teamId,
    teamName: options.teamName,
    teamSide: options.teamSide,
    window: results.length,
    results: Object.freeze(results),
    goalsFor: Object.freeze(goalsFor),
    goalsAgainst: Object.freeze(goalsAgainst),
    providerMethod: options.providerMethod,
  });
}

function findRawGoals(
  body: unknown,
  fixtureId: string,
): { readonly home: number; readonly away: number } | undefined {
  if (!isRecord(body) || !Array.isArray(body.response)) {
    return undefined;
  }

  for (const item of body.response) {
    if (!isRecord(item)) {
      continue;
    }

    const fixture = isRecord(item.fixture) ? item.fixture : undefined;
    const goals = isRecord(item.goals) ? item.goals : undefined;

    if (String(asNumber(fixture?.id) ?? "") !== fixtureId || goals === undefined) {
      continue;
    }

    const home = asNumber(goals.home);
    const away = asNumber(goals.away);

    if (home === undefined || away === undefined) {
      continue;
    }

    return Object.freeze({ home, away });
  }

  return undefined;
}
