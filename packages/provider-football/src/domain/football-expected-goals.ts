/**
 * Provider-football Expected Goals Evidence contract (F1.3A).
 *
 * Every metric is optional and present only when the provider supplies it.
 * Never estimate, derive, or fabricate xG/xGA from shots or goals.
 */

export type FootballExpectedGoalsSide = "home" | "away";

export type FootballExpectedGoalsWindow =
  | "overall"
  | "home"
  | "away"
  | "recent"
  | "last5"
  | "last10"
  | "fixture";

/**
 * Optional numeric metrics for one team within one window/scope.
 * Absent fields mean honest absence — never invent zeros as evidence.
 */
export type FootballExpectedGoalsMetrics = Readonly<{
  xg?: number;
  xga?: number;
  nonPenaltyXg?: number;
  nonPenaltyXga?: number;
  expectedPoints?: number;
  expectedGoalDifference?: number;
}>;

export type FootballExpectedGoalsRecord = Readonly<{
  teamId: string;
  teamName: string;
  teamSide: FootballExpectedGoalsSide;
  competitionId?: string;
  competitionName?: string;
  season?: string;
  /** Window / venue / fixture scope for this record. */
  window: FootballExpectedGoalsWindow;
  metrics: FootballExpectedGoalsMetrics;
  /** ISO-8601 instant when the provider observation was captured. */
  observedAt: string;
  providerMethod: "http-live" | "recorded-snapshot";
}>;
