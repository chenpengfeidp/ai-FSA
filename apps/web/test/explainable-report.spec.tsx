import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExplainableMatchReport } from "../src/components/explainable-report/explainable-match-report";
import { zh } from "../src/copy/zh";
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
  kickoff: "2026-08-01T19:30:00Z",
  kickoffTime: "2026-08-01 19:30",
  competition: "Premier League",
  status: "SCHEDULED",
  providerSource: "fixture",
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
    projectionModelVersion: "projection.v2.i1b.context",
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

const evidence: readonly EvidenceDto[] = [
  {
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
  },
  {
    id: "evidence-api-football-match-example-1-venue",
    providerId: "football:api-sports",
    source: "api-football",
    sourceId: "api-football:example:venue",
    type: "VENUE",
    matchId: "match-example-1",
    collectedAt: "2026-07-17T10:00:00.000Z",
    eventTime: "2026-08-01T19:30:00.000Z",
    timestamp: "2026-07-17T10:00:00.000Z",
    freshness: "fresh",
    confidence: "medium",
    quality: "unverified",
    provenance: {
      collector: "@fas/evidence-normalizer",
      method: "recorded-snapshot",
      providerId: "football:api-sports",
      category: "football",
    },
    payload: {
      name: "Anfield",
      city: "Liverpool",
      venueId: "550",
    },
  },
  {
    id: "evidence-api-football-match-example-1-player-1",
    providerId: "football:api-sports",
    source: "api-football",
    sourceId: "api-football:example:player:1",
    type: "PLAYER",
    matchId: "match-example-1",
    collectedAt: "2026-07-17T10:00:00.000Z",
    eventTime: "2026-08-01T19:30:00.000Z",
    timestamp: "2026-07-17T10:00:00.000Z",
    freshness: "fresh",
    confidence: "medium",
    quality: "unverified",
    provenance: {
      collector: "@fas/evidence-normalizer",
      method: "recorded-snapshot",
      providerId: "football:api-sports",
      category: "football",
    },
    payload: {
      playerId: "1",
      name: "Alisson",
      teamId: "40",
      teamName: "Liverpool",
      teamSide: "home",
      position: "Goalkeeper",
      number: 1,
      nationality: "Brazil",
      photo: "https://media.api-sports.io/football/players/1.png",
    },
  },
  {
    id: "evidence-api-football-match-example-1-injury-1",
    providerId: "football:api-sports",
    source: "api-football",
    sourceId: "api-football:example:availability:injury:9",
    type: "INJURY",
    matchId: "match-example-1",
    collectedAt: "2026-07-17T10:00:00.000Z",
    eventTime: "2026-08-01T19:30:00.000Z",
    timestamp: "2026-07-17T10:00:00.000Z",
    freshness: "fresh",
    confidence: "medium",
    quality: "unverified",
    provenance: {
      collector: "@fas/evidence-normalizer",
      method: "recorded-snapshot",
      providerId: "football:api-sports",
      category: "football",
    },
    payload: {
      playerId: "9",
      playerName: "Darwin Nunez",
      teamId: "40",
      teamName: "Liverpool",
      teamSide: "home",
      kind: "injury",
      reason: "Hamstring Strain",
    },
  },
  {
    id: "evidence-api-football-match-example-1-suspension-1",
    providerId: "football:api-sports",
    source: "api-football",
    sourceId: "api-football:example:availability:suspension:6",
    type: "SUSPENSION",
    matchId: "match-example-1",
    collectedAt: "2026-07-17T10:00:00.000Z",
    eventTime: "2026-08-01T19:30:00.000Z",
    timestamp: "2026-07-17T10:00:00.000Z",
    freshness: "fresh",
    confidence: "medium",
    quality: "unverified",
    provenance: {
      collector: "@fas/evidence-normalizer",
      method: "recorded-snapshot",
      providerId: "football:api-sports",
      category: "football",
    },
    payload: {
      playerId: "6",
      playerName: "Thiago Silva",
      teamId: "49",
      teamName: "Chelsea",
      teamSide: "away",
      kind: "suspension",
      reason: "Suspended 1 match",
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
    expect(view.venue.available).toBe(true);
    expect(view.venue.name).toBe("Anfield");
    expect(view.header.venueLabel).toBe("Anfield · Liverpool");
    expect(view.players.available).toBe(true);
    expect(view.players.home).toHaveLength(1);
    expect(view.players.home[0]?.name).toBe("Alisson");
    expect(view.availability.available).toBe(true);
    expect(view.availability.injuryCount).toBe(1);
    expect(view.availability.suspensionCount).toBe(1);
    expect(view.availability.injuries[0]?.playerName).toBe("Darwin Nunez");
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

    expect(screen.getByText(zh.report.prediction)).toBeInTheDocument();
    expect(screen.getAllByText("Premier League").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(zh.workspace.kickoff("2026-08-01 19:30")).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("heading", { name: zh.report.winnerPrediction }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("48%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Match information")).toBeInTheDocument();
    expect(screen.getByText(zh.report.venue)).toBeInTheDocument();
    expect(screen.getByText("Anfield")).toBeInTheDocument();
    expect(screen.getByText(zh.report.players)).toBeInTheDocument();
    expect(screen.getByText("Alisson")).toBeInTheDocument();
    expect(screen.getByText("Player")).toBeInTheDocument();
    expect(screen.getByText(zh.report.availability)).toBeInTheDocument();
    expect(
      screen.getByText(zh.report.availabilitySummary(1, 1)),
    ).toBeInTheDocument();
    expect(screen.getByText("Darwin Nunez")).toBeInTheDocument();
    expect(screen.getByText("Thiago Silva")).toBeInTheDocument();
    expect(screen.getByText("Injury")).toBeInTheDocument();
    expect(screen.getByText("Suspension")).toBeInTheDocument();
    expect(
      screen.getByText(
        zh.report.evidenceSource("internal:recorded", "fixture", "fixture"),
      ),
    ).toBeInTheDocument();
  });
});
