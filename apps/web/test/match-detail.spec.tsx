import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MatchDetailPage } from "../src/components/match-detail-page";
import { analyzeMatch, getEvidenceByMatch } from "../src/services/api";
import type { AnalysisReportDto } from "../src/types/analysis";
import type { EvidenceDto } from "../src/types/evidence";

vi.mock("../src/services/api", () => ({
  analyzeMatch: vi.fn(),
  getEvidenceByMatch: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const report: AnalysisReportDto = {
  reportId: "report-match-example-1",
  matchId: "match-example-1",
  generatedAt: "2026-08-01T19:30:00.000Z",
  summary: [
    "Match information is complete.",
    "Home team: Liverpool.",
    "Away team: Chelsea.",
  ],
  features: [
    {
      featureId: "feature-home",
      generatedAt: "2026-08-01T19:30:00.000Z",
      matchId: "match-example-1",
      name: "homeTeam",
      sourceEvidenceId: "evidence-fixture-match-example-1",
      value: "Liverpool",
    },
  ],
  rules: [
    {
      evaluatedAt: "2026-08-01T19:30:00.000Z",
      explanation: "Home team is present.",
      matchId: "match-example-1",
      ruleId: "rule-home",
      ruleName: "HOME_TEAM_PRESENT",
      score: 1,
      sourceFeatureIds: ["feature-home"],
      status: "PASS",
    },
  ],
};

const evidence: EvidenceDto = {
  id: "evidence-fixture-match-example-1",
  source: "fixture",
  sourceId: "fixture-match-example-1",
  type: "MATCH_INFO",
  matchId: "match-example-1",
  collectedAt: "2026-07-17T10:00:00.000Z",
  eventTime: "2026-08-01T19:30:00.000Z",
  freshness: "fresh",
  quality: "unverified",
  provenance: {
    collector: "@fas/evidence-normalizer",
    method: "fixture",
  },
  payload: {
    home: "Liverpool",
    away: "Chelsea",
    kickoff: "2026-08-01T19:30:00Z",
  },
};

function renderPage(matchId: string): void {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MatchDetailPage matchId={matchId} />
    </QueryClientProvider>,
  );
}

describe("MatchDetailPage", () => {
  beforeEach(() => {
    vi.mocked(analyzeMatch).mockReset();
    vi.mocked(getEvidenceByMatch).mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows an empty state for unknown match identifiers", () => {
    renderPage("match-unknown");

    expect(screen.getByText("Match not found")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to Match Center" }),
    ).toHaveAttribute("href", "/");
    expect(analyzeMatch).not.toHaveBeenCalled();
  });

  it("shows a loading skeleton while analysis is pending", () => {
    vi.mocked(analyzeMatch).mockReturnValue(new Promise(() => undefined));
    vi.mocked(getEvidenceByMatch).mockReturnValue(new Promise(() => undefined));
    renderPage("match-example-1");

    expect(screen.getByText("LOADING")).toBeInTheDocument();
    expect(document.querySelector("[aria-busy='true']")).not.toBeNull();
  });

  it("loads analysis data and renders detail tabs", async () => {
    vi.mocked(analyzeMatch).mockResolvedValue(report);
    vi.mocked(getEvidenceByMatch).mockResolvedValue([evidence]);
    const user = userEvent.setup();
    renderPage("match-example-1");

    expect(await screen.findByText("ANALYZED")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Matches")).toBeInTheDocument();
    expect(screen.getByText("Match Detail")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Liverpool vs Chelsea" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Premier League").length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(analyzeMatch).toHaveBeenCalledWith("match-example-1");
      expect(getEvidenceByMatch).toHaveBeenCalledWith("match-example-1");
    });

    expect(screen.getByText("Home team: Liverpool.")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Evidence" }));
    expect(screen.getByText("MATCH_INFO")).toBeInTheDocument();
    expect(screen.getByText("fixture")).toBeInTheDocument();
    expect(screen.getByText("unverified")).toBeInTheDocument();
    expect(screen.getByText("fresh")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Toggle payload for evidence-fixture-match-example-1",
      }),
    );
    expect(screen.getByText(/"kickoff"/)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Features" }));
    expect(screen.getByText("homeTeam")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Rules" }));
    expect(screen.getByText("HOME_TEAM_PRESENT")).toBeInTheDocument();
    expect(screen.getByText("PASS")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Report" }));
    expect(screen.getByText("Analysis complete")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Raw JSON" }));
    await user.click(screen.getByRole("button", { name: "Toggle raw report" }));
    expect(screen.getByText(/"report-match-example-1"/)).toBeInTheDocument();
  });

  it("shows an error page when analysis fails", async () => {
    vi.mocked(analyzeMatch).mockRejectedValue(new Error("Match import failed."));
    renderPage("match-example-2");

    expect(await screen.findByText("FAILED")).toBeInTheDocument();
    expect(screen.getByText("Match import failed.")).toBeInTheDocument();
    expect(screen.getByText("Unable to load match analysis")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to Match Center" }),
    ).toHaveAttribute("href", "/");
  });
});
