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
    "Home team extracted from MATCH_INFO.",
    "Away team extracted from MATCH_INFO.",
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
    projectionModelVersion: "projection.v2.slice1",
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
    status: "completed_nonempty",
    checksum: "checksum-1",
  },
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
  it("maps sealed projection fields into winner shares and confidence", () => {
    const view = buildExplainableReportView(match, report, evidence);

    expect(view.header.homeTeam).toBe("Liverpool");
    expect(view.winnerPrediction.homePercent).toBe(48);
    expect(view.winnerPrediction.recommendedTeam).toBe("Liverpool");
    expect(view.confidence.level).toBe("High");
    expect(view.confidence.percent).toBe(72);
    expect(view.mostLikelyScore.available).toBe(true);
    expect(view.mostLikelyScore.homeGoals).toBe(1);
    expect(view.goalRange.available).toBe(true);
    expect(view.goalRange.recommendedLabel).toBe("2-3 Goals");
    expect(view.finalRecommendation.recommendedWinner).toBe("Liverpool");
  });

  it("resolves confidence levels from pass ratios", () => {
    expect(resolveConfidence(3, 3)).toBe("Very High");
    expect(resolveConfidence(1, 4)).toBe("Low");
  });
});

describe("ExplainableMatchReport", () => {
  it("renders stacked AI workspace sections from analysis output", () => {
    render(
      <ExplainableMatchReport evidence={evidence} match={match} report={report} />,
    );

    expect(screen.getByText("Prediction")).toBeInTheDocument();
    expect(screen.getAllByText("Premier League").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Kickoff 19:30").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("heading", { name: "Winner Prediction" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("48%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Match information")).toBeInTheDocument();
  });
});
