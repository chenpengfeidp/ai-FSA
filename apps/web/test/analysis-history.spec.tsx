import { describe, expect, it } from "vitest";
import {
  calculateDashboardMetrics,
  clearAnalysisHistoryCacheForTests,
  recordAnalysisHistoryEntry,
  sortRecentAnalysis,
} from "../src/lib/analysis-history";
import type { AnalysisHistoryEntry } from "../src/types/dashboard";

const first: AnalysisHistoryEntry = {
  matchId: "match-example-1",
  homeTeam: "Liverpool",
  awayTeam: "Chelsea",
  kickoffTime: "19:30",
  competition: "Premier League",
  analyzedAt: "2026-08-01T19:30:00.000Z",
  reportId: "report-1",
  evidenceCount: 1,
  featureCount: 3,
  ruleCount: 3,
};

const second: AnalysisHistoryEntry = {
  matchId: "match-example-2",
  homeTeam: "Arsenal",
  awayTeam: "Manchester City",
  kickoffTime: "20:00",
  competition: "Premier League",
  analyzedAt: "2026-08-01T20:00:00.000Z",
  reportId: "report-2",
  evidenceCount: 1,
  featureCount: 3,
  ruleCount: 3,
};

describe("analysis history metrics", () => {
  it("returns zeroed metrics for an empty history", () => {
    expect(calculateDashboardMetrics([])).toEqual({
      importedMatches: 0,
      evidence: 0,
      features: 0,
      rules: 0,
      reports: 0,
    });
  });

  it("aggregates metrics from analysis results", () => {
    expect(calculateDashboardMetrics([first, second])).toEqual({
      importedMatches: 2,
      evidence: 2,
      features: 6,
      rules: 6,
      reports: 2,
    });
  });

  it("sorts recent analysis by analysis time descending", () => {
    expect(
      sortRecentAnalysis([first, second]).map((entry) => entry.matchId),
    ).toEqual(["match-example-2", "match-example-1"]);
  });

  it("replaces an existing match entry when recording again", () => {
    window.localStorage.clear();
    clearAnalysisHistoryCacheForTests();

    recordAnalysisHistoryEntry(first);
    const updated = recordAnalysisHistoryEntry({
      ...first,
      analyzedAt: "2026-08-01T21:00:00.000Z",
      featureCount: 4,
    });

    expect(updated).toHaveLength(1);
    expect(updated[0]?.featureCount).toBe(4);
    expect(updated[0]?.analyzedAt).toBe("2026-08-01T21:00:00.000Z");
  });
});
