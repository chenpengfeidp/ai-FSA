"use client";

import { useQuery } from "@tanstack/react-query";
import { getUpcomingMatches } from "../services/api";
import type {
  FootballDataProviderModeLabel,
  MatchSummary,
  OddsProviderModeLabel,
  ScheduleSourceLabel,
} from "../types/match-center";

export function useUpcomingMatches(): {
  readonly matches: readonly MatchSummary[];
  readonly oddsProviderMode: OddsProviderModeLabel | undefined;
  readonly footballDataProviderMode: FootballDataProviderModeLabel | undefined;
  readonly scheduleSource: ScheduleSourceLabel | undefined;
  readonly usedRecordedFallback: boolean;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly errorMessage: string | undefined;
} {
  const query = useQuery({
    queryKey: ["matches", "upcoming"],
    queryFn: getUpcomingMatches,
  });

  return {
    matches: query.data?.matches ?? [],
    oddsProviderMode: query.data?.meta.oddsProviderMode,
    footballDataProviderMode: query.data?.meta.footballDataProviderMode,
    scheduleSource: query.data?.meta.scheduleSource,
    usedRecordedFallback: query.data?.meta.usedRecordedFallback === true,
    isLoading: query.isLoading,
    isError: query.isError,
    errorMessage: query.error instanceof Error ? query.error.message : undefined,
  };
}
