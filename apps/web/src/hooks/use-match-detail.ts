"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { analyzeMatch, getEvidenceByMatch } from "../services/api";
import type { AnalysisReportDto } from "../types/analysis";
import type { EvidenceDto } from "../types/evidence";

export interface MatchDetailData {
  readonly evidence: readonly EvidenceDto[];
  readonly report: AnalysisReportDto;
}

export function useMatchDetail(
  matchId: string | undefined,
  enabled: boolean,
): UseQueryResult<MatchDetailData, Error> {
  return useQuery({
    enabled: enabled && matchId !== undefined && matchId.length > 0,
    queryKey: ["match-detail", matchId],
    queryFn: async (): Promise<MatchDetailData> => {
      if (matchId === undefined) {
        throw new Error("Match ID is required.");
      }

      const report = await analyzeMatch(matchId);
      const evidence = await getEvidenceByMatch(matchId);

      return { evidence, report };
    },
    retry: false,
  });
}
