import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisDashboard } from "../src/components/analysis-dashboard";
import { zh } from "../src/copy/zh";
import {
  ANALYSIS_HISTORY_STORAGE_KEY,
  clearAnalysisHistoryCacheForTests,
  writeAnalysisHistory,
} from "../src/lib/analysis-history";
import { addLocalDays, formatLocalDate } from "../src/lib/match-center-filter";
import type { AnalysisHistoryEntry } from "../src/types/dashboard";
import type { MatchSummary } from "../src/types/match-center";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function kickoffInDays(days: number, hour = "19:30:00"): string {
  return `${formatLocalDate(addLocalDays(new Date(), days))}T${hour}`;
}

const upcomingMatches: readonly MatchSummary[] = Object.freeze([
  Object.freeze({
    id: "match-example-1",
    homeTeam: "Liverpool",
    awayTeam: "Chelsea",
    kickoff: kickoffInDays(0),
    kickoffTime: "today",
    competition: "EPL",
    status: "SCHEDULED" as const,
    analyzable: true,
    providerSource: "the-odds-api",
  }),
  Object.freeze({
    id: "match-example-2",
    homeTeam: "Arsenal",
    awayTeam: "Coventry City",
    kickoff: kickoffInDays(1),
    kickoffTime: "tomorrow",
    competition: "EPL",
    status: "SCHEDULED" as const,
    analyzable: true,
    providerSource: "the-odds-api",
  }),
  Object.freeze({
    id: "odds:evt_unmapped",
    homeTeam: "Tottenham Hotspur",
    awayTeam: "Everton",
    kickoff: kickoffInDays(2, "14:00:00"),
    kickoffTime: "day-after",
    competition: "EPL",
    status: "SCHEDULED" as const,
    analyzable: false,
    providerSource: "the-odds-api",
  }),
  Object.freeze({
    id: "match-example-3",
    homeTeam: "Barcelona",
    awayTeam: "Real Madrid",
    kickoff: kickoffInDays(0, "20:30:00"),
    kickoffTime: "demo-today",
    competition: "La Liga",
    status: "SCHEDULED" as const,
    analyzable: true,
    providerSource: "fixture",
  }),
  Object.freeze({
    id: "match-example-4",
    homeTeam: "Bayern Munich",
    awayTeam: "Borussia Dortmund",
    kickoff: "2026-08-01T18:30:00Z",
    kickoffTime: "far",
    competition: "Bundesliga",
    status: "SCHEDULED" as const,
    analyzable: true,
    providerSource: "fixture",
  }),
]);

vi.mock("../src/services/api", async () => {
  const actual =
    await vi.importActual<typeof import("../src/services/api")>(
      "../src/services/api",
    );

  return {
    ...actual,
    getUpcomingMatches: vi.fn(async () =>
      Object.freeze({
        matches: upcomingMatches,
        meta: Object.freeze({ oddsProviderMode: "recorded" as const }),
      }),
    ),
  };
});

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

  it("renders hero, filtered matches, recent, overview, and pipeline in landing order", async () => {
    renderDashboard();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: zh.hero.title,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: zh.matchCenter.upcomingHeading }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(zh.matchCenter.modeRecorded)).toBeInTheDocument();
      expect(
        screen.getAllByRole("button", { name: /^分析 .+ vs .+$/ }),
      ).toHaveLength(2);
    });
    expect(
      screen.getByRole("button", {
        name: zh.matchCard.evidenceIncompleteAria("Tottenham Hotspur vs Everton"),
      }),
    ).toBeDisabled();
    expect(screen.queryByText("Barcelona")).not.toBeInTheDocument();

    expect(screen.getByText(zh.recentAnalysis.emptyTitle)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: zh.overview.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: zh.pipeline.heading }),
    ).toBeInTheDocument();
  });

  it("can include fixture demos inside the selected window", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(zh.matchCenter.modeRecorded)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(zh.matchCenter.includeDemos));

    await waitFor(() => {
      expect(screen.getByText("Barcelona")).toBeInTheDocument();
    });
  });

  it("calculates overview metrics and recent analysis from stored results", async () => {
    writeAnalysisHistory([historyEntry]);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Liverpool vs Chelsea")).toBeInTheDocument();
    });
    expect(screen.getByText(zh.recentAnalysis.completed)).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: zh.recentAnalysis.openAnalysisAria("Liverpool", "Chelsea"),
      }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem(ANALYSIS_HISTORY_STORAGE_KEY)).not.toBeNull();
  });

  it("navigates to Match Detail from a recent analysis item", async () => {
    writeAnalysisHistory([historyEntry]);
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: zh.recentAnalysis.openAnalysisAria("Liverpool", "Chelsea"),
        }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", {
        name: zh.recentAnalysis.openAnalysisAria("Liverpool", "Chelsea"),
      }),
    );

    expect(push).toHaveBeenCalledWith("/matches/match-example-1");
  });

  it("navigates to the Analysis Session route when Analyze is clicked", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: zh.matchCard.analyzeAria("Liverpool vs Chelsea"),
        }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", {
        name: zh.matchCard.analyzeAria("Liverpool vs Chelsea"),
      }),
    );

    expect(push).toHaveBeenCalledWith("/matches/match-example-1/session");
  });
});
