/**
 * Provider-football Match Context Evidence contract (I1A).
 *
 * Every metric is optional and present only when the provider schedule /
 * fixture payload supplies the underlying facts. Never invent rest, travel
 * distance, knockout stage, or aggregate score.
 */

export type FootballMatchContextSide = "home" | "away";

export type FootballCompetitionKind = "cup" | "friendly" | "league" | "other";

export type FootballMatchLeg = "first" | "second";

/**
 * Optional Context metrics for one team in one match.
 * Absent fields mean honest absence.
 */
export type FootballMatchContextMetrics = Readonly<{
  /** Whole days of rest before kickoff from last finished match. */
  restDays?: number;
  /** Same schedule fact as restDays when a prior match exists. */
  daysSinceLastMatch?: number;
  /** Whole days until the next scheduled match after kickoff. */
  daysUntilNextMatch?: number;
  matchesInLast7Days?: number;
  matchesInLast14Days?: number;
  /** Schedule density count (= matchesInLast7Days when that count is known). */
  fixtureCongestion?: number;
  homeAwayContext?: FootballMatchContextSide;
  /** Home/away travel posture only — never distance/km. */
  travelContext?: FootballMatchContextSide;
  venueCity?: string;
  competitionKind?: FootballCompetitionKind;
  /** Raw provider competition type label when supplied. */
  competitionTypeLabel?: string;
  isKnockout?: boolean;
  roundLabel?: string;
  leg?: FootballMatchLeg;
  aggregateScore?: string;
}>;

export type FootballMatchContextRecord = Readonly<{
  teamId: string;
  teamName: string;
  teamSide: FootballMatchContextSide;
  matchId: string;
  competitionId?: string;
  competitionName?: string;
  season?: string;
  metrics: FootballMatchContextMetrics;
  /** ISO-8601 instant for the observation (typically fixture kickoff). */
  observedAt: string;
  providerMethod: "http-live" | "recorded-snapshot";
}>;
