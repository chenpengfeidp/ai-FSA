/**
 * Provider-football Club Intelligence Evidence contract (L1A).
 *
 * Every metric is optional and present only when the provider supplies it.
 * Never estimate, infer, or fabricate standings, form, or manager facts.
 */

export type FootballClubIntelligenceSide = "home" | "away";

/** Season table window vs short current-form window when provider distinguishes. */
export type FootballClubIntelligenceWindow = "season" | "current";

/**
 * Optional numeric / string metrics for one club in one competition season.
 * Absent fields mean honest absence.
 */
export type FootballClubIntelligenceMetrics = Readonly<{
  leagueRank?: number;
  leaguePoints?: number;
  goalDifference?: number;
  goalsScored?: number;
  goalsConceded?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  played?: number;
  homePlayed?: number;
  homeWins?: number;
  homeDraws?: number;
  homeLosses?: number;
  homeGoalsScored?: number;
  homeGoalsConceded?: number;
  awayPlayed?: number;
  awayWins?: number;
  awayDraws?: number;
  awayLosses?: number;
  awayGoalsScored?: number;
  awayGoalsConceded?: number;
  /** Standings form string when the provider supplies it (e.g. WWDLW). */
  currentForm?: string;
  /** Provider description such as promotion / relegation zone label. */
  promotionRelegationStatus?: string;
  managerName?: string;
  /** ISO-8601 calendar date when the manager started at this club. */
  managerStartDate?: string;
  /** Whole days from managerStartDate to observedAt when both are known. */
  managerTenureDays?: number;
}>;

export type FootballClubIntelligenceRecord = Readonly<{
  teamId: string;
  teamName: string;
  teamSide: FootballClubIntelligenceSide;
  competitionId?: string;
  competitionName?: string;
  season?: string;
  window: FootballClubIntelligenceWindow;
  metrics: FootballClubIntelligenceMetrics;
  /** ISO-8601 instant for the observation (typically fixture kickoff). */
  observedAt: string;
  providerMethod: "http-live" | "recorded-snapshot";
}>;

/** Optional manager facts merged into Club Intelligence (never invented). */
export type FootballClubManagerFact = Readonly<{
  teamId: string;
  teamSide: FootballClubIntelligenceSide;
  managerName?: string;
  managerStartDate?: string;
  managerTenureDays?: number;
}>;
