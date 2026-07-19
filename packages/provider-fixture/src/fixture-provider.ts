export type FixtureResultCode = "D" | "L" | "W";

export interface FixtureTeamForm {
  readonly teamSide: "away" | "home";
  readonly window: number;
  readonly results: readonly FixtureResultCode[];
  readonly goalsFor: readonly number[];
  readonly goalsAgainst: readonly number[];
}

export interface FixtureStatistics {
  readonly teamSide: "away" | "home";
  readonly windowMatches: number;
  readonly shotsForPerMatch: number;
  readonly shotsAgainstPerMatch: number;
  readonly xgForPerMatch: number;
  readonly xgAgainstPerMatch: number;
}

export interface FixtureMatch {
  readonly matchId: string;
  readonly home: string;
  readonly away: string;
  readonly kickoff: string;
  readonly teamForm: readonly FixtureTeamForm[];
  readonly statistics: readonly FixtureStatistics[];
}

function form(
  teamSide: "away" | "home",
  results: readonly FixtureResultCode[],
  goalsFor: readonly number[],
  goalsAgainst: readonly number[],
): FixtureTeamForm {
  return Object.freeze({
    teamSide,
    window: results.length,
    results: Object.freeze([...results]),
    goalsFor: Object.freeze([...goalsFor]),
    goalsAgainst: Object.freeze([...goalsAgainst]),
  });
}

function stats(
  teamSide: "away" | "home",
  windowMatches: number,
  shotsForPerMatch: number,
  shotsAgainstPerMatch: number,
  xgForPerMatch: number,
  xgAgainstPerMatch: number,
): FixtureStatistics {
  return Object.freeze({
    teamSide,
    windowMatches,
    shotsForPerMatch,
    shotsAgainstPerMatch,
    xgForPerMatch,
    xgAgainstPerMatch,
  });
}

function fixture(
  matchId: string,
  home: string,
  away: string,
  kickoff: string,
  homeForm: FixtureTeamForm,
  awayForm: FixtureTeamForm,
  homeStats: FixtureStatistics,
  awayStats: FixtureStatistics,
): FixtureMatch {
  return Object.freeze({
    matchId,
    home,
    away,
    kickoff,
    teamForm: Object.freeze([homeForm, awayForm]),
    statistics: Object.freeze([homeStats, awayStats]),
  });
}

const strongHomeForm = form(
  "home",
  ["W", "W", "D", "W", "L"],
  [2, 3, 1, 2, 0],
  [0, 1, 1, 1, 1],
);
const weakAwayForm = form(
  "away",
  ["L", "D", "L", "W", "L"],
  [0, 1, 1, 2, 0],
  [2, 1, 3, 1, 2],
);
const strongHomeStats = stats("home", 5, 15, 9, 1.8, 1.0);
const weakAwayStats = stats("away", 5, 10, 14, 1.0, 1.7);

const balancedHomeForm = form(
  "home",
  ["W", "D", "L", "W", "D"],
  [1, 1, 0, 2, 1],
  [0, 1, 1, 1, 1],
);
const balancedAwayForm = form(
  "away",
  ["D", "W", "D", "L", "W"],
  [1, 2, 1, 0, 1],
  [1, 1, 1, 2, 0],
);
const balancedHomeStats = stats("home", 5, 12, 12, 1.3, 1.3);
const balancedAwayStats = stats("away", 5, 12, 12, 1.3, 1.3);

const fixtureMatches: Readonly<Record<string, FixtureMatch>> = Object.freeze({
  "match-example": fixture(
    "match-example",
    "Liverpool",
    "Chelsea",
    "2026-08-01T19:30:00Z",
    strongHomeForm,
    weakAwayForm,
    strongHomeStats,
    weakAwayStats,
  ),
  "match-example-1": fixture(
    "match-example-1",
    "Liverpool",
    "Chelsea",
    "2026-08-01T19:30:00Z",
    strongHomeForm,
    weakAwayForm,
    strongHomeStats,
    weakAwayStats,
  ),
  "match-example-2": fixture(
    "match-example-2",
    "Arsenal",
    "Manchester City",
    "2026-08-01T20:00:00Z",
    balancedHomeForm,
    balancedAwayForm,
    balancedHomeStats,
    balancedAwayStats,
  ),
  "match-example-3": fixture(
    "match-example-3",
    "Barcelona",
    "Real Madrid",
    "2026-08-01T20:30:00Z",
    strongHomeForm,
    balancedAwayForm,
    strongHomeStats,
    balancedAwayStats,
  ),
  "match-example-4": fixture(
    "match-example-4",
    "Bayern Munich",
    "Borussia Dortmund",
    "2026-08-01T18:30:00Z",
    balancedHomeForm,
    weakAwayForm,
    balancedHomeStats,
    weakAwayStats,
  ),
  "match-example-5": fixture(
    "match-example-5",
    "PSG",
    "Marseille",
    "2026-08-01T21:00:00Z",
    strongHomeForm,
    weakAwayForm,
    strongHomeStats,
    weakAwayStats,
  ),
  "match-example-6": fixture(
    "match-example-6",
    "Inter Milan",
    "Juventus",
    "2026-08-01T19:45:00Z",
    balancedHomeForm,
    balancedAwayForm,
    balancedHomeStats,
    balancedAwayStats,
  ),
});

export class FixtureProvider {
  getMatch(matchId: string): FixtureMatch | undefined {
    return fixtureMatches[matchId];
  }
}
