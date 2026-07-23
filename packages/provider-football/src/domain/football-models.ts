/**
 * FAS Football Domain Model for provider-football.
 * Adapters map vendor payloads into these types; Evidence never sees raw vendor JSON.
 */

import type { FootballExpectedGoalsRecord } from "./football-expected-goals.js";
import type { FootballMatchContextRecord } from "./football-match-context.js";

export type { FootballExpectedGoalsRecord } from "./football-expected-goals.js";
export type {
  FootballExpectedGoalsMetrics,
  FootballExpectedGoalsSide,
  FootballExpectedGoalsWindow,
} from "./football-expected-goals.js";
export type { FootballMatchContextRecord } from "./football-match-context.js";
export type {
  FootballCompetitionKind,
  FootballMatchContextMetrics,
  FootballMatchContextSide,
  FootballMatchLeg,
} from "./football-match-context.js";

export type FootballProviderMethod = "http-live" | "recorded-snapshot";

/** Stadium / ground identity for a fixture (F1.1B-1 Venue Evidence). */
export interface FootballVenue {
  readonly venueId: string | undefined;
  readonly name: string;
  readonly city: string | undefined;
}

/**
 * Basic player identity for a match context (F1.1C-1).
 * No statistics, rating, injury, or lineup status.
 */
export interface FootballPlayer {
  readonly playerId: string;
  readonly name: string;
  readonly teamId: string;
  readonly teamName: string;
  readonly teamSide: "away" | "home";
  readonly position: string | undefined;
  readonly number: number | undefined;
  readonly nationality: string | undefined;
  readonly photoUrl: string | undefined;
  readonly providerMethod: FootballProviderMethod;
}

/** Injury or suspension absence row (F1.1D). Not Expected Lineup. */
export type FootballAvailabilityKind = "injury" | "suspension";

export interface FootballAvailabilityAbsence {
  readonly playerId: string;
  readonly playerName: string;
  readonly teamId: string;
  readonly teamName: string;
  readonly teamSide: "away" | "home";
  readonly kind: FootballAvailabilityKind;
  readonly reason: string | undefined;
  readonly providerMethod: FootballProviderMethod;
}

/**
 * Referee facts from the fixture payload only (F1.1E).
 * Never estimate country/league/statistics when the provider omits them.
 */
export interface FootballRefereeStatistics {
  readonly appearances: number | undefined;
  readonly yellowCardsPerMatch: number | undefined;
  readonly redCardsPerMatch: number | undefined;
}

export interface FootballReferee {
  readonly name: string;
  readonly country: string | undefined;
  readonly league: string | undefined;
  readonly statistics: FootballRefereeStatistics | undefined;
}

/** Confirmed lineup player row from `/fixtures/lineups` (not Expected Lineup). */
export interface FootballLineupPlayer {
  readonly playerId: string;
  readonly name: string;
  readonly number: number | undefined;
  readonly position: string | undefined;
  readonly grid: string | undefined;
}

/** Confirmed team lineup sheet. Absent when provider has not published XI. */
export interface FootballTeamLineup {
  readonly teamId: string;
  readonly teamName: string;
  readonly teamSide: "away" | "home";
  readonly formation: string | undefined;
  readonly startXI: readonly FootballLineupPlayer[];
  readonly substitutes: readonly FootballLineupPlayer[];
  readonly providerMethod: FootballProviderMethod;
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
  readonly referee: FootballReferee | undefined;
  readonly providerMethod: FootballProviderMethod;
}

export type FootballResultCode = "D" | "L" | "W";

/** Venue-split or short-window form slice derived from finished fixtures. */
export interface FootballFormSplit {
  readonly window: number;
  readonly results: readonly FootballResultCode[];
  readonly goalsFor: readonly number[];
  readonly goalsAgainst: readonly number[];
}

export interface FootballTeamForm {
  readonly teamId: string;
  readonly teamName: string;
  readonly teamSide: "away" | "home";
  readonly window: number;
  readonly results: readonly FootballResultCode[];
  readonly goalsFor: readonly number[];
  readonly goalsAgainst: readonly number[];
  /** Form in matches where this team was home (when sample exists). */
  readonly homeSplit: FootballFormSplit | undefined;
  /** Form in matches where this team was away (when sample exists). */
  readonly awaySplit: FootballFormSplit | undefined;
  readonly goalsScoredPerMatch: number;
  readonly goalsConcededPerMatch: number;
  /** Most-recent short window (≤3) when overall window ≥ 3. */
  readonly recentShort: FootballFormSplit | undefined;
  readonly providerMethod: FootballProviderMethod;
}

/**
 * Optional advanced team statistics (F1.2a).
 * Only provider-supplied metrics are present; missing keys mean honest absence.
 * Never fabricate Expected / estimated values.
 */
export type FootballAdvancedStatsScope = "fixture" | "season-average";

export interface FootballAdvancedTeamStats {
  readonly scope: FootballAdvancedStatsScope;
  readonly shotsTotal: number | undefined;
  readonly shotsOnTarget: number | undefined;
  readonly shotsOffTarget: number | undefined;
  readonly possessionPct: number | undefined;
  readonly corners: number | undefined;
  readonly yellowCards: number | undefined;
  readonly redCards: number | undefined;
  readonly attacks: number | undefined;
  readonly dangerousAttacks: number | undefined;
  readonly fouls: number | undefined;
  readonly saves: number | undefined;
  readonly passingAccuracyPct: number | undefined;
}

/**
 * Team aggregate stats for evidence STATISTICS.
 * Base shots/xG fields remain F.1-compatible; advanced is F1.2a optional.
 * True provider xG lives on FootballMatchBundle.expectedGoals (F1.3A).
 * STATISTICS xG fields stay zero until F1.3B Feature consume — never fabricate.
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
  /** Advanced measurements when the provider supplies any of them. */
  readonly advanced: FootballAdvancedTeamStats | undefined;
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
  /** Basic squad players for both sides (may be empty when unavailable). */
  readonly players: readonly FootballPlayer[];
  /**
   * Injury/suspension absences for the fixture (may be empty when unavailable).
   * Empty means honest absence — not “everyone available”.
   */
  readonly availabilityAbsences: readonly FootballAvailabilityAbsence[];
  /**
   * Confirmed lineups when `/fixtures/lineups` returns sheets.
   * Empty means honest absence — never Expected Lineup.
   */
  readonly lineups: readonly FootballTeamLineup[];
  /**
   * Provider-supplied Expected Goals records (F1.3A Evidence only).
   * Empty means honest absence — never estimate from shots/goals.
   */
  readonly expectedGoals: readonly FootballExpectedGoalsRecord[];
  /**
   * Match Context records (I1A Evidence only).
   * Empty means honest absence — never invent rest/travel/knockout facts.
   */
  readonly matchContext: readonly FootballMatchContextRecord[];
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
