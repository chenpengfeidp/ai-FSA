export type MatchStatus = "ANALYZED" | "FAILED" | "LOADING" | "SCHEDULED";

export interface MatchSummary {
  readonly id: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoffTime: string;
  readonly competition: string;
  readonly status: MatchStatus;
}
