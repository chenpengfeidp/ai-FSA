import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MatchDetailPage } from "../src/components/match-detail-page";
import { zh } from "../src/copy/zh";
import { analyzeMatch, getEvidenceByMatch } from "../src/services/api";
import type { AnalysisReportDto } from "../src/types/analysis";
import type { EvidenceDto } from "../src/types/evidence";

vi.mock("../src/services/api", () => ({
  analyzeMatch: vi.fn(),
  getEvidenceByMatch: vi.fn(),
  getUpcomingMatches: vi.fn(async () =>
    Object.freeze({
      matches: Object.freeze([]),
      meta: Object.freeze({ oddsProviderMode: "recorded" as const }),
    }),
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/matches/match-example-1",
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
      explanation: "Home team extracted from MATCH_INFO.",
      sourceEvidenceId: "evidence-fixture-match-example-1",
      value: "Liverpool",
    },
    {
      featureId: "feature-away",
      generatedAt: "2026-08-01T19:30:00.000Z",
      matchId: "match-example-1",
      name: "awayTeam",
      explanation: "Away team extracted from MATCH_INFO.",
      sourceEvidenceId: "evidence-fixture-match-example-1",
      value: "Chelsea",
    },
    {
      featureId: "feature-kickoff",
      generatedAt: "2026-08-01T19:30:00.000Z",
      matchId: "match-example-1",
      name: "kickoff",
      explanation: "Kickoff extracted from MATCH_INFO.",
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
      weight: 1,
      channel: "none",
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
      weight: 1,
      channel: "none",
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
      weight: 1,
      channel: "none",
      sourceFeatureIds: ["feature-kickoff"],
      status: "PASS",
    },
  ],
  deterministic: {
    projectionModelVersion: "projection.v2.p1b.player",
    matchId: "match-example-1",
    lambdaHome: 1.8,
    lambdaAway: 1.1,
    pHome: 0.48,
    pDraw: 0.26,
    pAway: 0.26,
    topScorelines: [
      { homeGoals: 1, awayGoals: 1, probability: 0.12 },
      { homeGoals: 2, awayGoals: 1, probability: 0.1 },
      { homeGoals: 1, awayGoals: 0, probability: 0.09 },
    ],
    goalRange: {
      range01: 0.3,
      range23: 0.45,
      range4Plus: 0.25,
    },
    confidence: 0.72,
    recommendation: "lean_home",
    limitations: ["Uncalibrated independent Poisson baseline."],
    calibrationArtifactId: "calibration:identity:v1",
    calibrationModelVersion: "calibration.v1.identity",
    calibrationStatus: "uncalibrated_baseline",
    calibrationChecksum: "calibration-identity-v1-checksum",
    calibrationQualified: false,
    status: "completed_nonempty",
    checksum: "checksum-1",
  },
  narrative: {
    epistemicKind: "inference",
    providerId: "local_deterministic_v1",
    promptManifestId: "prompt-manifest:test",
    promptManifestChecksum: "fnv1a-test",
    sections: [
      {
        title: "Overview",
        body: "Sealed recommendation lean_home. Values were not recomputed by this narrator.",
      },
    ],
    disclaimer: "Inference draft only.",
    generatedAt: "2026-07-17T10:00:00.000Z",
  },
};

const evidence: EvidenceDto = {
  id: "evidence-fixture-match-example-1",
  providerId: "internal:recorded",
  source: "fixture",
  sourceId: "fixture-match-example-1",
  type: "MATCH_INFO",
  matchId: "match-example-1",
  collectedAt: "2026-07-17T10:00:00.000Z",
  eventTime: "2026-08-01T19:30:00.000Z",
  timestamp: "2026-07-17T10:00:00.000Z",
  freshness: "fresh",
  confidence: "unknown",
  quality: "unverified",
  provenance: {
    collector: "@fas/evidence-normalizer",
    method: "fixture",
    providerId: "internal:recorded",
    category: "internal",
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

    expect(screen.getByText(zh.workspace.matchNotFound)).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: zh.workspace.backToMatchCenter }).length,
    ).toBeGreaterThanOrEqual(1);
    expect(analyzeMatch).not.toHaveBeenCalled();
  });

  it("shows a loading skeleton while analysis is pending", () => {
    vi.mocked(analyzeMatch).mockReturnValue(new Promise(() => undefined));
    vi.mocked(getEvidenceByMatch).mockReturnValue(new Promise(() => undefined));
    renderPage("match-example-1");

    expect(screen.getByText("LOADING")).toBeInTheDocument();
    expect(
      screen.getAllByText(zh.workspace.aiAnalysisWorkspace).length,
    ).toBeGreaterThanOrEqual(1);
    expect(document.querySelector("[aria-busy='true']")).not.toBeNull();
  });

  it("loads analysis data and renders the AI workspace", async () => {
    vi.mocked(analyzeMatch).mockResolvedValue(report);
    vi.mocked(getEvidenceByMatch).mockResolvedValue([evidence]);
    renderPage("match-example-1");

    expect(
      await screen.findByText(zh.workspace.aiAnalysisWorkspace),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(zh.workspace.matchList).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(zh.workspace.recentAnalyses).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("navigation", { name: zh.workspace.sectionsAria }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: zh.report.winnerPrediction }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Premier League").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(zh.workspace.kickoff("2026-08-01 19:30")).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: zh.report.reasoning }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: zh.report.evidence }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: zh.report.ruleEvaluation }),
    ).toBeInTheDocument();
    expect(screen.getByText("Home Team Present")).toBeInTheDocument();
    expect(screen.getByText(zh.report.developerDetails)).toBeInTheDocument();
    expect(screen.getByText(zh.report.finalRecommendation)).toBeInTheDocument();

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
    expect(screen.getByText(zh.workspace.loadErrorTitle)).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: zh.workspace.backToMatchCenter }).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
