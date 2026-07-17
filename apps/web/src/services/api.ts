import axios from "axios";
import type {
  AnalysisReportDto,
  AnalyzeMatchResponseDto,
  BackendErrorResponseDto,
} from "../types/analysis";

const apiClient = axios.create({
  headers: {
    Accept: "application/json",
  },
});

function isBackendErrorResponse(
  value: AnalyzeMatchResponseDto | unknown,
): value is BackendErrorResponseDto {
  if (typeof value !== "object" || value === null || !("ok" in value)) {
    return false;
  }

  return value.ok === false;
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as unknown;

    if (isBackendErrorResponse(responseData)) {
      return responseData.error.message;
    }

    if (error.message.length > 0) {
      return error.message;
    }
  }

  return error instanceof Error ? error.message : "Unable to analyze the match.";
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
    throw new Error(errorMessage(error));
  }
}
