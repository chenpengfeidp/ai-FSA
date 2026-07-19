import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisDashboard } from "../src/components/analysis-dashboard";
import { analyzeMatch } from "../src/services/api";
import type { AnalysisReportDto } from "../src/types/analysis";

vi.mock("../src/services/api", () => ({
  analyzeMatch: vi.fn(),
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
      sourceEvidenceId: "evidence-match-example-1",
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
    vi.mocked(analyzeMatch).mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders six responsive match choices and the empty recent state", () => {
    renderDashboard();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "AI Football Analysis Platform",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Today's Matches" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Analyze / })).toHaveLength(6);
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(screen.getByText("Manchester City")).toBeInTheDocument();
    expect(screen.getByText("Barcelona")).toBeInTheDocument();
    expect(screen.getByText("Real Madrid")).toBeInTheDocument();
    expect(screen.getByText("No analysis yet")).toBeInTheDocument();
  });

  it("analyzes a selected match and renders it as the latest result", async () => {
    vi.mocked(analyzeMatch).mockResolvedValue(report);
    const user = userEvent.setup();
    renderDashboard();

    await user.click(
      screen.getByRole("button", {
        name: "Analyze Liverpool vs Chelsea",
      }),
    );

    await waitFor(() => {
      expect(analyzeMatch).toHaveBeenCalledWith("match-example-1");
    });
    expect(await screen.findByText("Analysis complete")).toBeInTheDocument();
    expect(screen.getByText("Home team: Liverpool.")).toBeInTheDocument();
    expect(screen.getByText("homeTeam")).toBeInTheDocument();
    expect(screen.getByText("HOME_TEAM_PRESENT")).toBeInTheDocument();
    expect(screen.getByText("PASS")).toBeInTheDocument();
    expect(screen.getAllByText("Liverpool vs Chelsea")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Toggle raw report" }));
    expect(screen.getByText(/"report-match-example-1"/)).toBeInTheDocument();
  });

  it("shows loading state and disables submission", async () => {
    let resolveRequest: (value: AnalysisReportDto) => void = () => undefined;
    vi.mocked(analyzeMatch).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const user = userEvent.setup();
    renderDashboard();

    await user.click(
      screen.getByRole("button", {
        name: "Analyze Liverpool vs Chelsea",
      }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent("Analyzing match");
    for (const button of screen.getAllByRole("button", { name: /^Analyze / })) {
      expect(button).toBeDisabled();
    }

    resolveRequest(report);
    expect(await screen.findByText("Analysis complete")).toBeInTheDocument();
  });

  it("displays backend failures", async () => {
    vi.mocked(analyzeMatch).mockRejectedValue(new Error("The match was not found."));
    const user = userEvent.setup();
    renderDashboard();

    await user.click(
      screen.getByRole("button", {
        name: "Analyze Arsenal vs Manchester City",
      }),
    );

    expect(analyzeMatch).toHaveBeenCalledWith("match-example-2");
    expect(await screen.findByText("The match was not found.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Analyze Arsenal vs Manchester City",
      }),
    ).toBeEnabled();
  });
});
