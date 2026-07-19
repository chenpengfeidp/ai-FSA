import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisDashboard } from "../src/components/analysis-dashboard";
import {
  ANALYSIS_HISTORY_STORAGE_KEY,
  clearAnalysisHistoryCacheForTests,
  writeAnalysisHistory,
} from "../src/lib/analysis-history";
import type { AnalysisHistoryEntry } from "../src/types/dashboard";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

const historyEntry: AnalysisHistoryEntry = {
  matchId: "match-example-1",
  homeTeam: "Liverpool",
  awayTeam: "Chelsea",
  kickoffTime: "19:30",
  competition: "Premier League",
  analyzedAt: "2026-08-01T19:30:00.000Z",
  reportId: "report-match-example-1",
  evidenceCount: 1,
  featureCount: 3,
  ruleCount: 3,
};

function renderDashboard(): void {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <AnalysisDashboard />
    </QueryClientProvider>,
  );
}

describe("AnalysisDashboard", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearAnalysisHistoryCacheForTests();
  });

  afterEach(() => {
    cleanup();
    push.mockReset();
    window.localStorage.clear();
    clearAnalysisHistoryCacheForTests();
  });

  it("renders overview metrics, pipeline status, matches, and empty recent state", () => {
    renderDashboard();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "AI Football Analysis Platform",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByText("Imported Matches")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getAllByText("Evidence").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Features").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Rules").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("heading", { name: "Pipeline Status" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Provider")).toBeInTheDocument();
    expect(screen.getByText("Normalizer")).toBeInTheDocument();
    expect(screen.getAllByText("healthy")).toHaveLength(7);
    expect(
      screen.getByRole("heading", { name: "Today's Matches" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Analyze / })).toHaveLength(6);
    expect(screen.getByText("No analysis yet")).toBeInTheDocument();
  });

  it("calculates overview metrics and recent analysis from stored results", () => {
    writeAnalysisHistory([historyEntry]);
    renderDashboard();

    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Liverpool vs Chelsea")).toBeInTheDocument();
    expect(screen.getByText("Kickoff 19:30")).toBeInTheDocument();
    expect(screen.getByText(/Analyzed /)).toBeInTheDocument();
    expect(window.localStorage.getItem(ANALYSIS_HISTORY_STORAGE_KEY)).not.toBeNull();
  });

  it("navigates to Match Detail from a recent analysis item", async () => {
    writeAnalysisHistory([historyEntry]);
    const user = userEvent.setup();
    renderDashboard();

    await user.click(
      screen.getByRole("button", {
        name: "Open analysis for Liverpool vs Chelsea",
      }),
    );

    expect(push).toHaveBeenCalledWith("/matches/match-example-1");
  });

  it("navigates to the Match Detail route when Analyze is clicked", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(
      screen.getByRole("button", {
        name: "Analyze Liverpool vs Chelsea",
      }),
    );

    expect(push).toHaveBeenCalledWith("/matches/match-example-1");
  });
});
