import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
    {
      featureId: "feature-away",
      generatedAt: "2026-08-01T19:30:00.000Z",
      matchId: "match-example-1",
      name: "awayTeam",
      sourceEvidenceId: "evidence-fixture-match-example-1",
      value: "Chelsea",
    },
    {
      featureId: "feature-kickoff",
      generatedAt: "2026-08-01T19:30:00.000Z",
      matchId: "match-example-1",
      name: "kickoff",
      sourceEvidenceId: "evidence-fixture-match-example-1",
      value: "2026-08-01T19:30:00Z",
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
    {
      evaluatedAt: "2026-08-01T19:30:00.000Z",
      explanation: "Away team is present.",
      matchId: "match-example-1",
      ruleId: "rule-away",
      ruleName: "AWAY_TEAM_PRESENT",
      score: 1,
      sourceFeatureIds: ["feature-away"],
      status: "PASS",
    },
    {
      evaluatedAt: "2026-08-01T19:30:00.000Z",
      explanation: "Kickoff is present.",
      matchId: "match-example-1",
      ruleId: "rule-kickoff",
      ruleName: "KICKOFF_PRESENT",
      score: 1,
      sourceFeatureIds: ["feature-kickoff"],
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

  it("loads analysis data and renders the explainable report", async () => {
    vi.mocked(analyzeMatch).mockResolvedValue(report);
    vi.mocked(getEvidenceByMatch).mockResolvedValue([evidence]);
    renderPage("match-example-1");

    expect(await screen.findByText("Explainable Report")).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Winner Prediction" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Matches")).toBeInTheDocument();
    expect(screen.getAllByText("Premier League").length).toBeGreaterThan(0);
    expect(screen.getByText("Kickoff 19:30")).toBeInTheDocument();
    expect(screen.getByText("Final Recommendation")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Explainable Pipeline" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Home Team Present")).toBeInTheDocument();
    expect(screen.getByText("Match information")).toBeInTheDocument();
    expect(
      screen.getAllByText("Match information is complete.").length,
    ).toBeGreaterThanOrEqual(1);

    await waitFor(() => {
      expect(analyzeMatch).toHaveBeenCalledWith("match-example-1");
      expect(getEvidenceByMatch).toHaveBeenCalledWith("match-example-1");
    });
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
