"use client";

import { useSyncExternalStore } from "react";
import {
  calculateDashboardMetrics,
  EMPTY_ANALYSIS_HISTORY,
  readAnalysisHistory,
  sortRecentAnalysis,
  subscribeAnalysisHistory,
} from "../lib/analysis-history";
import type { AnalysisHistoryEntry, DashboardMetrics } from "../types/dashboard";

function getServerSnapshot(): readonly AnalysisHistoryEntry[] {
  return EMPTY_ANALYSIS_HISTORY;
}

export function useAnalysisHistory(): {
  readonly entries: readonly AnalysisHistoryEntry[];
  readonly metrics: DashboardMetrics;
  readonly recent: readonly AnalysisHistoryEntry[];
} {
  const entries = useSyncExternalStore(
    subscribeAnalysisHistory,
    readAnalysisHistory,
    getServerSnapshot,
  );

  return {
    entries,
    metrics: calculateDashboardMetrics(entries),
    recent: sortRecentAnalysis(entries),
  };
}
