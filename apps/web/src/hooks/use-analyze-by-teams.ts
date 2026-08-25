"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { analyzeByTeams, type AnalyzeByTeamsInput } from "../services/api";
import type { AnalyzeByTeamsResult } from "../types/analysis";

export function useAnalyzeByTeams(): UseMutationResult<
  AnalyzeByTeamsResult,
  Error,
  AnalyzeByTeamsInput
> {
  return useMutation({
    mutationFn: (input) => analyzeByTeams(input),
  });
}
