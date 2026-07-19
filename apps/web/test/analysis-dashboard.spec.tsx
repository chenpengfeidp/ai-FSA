import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
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

  it("renders hero, matches, recent, overview, and pipeline in landing order", () => {
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
      screen.getByRole("heading", { name: "Today's Matches" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /^Analyze .+ vs .+$/ }),
    ).toHaveLength(6);
    expect(screen.getAllByText("VS").length).toBeGreaterThanOrEqual(6);

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
      headings.indexOf("Today's Matches"),
    );
    expect(headings.indexOf("Today's Matches")).toBeLessThan(
      headings.indexOf("Recent Analysis"),
    );
    expect(headings.indexOf("Recent Analysis")).toBeLessThan(
      headings.indexOf("Overview"),
    );
    expect(headings.indexOf("Overview")).toBeLessThan(
      headings.indexOf("Pipeline Status"),
    );
  });

  it("calculates overview metrics and recent analysis from stored results", () => {
    writeAnalysisHistory([historyEntry]);
    renderDashboard();

    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Liverpool vs Chelsea")).toBeInTheDocument();
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

    await user.click(
      screen.getByRole("button", {
        name: "Analyze Liverpool vs Chelsea",
      }),
    );

    expect(push).toHaveBeenCalledWith("/matches/match-example-1/session");
  });
});
