"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { analyzeMatch } from "../services/api";
import type { AnalysisReportDto } from "../types/analysis";

export function useAnalyzeMatch(): UseMutationResult<
  AnalysisReportDto,
  Error,
  string
> {
  return useMutation({
    mutationFn: (matchId) => analyzeMatch(matchId),
    retry: false,
  });
}
