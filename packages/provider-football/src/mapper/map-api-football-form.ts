import type {
  FootballFormSplit,
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

interface FinishedMatchRow {
  readonly fixtureId: string;
  readonly venueSide: "away" | "home";
  readonly result: FootballResultCode;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
}

function freezeSplit(
  rows: readonly FinishedMatchRow[],
): FootballFormSplit | undefined {
  if (rows.length === 0) {
    return undefined;
  }

  return Object.freeze({
    window: rows.length,
    results: Object.freeze(rows.map((row) => row.result)),
    goalsFor: Object.freeze(rows.map((row) => row.goalsFor)),
    goalsAgainst: Object.freeze(rows.map((row) => row.goalsAgainst)),
  });
}

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Builds TeamForm from API-Football `/fixtures?team=&last=` response.
 * Vendor JSON is consumed only inside this mapper.
 * Overall window stays ≤ maxWindow; venue splits use the fuller finished sample.
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
  const finishedNewestFirst = [...fixtures].filter(
    (fixture) => fixture.status === "FINISHED",
  );

  const rowsNewestFirst: FinishedMatchRow[] = [];

  for (const fixture of finishedNewestFirst) {
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

    const result: FootballResultCode =
      teamGoals > oppGoals ? "W" : teamGoals < oppGoals ? "L" : "D";

    rowsNewestFirst.push(
      Object.freeze({
        fixtureId: fixture.fixtureId,
        venueSide: isHome ? ("home" as const) : ("away" as const),
        result,
        goalsFor: teamGoals,
        goalsAgainst: oppGoals,
      }),
    );
  }

  if (rowsNewestFirst.length === 0) {
    return undefined;
  }

  const overallNewestFirst = rowsNewestFirst.slice(0, maxWindow);
  // Evidence windows stay chronological (oldest → newest).
  const overall = [...overallNewestFirst].reverse();
  const homeSplitRows = [...rowsNewestFirst]
    .filter((row) => row.venueSide === "home")
    .slice(0, maxWindow)
    .reverse();
  const awaySplitRows = [...rowsNewestFirst]
    .filter((row) => row.venueSide === "away")
    .slice(0, maxWindow)
    .reverse();
  const shortNewestFirst = overallNewestFirst.slice(0, Math.min(3, overall.length));
  const recentShort =
    overall.length >= 3 ? freezeSplit([...shortNewestFirst].reverse()) : undefined;

  const goalsFor = overall.map((row) => row.goalsFor);
  const goalsAgainst = overall.map((row) => row.goalsAgainst);

  return Object.freeze({
    teamId: options.teamId,
    teamName: options.teamName,
    teamSide: options.teamSide,
    window: overall.length,
    results: Object.freeze(overall.map((row) => row.result)),
    goalsFor: Object.freeze(goalsFor),
    goalsAgainst: Object.freeze(goalsAgainst),
    homeSplit: freezeSplit(homeSplitRows),
    awaySplit: freezeSplit(awaySplitRows),
    goalsScoredPerMatch: mean(goalsFor),
    goalsConcededPerMatch: mean(goalsAgainst),
    recentShort,
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
