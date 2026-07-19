export type ScoresProviderMethod = "http-live" | "recorded-snapshot";

export interface CompletedScoreline {
  readonly eventId: string;
  readonly commenceTime: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
}

export interface TeamFormSide {
  readonly teamSide: "away" | "home";
  readonly window: number;
  readonly results: readonly ("D" | "L" | "W")[];
  readonly goalsFor: readonly number[];
  readonly goalsAgainst: readonly number[];
  readonly providerSource: "the-odds-api";
  readonly providerSourceId: string;
  readonly providerMethod: ScoresProviderMethod;
}

export interface TeamStatisticsSide {
  readonly teamSide: "away" | "home";
  readonly windowMatches: number;
  readonly shotsForPerMatch: number;
  readonly shotsAgainstPerMatch: number;
  readonly xgForPerMatch: number;
  readonly xgAgainstPerMatch: number;
  readonly providerSource: "the-odds-api";
  readonly providerSourceId: string;
  readonly providerMethod: "scores-goals-proxy";
}

export interface ScoresSnapshotSource {
  getCompletedScorelines(): readonly CompletedScoreline[];
}

export interface ScoresSnapshotPrimer {
  ensureScores(): Promise<void>;
}
