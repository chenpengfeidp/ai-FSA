"use client";

import { useQuery } from "@tanstack/react-query";
import { getUpcomingMatches } from "../services/api";
import type { MatchSummary } from "../types/match-center";

export function useUpcomingMatches(): {
  readonly matches: readonly MatchSummary[];
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly errorMessage: string | undefined;
} {
  const query = useQuery({
    queryKey: ["matches", "upcoming"],
    queryFn: getUpcomingMatches,
  });

  return {
    matches: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    errorMessage: query.error instanceof Error ? query.error.message : undefined,
  };
}
