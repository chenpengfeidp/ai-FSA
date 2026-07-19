import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisDashboard } from "../src/components/analysis-dashboard";
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
        name: "AI Football Analysis Platform",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Deterministic Football Intelligence"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Explainable football analysis powered by deterministic pipelines.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Analyze Today's Matches" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View Recent Reports" }),
    ).toHaveAttribute("href", "/reports");
    expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute(
      "href",
      "/reports",
    );

    expect(
      screen.getByRole("heading", { name: "Upcoming Matches" }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /^Analyze .+ vs .+$/ }),
      ).toHaveLength(6);
    });
    expect(
      screen.getByRole("button", {
        name: "Evidence incomplete for Tottenham Hotspur vs Everton",
      }),
    ).toBeDisabled();
    expect(screen.getAllByText("VS").length).toBeGreaterThanOrEqual(7);

    expect(screen.getByText("No analysis yet")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByText("Imported Matches")).toBeInTheDocument();
    expect(screen.getAllByText("Reports").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Evidence").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Features").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Rules").length).toBeGreaterThanOrEqual(1);

    expect(
      screen.getByRole("heading", { name: "Pipeline Status" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Provider")).toBeInTheDocument();
    expect(screen.getByText("Normalizer")).toBeInTheDocument();
    expect(screen.getAllByText("Healthy")).toHaveLength(7);

    const headings = screen.getAllByRole("heading").map((node) => node.textContent);
    expect(headings.indexOf("AI Football Analysis Platform")).toBeLessThan(
      headings.indexOf("Upcoming Matches"),
    );
    expect(headings.indexOf("Upcoming Matches")).toBeLessThan(
      headings.indexOf("Recent Analysis"),
    );
    expect(headings.indexOf("Recent Analysis")).toBeLessThan(
      headings.indexOf("Overview"),
    );
    expect(headings.indexOf("Overview")).toBeLessThan(
      headings.indexOf("Pipeline Status"),
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
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText(/UTC/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open analysis for Liverpool vs Chelsea" }),
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
          name: "Open analysis for Liverpool vs Chelsea",
        }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", {
        name: "Open analysis for Liverpool vs Chelsea",
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
          name: "Analyze Liverpool vs Chelsea",
        }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", {
        name: "Analyze Liverpool vs Chelsea",
      }),
    );

    expect(push).toHaveBeenCalledWith("/matches/match-example-1/session");
  });
});
