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

const upcomingMatches: readonly MatchSummary[] = Object.freeze([
  Object.freeze({
    id: "match-example-1",
    homeTeam: "Liverpool",
    awayTeam: "Chelsea",
    kickoffTime: "19:30",
    competition: "EPL",
    status: "SCHEDULED" as const,
    analyzable: true,
  }),
  Object.freeze({
    id: "match-example-2",
    homeTeam: "Arsenal",
    awayTeam: "Coventry City",
    kickoffTime: "19:00",
    competition: "EPL",
    status: "SCHEDULED" as const,
    analyzable: true,
  }),
  Object.freeze({
    id: "odds:evt_unmapped",
    homeTeam: "Tottenham Hotspur",
    awayTeam: "Everton",
    kickoffTime: "14:00",
    competition: "EPL",
    status: "SCHEDULED" as const,
    analyzable: false,
  }),
  Object.freeze({
    id: "match-example-3",
    homeTeam: "Barcelona",
    awayTeam: "Real Madrid",
    kickoffTime: "20:30",
    competition: "La Liga",
    status: "SCHEDULED" as const,
    analyzable: true,
  }),
  Object.freeze({
    id: "match-example-4",
    homeTeam: "Bayern Munich",
    awayTeam: "Borussia Dortmund",
    kickoffTime: "18:30",
    competition: "Bundesliga",
    status: "SCHEDULED" as const,
    analyzable: true,
  }),
  Object.freeze({
    id: "match-example-5",
    homeTeam: "PSG",
    awayTeam: "Marseille",
    kickoffTime: "21:00",
    competition: "Ligue 1",
    status: "SCHEDULED" as const,
    analyzable: true,
  }),
  Object.freeze({
    id: "match-example-6",
    homeTeam: "Inter Milan",
    awayTeam: "Juventus",
    kickoffTime: "19:45",
    competition: "Serie A",
    status: "SCHEDULED" as const,
    analyzable: true,
  }),
]);

vi.mock("../src/services/api", async () => {
  const actual =
    await vi.importActual<typeof import("../src/services/api")>(
      "../src/services/api",
    );

  return {
    ...actual,
    getUpcomingMatches: vi.fn(async () => upcomingMatches),
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

  it("renders hero, matches, recent, overview, and pipeline in landing order", async () => {
    renderDashboard();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: zh.hero.title,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(zh.hero.eyebrow)).toBeInTheDocument();
    expect(screen.getByText(zh.hero.description)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: zh.hero.analyzeToday }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: zh.hero.viewRecentReports }),
    ).toHaveAttribute("href", "/reports");
    expect(screen.getByRole("link", { name: zh.nav.reports })).toHaveAttribute(
      "href",
      "/reports",
    );

    expect(
      screen.getByRole("heading", { name: zh.matchCenter.upcomingHeading }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /^分析 .+ vs .+$/ }),
      ).toHaveLength(6);
    });
    expect(
      screen.getByRole("button", {
        name: zh.matchCard.evidenceIncompleteAria("Tottenham Hotspur vs Everton"),
      }),
    ).toBeDisabled();
    expect(screen.getAllByText(zh.matchCard.vs).length).toBeGreaterThanOrEqual(7);

    expect(screen.getByText(zh.recentAnalysis.emptyTitle)).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: zh.overview.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(zh.overview.importedMatches)).toBeInTheDocument();
    expect(screen.getAllByText(zh.overview.reports).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(zh.overview.evidence).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(zh.overview.features).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(zh.overview.rules).length).toBeGreaterThanOrEqual(1);

    expect(
      screen.getByRole("heading", { name: zh.pipeline.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(zh.pipeline.stages.provider)).toBeInTheDocument();
    expect(screen.getByText(zh.pipeline.stages.normalizer)).toBeInTheDocument();
    expect(screen.getAllByText(zh.pipeline.healthy)).toHaveLength(7);

    const headings = screen.getAllByRole("heading").map((node) => node.textContent);
    expect(headings.indexOf(zh.hero.title)).toBeLessThan(
      headings.indexOf(zh.matchCenter.upcomingHeading),
    );
    expect(headings.indexOf(zh.matchCenter.upcomingHeading)).toBeLessThan(
      headings.indexOf(zh.recentAnalysis.heading),
    );
    expect(headings.indexOf(zh.recentAnalysis.heading)).toBeLessThan(
      headings.indexOf(zh.overview.heading),
    );
    expect(headings.indexOf(zh.overview.heading)).toBeLessThan(
      headings.indexOf(zh.pipeline.heading),
    );
  });

  it("calculates overview metrics and recent analysis from stored results", async () => {
    writeAnalysisHistory([historyEntry]);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Liverpool vs Chelsea")).toBeInTheDocument();
    });
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(zh.recentAnalysis.completed)).toBeInTheDocument();
    expect(screen.getByText(/UTC/)).toBeInTheDocument();
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
