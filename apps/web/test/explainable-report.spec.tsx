import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExplainableMatchReport } from "../src/components/explainable-report/explainable-match-report";
import {
  buildExplainableReportView,
  resolveConfidence,
} from "../src/lib/explainable-report";
import type { AnalysisReportDto } from "../src/types/analysis";
import type { EvidenceDto } from "../src/types/evidence";
import type { MatchSummary } from "../src/types/match-center";

const match: MatchSummary = {
  id: "match-example-1",
  homeTeam: "Liverpool",
  awayTeam: "Chelsea",
  kickoffTime: "19:30",
  competition: "Premier League",
  status: "SCHEDULED",
};

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

const evidence: readonly EvidenceDto[] = [
  {
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
  },
];

afterEach(() => {
  cleanup();
});

describe("buildExplainableReportView", () => {
  it("maps deterministic rule scores into winner shares and confidence", () => {
    const view = buildExplainableReportView(match, report, evidence);

    expect(view.header.homeTeam).toBe("Liverpool");
    expect(view.header.awayTeam).toBe("Chelsea");
    expect(view.header.competition).toBe("Premier League");
    expect(view.header.kickoffTime).toBe("19:30");
    expect(view.winnerPrediction.homePercent).toBe(50);
    expect(view.winnerPrediction.awayPercent).toBe(50);
    expect(view.winnerPrediction.recommendedTeam).toBeNull();
    expect(view.confidence.level).toBe("Very High");
    expect(view.confidence.percent).toBe(100);
    expect(view.mostLikelyScore.available).toBe(false);
    expect(view.goalRange.available).toBe(false);
    expect(view.evidenceTimeline).toHaveLength(1);
    expect(view.evidenceTimeline[0]?.title).toBe("Match information");
    expect(view.featureImportance).toHaveLength(3);
    expect(view.ruleEvaluations).toHaveLength(3);
    expect(view.finalRecommendation.recommendedWinner).toBe("Even signal");
    expect(view.finalRecommendation.recommendedScore).toBe("Unavailable");
    expect(view.finalRecommendation.confidence).toBe("Very High");
  });

  it("resolves confidence levels from pass ratios", () => {
    expect(resolveConfidence(3, 3)).toBe("Very High");
    expect(resolveConfidence(3, 4)).toBe("High");
    expect(resolveConfidence(2, 4)).toBe("Medium");
    expect(resolveConfidence(1, 4)).toBe("Low");
  });
});

describe("ExplainableMatchReport", () => {
  it("renders the product report sections from analysis output", () => {
    render(
      <ExplainableMatchReport evidence={evidence} match={match} report={report} />,
    );

    expect(screen.getByText("Premier League")).toBeInTheDocument();
    expect(screen.getByText("Kickoff 19:30")).toBeInTheDocument();
    expect(screen.getAllByText("Liverpool").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Chelsea").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("heading", { name: "Winner Prediction" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("50%").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByRole("heading", { name: "Most Likely Score" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Goal Range" })).toBeInTheDocument();
    expect(screen.getByText("0-1 Goals")).toBeInTheDocument();
    expect(screen.getByText("2-3 Goals")).toBeInTheDocument();
    expect(screen.getByText("4+ Goals")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Confidence Meter" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(
      screen.getByRole("heading", { name: "Evidence Timeline" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Match information")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Feature Importance" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Home Team")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Rule Evaluation" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Home Team Present")).toBeInTheDocument();
    expect(screen.getAllByText("PASS").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("Weight +1").length).toBeGreaterThanOrEqual(3);
    expect(
      screen.getByRole("heading", { name: "Final Recommendation" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Even signal")).toBeInTheDocument();
    expect(screen.getByText("Match information is complete.")).toBeInTheDocument();
  });
});
