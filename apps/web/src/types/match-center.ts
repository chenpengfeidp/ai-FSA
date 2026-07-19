export type MatchStatus = "ANALYZED" | "FAILED" | "LOADING" | "SCHEDULED";

export type OddsProviderModeLabel = "recorded" | "live" | "fixture";

export type FootballDataProviderModeLabel = "recorded" | "live" | "fixture";

export type ScheduleSourceLabel = "football-data" | "odds";

export interface MatchSummary {
  readonly id: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  /** Full ISO kickoff from the board (used for date filtering). */
  readonly kickoff: string;
  /** Display label: local date + time. */
  readonly kickoffTime: string;
  readonly competition: string;
  readonly status: MatchStatus;
  /** False for Odds-calendar rows without fixture evidence in this slice. */
  readonly analyzable?: boolean;
  readonly providerSource?: "api-football" | "fixture" | "the-odds-api" | string;
}

export interface UpcomingMatchesMeta {
  readonly oddsProviderMode: OddsProviderModeLabel;
  readonly footballDataProviderMode?: FootballDataProviderModeLabel;
  readonly scheduleSource?: ScheduleSourceLabel;
  readonly usedRecordedFallback?: boolean;
}

export interface UpcomingMatchDto {
  readonly matchId: string;
  readonly eventId: string;
  readonly sportKey: string;
  readonly competition: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoff: string;
  readonly analyzable: boolean;
  readonly providerSource: string;
  readonly providerMethod: string;
}

export interface UpcomingMatchesSuccessResponseDto {
  readonly ok: true;
  readonly value: readonly UpcomingMatchDto[];
  readonly meta: UpcomingMatchesMeta;
}

export interface UpcomingMatchesErrorResponseDto {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

export type UpcomingMatchesResponseDto =
  | UpcomingMatchesSuccessResponseDto
  | UpcomingMatchesErrorResponseDto;
