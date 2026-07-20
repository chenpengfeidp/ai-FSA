/**
 * FAS Football Domain Model for provider-football.
 * Adapters map vendor payloads into these types; Evidence never sees raw vendor JSON.
 */

export type FootballProviderMethod = "http-live" | "recorded-snapshot";

/** Stadium / ground identity for a fixture (F1.1B-1 Venue Evidence). */
export interface FootballVenue {
  readonly venueId: string | undefined;
  readonly name: string;
  readonly city: string | undefined;
}

export interface FootballFixture {
  readonly fixtureId: string;
  readonly matchId: string;
  readonly competitionId: string;
  readonly competitionName: string;
  readonly season: number;
  readonly kickoff: string;
  readonly homeTeamId: string;
  readonly homeTeamName: string;
  readonly awayTeamId: string;
  readonly awayTeamName: string;
  readonly status: "SCHEDULED" | "FINISHED" | "OTHER";
  readonly venue: FootballVenue | undefined;
  readonly providerMethod: FootballProviderMethod;
}

export type FootballResultCode = "D" | "L" | "W";

export interface FootballTeamForm {
  readonly teamId: string;
  readonly teamName: string;
  readonly teamSide: "away" | "home";
  readonly window: number;
  readonly results: readonly FootballResultCode[];
  readonly goalsFor: readonly number[];
  readonly goalsAgainst: readonly number[];
  readonly providerMethod: FootballProviderMethod;
}

/**
 * Team aggregate stats for evidence STATISTICS.
 * xG fields may be zero / unavailable in F.1 (true xG is F.1.1).
 */
export interface FootballTeamStats {
  readonly teamId: string;
  readonly teamName: string;
  readonly teamSide: "away" | "home";
  readonly windowMatches: number;
  readonly shotsForPerMatch: number;
  readonly shotsAgainstPerMatch: number;
  readonly xgForPerMatch: number;
  readonly xgAgainstPerMatch: number;
  readonly providerMethod: FootballProviderMethod;
  readonly statsBasis: "shots" | "goals-proxy-fallback";
}

export interface FootballH2HMeeting {
  readonly playedAt: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
}

export interface FootballH2H {
  readonly homeTeamId: string;
  readonly awayTeamId: string;
  readonly sampleSize: number;
  readonly meetings: readonly FootballH2HMeeting[];
  readonly providerMethod: FootballProviderMethod;
}

export interface FootballStandingRow {
  readonly rank: number;
  readonly teamId: string;
  readonly teamName: string;
  readonly played: number;
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly points: number;
}

export interface FootballStandings {
  readonly competitionId: string;
  readonly competitionName: string;
  readonly season: number;
  readonly rows: readonly FootballStandingRow[];
  readonly providerMethod: FootballProviderMethod;
}

/** Analyzable bundle used by MatchLookup → Evidence normalizer. */
export interface FootballMatchBundle {
  readonly fixture: FootballFixture;
  readonly homeForm: FootballTeamForm;
  readonly awayForm: FootballTeamForm;
  readonly homeStats: FootballTeamStats;
  readonly awayStats: FootballTeamStats;
  readonly headToHead: FootballH2H;
  readonly standings: FootballStandings | undefined;
}

export interface FootballBoardRow {
  readonly matchId: string;
  readonly fixtureId: string;
  readonly competitionId: string;
  readonly competition: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoff: string;
  readonly analyzable: boolean;
  readonly providerSource: "api-football";
  readonly providerMethod: FootballProviderMethod;
}
