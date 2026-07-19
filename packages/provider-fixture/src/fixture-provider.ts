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

/** Meetings oriented to the current fixture: homeGoals/awayGoals are for the current home/away sides. */
export interface FixtureHeadToHeadMeeting {
  readonly playedAt: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
}

export interface FixtureHeadToHead {
  readonly sampleSize: number;
  readonly meetings: readonly FixtureHeadToHeadMeeting[];
}

/** Decimal 1X2 odds observed at a point in time — market signal, not ground truth. */
export interface FixtureOdds {
  readonly homeOdds: number;
  readonly drawOdds: number;
  readonly awayOdds: number;
  readonly observedAt: string;
}

export interface FixtureMatch {
  readonly matchId: string;
  readonly home: string;
  readonly away: string;
  readonly kickoff: string;
  readonly teamForm: readonly FixtureTeamForm[];
  readonly statistics: readonly FixtureStatistics[];
  readonly headToHead: FixtureHeadToHead;
  readonly odds: FixtureOdds;
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

function h2h(meetings: readonly FixtureHeadToHeadMeeting[]): FixtureHeadToHead {
  return Object.freeze({
    sampleSize: meetings.length,
    meetings: Object.freeze(
      meetings.map((meeting) => Object.freeze({ ...meeting })),
    ),
  });
}

function odds(
  homeOdds: number,
  drawOdds: number,
  awayOdds: number,
  observedAt = "2026-07-18T12:00:00Z",
): FixtureOdds {
  return Object.freeze({
    homeOdds,
    drawOdds,
    awayOdds,
    observedAt,
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
  headToHead: FixtureHeadToHead,
  matchOdds: FixtureOdds,
): FixtureMatch {
  return Object.freeze({
    matchId,
    home,
    away,
    kickoff,
    teamForm: Object.freeze([homeForm, awayForm]),
    statistics: Object.freeze([homeStats, awayStats]),
    headToHead,
    odds: matchOdds,
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

const homeLeanH2h = h2h([
  { playedAt: "2025-12-01T15:00:00Z", homeGoals: 2, awayGoals: 0 },
  { playedAt: "2025-05-10T15:00:00Z", homeGoals: 1, awayGoals: 0 },
  { playedAt: "2024-11-20T15:00:00Z", homeGoals: 2, awayGoals: 1 },
  { playedAt: "2024-04-02T15:00:00Z", homeGoals: 1, awayGoals: 1 },
  { playedAt: "2023-10-15T15:00:00Z", homeGoals: 3, awayGoals: 1 },
]);
const balancedH2h = h2h([
  { playedAt: "2025-12-01T15:00:00Z", homeGoals: 1, awayGoals: 1 },
  { playedAt: "2025-05-10T15:00:00Z", homeGoals: 0, awayGoals: 1 },
  { playedAt: "2024-11-20T15:00:00Z", homeGoals: 2, awayGoals: 2 },
  { playedAt: "2024-04-02T15:00:00Z", homeGoals: 1, awayGoals: 0 },
]);
const awayLeanH2h = h2h([
  { playedAt: "2025-12-01T15:00:00Z", homeGoals: 0, awayGoals: 2 },
  { playedAt: "2025-05-10T15:00:00Z", homeGoals: 1, awayGoals: 2 },
  { playedAt: "2024-11-20T15:00:00Z", homeGoals: 0, awayGoals: 1 },
  { playedAt: "2024-04-02T15:00:00Z", homeGoals: 1, awayGoals: 1 },
]);

/** Aligned with strong-home football lean. */
const homeFavoredOdds = odds(1.55, 4.2, 5.8);
/** Conflicts with strong-home football / H2H lean — market prices away. */
const awayFavoredOddsConflict = odds(3.6, 3.4, 2.05);
const balancedOdds = odds(2.4, 3.3, 2.9);
const slightAwayOdds = odds(2.9, 3.3, 2.35);

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
    homeLeanH2h,
    homeFavoredOdds,
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
    homeLeanH2h,
    awayFavoredOddsConflict,
  ),
  "match-example-2": fixture(
    "match-example-2",
    "Arsenal",
    "Coventry City",
    "2026-08-21T19:00:00Z",
    strongHomeForm,
    weakAwayForm,
    strongHomeStats,
    weakAwayStats,
    homeLeanH2h,
    homeFavoredOdds,
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
    homeLeanH2h,
    homeFavoredOdds,
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
    awayLeanH2h,
    slightAwayOdds,
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
    homeLeanH2h,
    homeFavoredOdds,
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
    balancedH2h,
    balancedOdds,
  ),
});

export class FixtureProvider {
  getMatch(matchId: string): FixtureMatch | undefined {
    return fixtureMatches[matchId];
  }
}
