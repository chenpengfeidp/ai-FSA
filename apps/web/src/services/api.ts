import axios from "axios";
import type {
  AnalysisReportDto,
  AnalyzeMatchResponseDto,
  BackendErrorResponseDto,
} from "../types/analysis";
import type { EvidenceByMatchResponseDto, EvidenceDto } from "../types/evidence";
import type {
  MatchSummary,
  UpcomingMatchDto,
  UpcomingMatchesResponseDto,
} from "../types/match-center";

const apiClient = axios.create({
  headers: {
    Accept: "application/json",
  },
});

function isBackendErrorResponse(
  value: AnalyzeMatchResponseDto | EvidenceByMatchResponseDto | unknown,
): value is BackendErrorResponseDto {
  if (typeof value !== "object" || value === null || !("ok" in value)) {
    return false;
  }

  return value.ok === false;
}

function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as unknown;

    if (isBackendErrorResponse(responseData)) {
      return responseData.error.message;
    }

    if (error.message.length > 0) {
      return error.message;
    }
  }

  return error instanceof Error ? error.message : fallback;
}

export async function analyzeMatch(matchId: string): Promise<AnalysisReportDto> {
  try {
    const response = await apiClient.post<AnalyzeMatchResponseDto>(
      `/api/analyze/match/${encodeURIComponent(matchId)}`,
    );

    if (isBackendErrorResponse(response.data)) {
      throw new Error(response.data.error.message);
    }

    return response.data;
  } catch (error: unknown) {
    throw new Error(errorMessage(error, "Unable to analyze the match."));
  }
}

export async function getEvidenceByMatch(
  matchId: string,
): Promise<readonly EvidenceDto[]> {
  try {
    const response = await apiClient.get<EvidenceByMatchResponseDto>(
      `/api/evidence/match/${encodeURIComponent(matchId)}`,
    );

    if (isBackendErrorResponse(response.data)) {
      throw new Error(response.data.error.message);
    }

    return response.data.value;
  } catch (error: unknown) {
    throw new Error(errorMessage(error, "Unable to load match evidence."));
  }
}

function formatKickoffTime(kickoff: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(kickoff);

  if (match === null) {
    return kickoff;
  }

  return `${match[4]}:${match[5]}`;
}

export function toMatchSummary(row: UpcomingMatchDto): MatchSummary {
  return Object.freeze({
    id: row.matchId,
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    kickoffTime: formatKickoffTime(row.kickoff),
    competition: row.competition,
    status: "SCHEDULED",
    analyzable: row.analyzable,
  });
}

export async function getUpcomingMatches(): Promise<readonly MatchSummary[]> {
  try {
    const response = await apiClient.get<UpcomingMatchesResponseDto>(
      "/api/matches/upcoming",
    );
    const body = response.data;

    if (body.ok === false) {
      throw new Error(body.error.message);
    }

    return Object.freeze(body.value.map(toMatchSummary));
  } catch (error: unknown) {
    throw new Error(errorMessage(error, "Unable to load upcoming matches."));
  }
}
