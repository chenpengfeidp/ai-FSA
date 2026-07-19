export type MatchStatus = "ANALYZED" | "FAILED" | "LOADING" | "SCHEDULED";

export interface MatchSummary {
  readonly id: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoffTime: string;
  readonly competition: string;
  readonly status: MatchStatus;
  /** False for Odds-calendar rows without fixture evidence in this slice. */
  readonly analyzable?: boolean;
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
