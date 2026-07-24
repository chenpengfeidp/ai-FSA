import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExplainableMatchReport } from "../src/components/explainable-report/explainable-match-report";
import { zh } from "../src/copy/zh";
import {
  buildExplainableReportView,
  resolveConfidence,
} from "../src/lib/explainable-report";
import type {
  AnalysisReportDto,
  DomainContributionRowDto,
  ValidationMetricSummaryDto,
} from "../src/types/analysis";
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
      age: 31,
      nationality: "Brazil",
      photo: "https://media.api-sports.io/football/players/1.png",
      captain: true,
      matchSquadStatus: "starting",
      seasonStats: {
        competitionId: "39",
        season: 2026,
        appearances: 20,
        starts: 20,
        minutesPlayed: 1800,
        rating: 6.9,
        goals: 0,
        assists: 0,
        yellowCards: 1,
        redCards: 0,
        saves: 60,
        goalsConceded: 18,
      },
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
    expect(view.players.home[0]?.age).toBe(31);
    expect(view.players.home[0]?.captain).toBe(true);
    expect(view.players.home[0]?.matchSquadStatus).toBe("starting");
    expect(view.players.home[0]?.availabilityStatus).toBeNull();
    expect(view.players.home[0]?.seasonStats?.appearances).toBe(20);
    expect(view.players.home[0]?.seasonStats?.saves).toBe(60);
    expect(view.availability.available).toBe(true);
    expect(view.availability.injuryCount).toBe(1);
    expect(view.availability.suspensionCount).toBe(1);
    expect(view.availability.injuries[0]?.playerName).toBe("Darwin Nunez");
    expect(view.marketEvidence.available).toBe(false);
    expect(view.marketEvidence.note).toContain("honest absence");
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
    expect(screen.getByText(zh.report.playerCaptain)).toBeInTheDocument();
    expect(
      screen.getByText(zh.report.playerSquadStatusStarting),
    ).toBeInTheDocument();
    expect(screen.getByText(zh.report.playerStatAppearances)).toBeInTheDocument();
    expect(screen.getByText(zh.report.playerStatSaves)).toBeInTheDocument();
    expect(screen.getByText(zh.report.marketEvidence)).toBeInTheDocument();
    expect(screen.getByText(zh.report.noMarketEvidence)).toBeInTheDocument();
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
    expect(screen.getByText(zh.report.calibration)).toBeInTheDocument();
    expect(screen.getByText(zh.report.calibrationUnavailable)).toBeInTheDocument();
    expect(screen.getByText(zh.report.validation)).toBeInTheDocument();
    expect(screen.getByText(zh.report.validationUnavailable)).toBeInTheDocument();
    expect(screen.getByText(zh.report.contribution)).toBeInTheDocument();
    expect(screen.getByText(zh.report.contributionUnavailable)).toBeInTheDocument();
  });

  it("renders A2 Prediction Calibration metrics with provenance and insufficient-sample flags", () => {
    const reportWithCalibration: AnalysisReportDto = {
      ...report,
      calibration: {
        schemaVersion: "calibration-report.mvp.a2",
        computedAt: "2026-07-24T00:00:00.000Z",
        sampleSize: 3,
        qualified: false,
        minimumQualifiedSampleSize: 20,
        provenance: {
          sourceRecordCount: 3,
          evaluationHistorySchemaVersions: ["evaluation-history.mvp.a1"],
          evaluationModelVersions: ["evaluation.mvp.a1"],
          projectionModelVersions: ["projection.v2.p1b.player"],
          earliestMatchDate: "2026-07-01T10:00:00.000Z",
          latestMatchDate: "2026-07-20T10:00:00.000Z",
        },
        confidenceBucketAccuracy: [
          {
            band: "high",
            sampleSize: 2,
            hits: 1,
            accuracy: 0.5,
            qualified: false,
          },
          { band: "medium", sampleSize: 0, hits: 0, qualified: false },
          { band: "low", sampleSize: 0, hits: 0, qualified: false },
          { band: "very_high", sampleSize: 0, hits: 0, qualified: false },
        ],
        confidenceDistribution: [
          { band: "high", sampleSize: 2, share: 0.6667 },
          { band: "medium", sampleSize: 0, share: 0 },
          { band: "low", sampleSize: 0, share: 0 },
          { band: "very_high", sampleSize: 0, share: 0 },
        ],
        reliabilityTable: [
          {
            bucketLabel: "60-70%",
            minProbability: 0.6,
            maxProbability: 0.7,
            sampleSize: 2,
            meanPredictedProbability: 0.65,
            observedFrequency: 0.5,
            qualified: false,
          },
        ],
        expectedCalibrationError: { value: 0.15, sampleSize: 3, qualified: false },
        brierScore: { value: 0.21, sampleSize: 3, qualified: false },
        outcomeCalibration: [
          {
            outcome: "home",
            bucketLabel: "60-70%",
            minProbability: 0.6,
            maxProbability: 0.7,
            sampleSize: 2,
            meanPredictedProbability: 0.65,
            observedFrequency: 0.5,
            qualified: false,
          },
        ],
        goalRangeCalibration: [
          {
            bucket: "range01",
            sampleSize: 1,
            hits: 1,
            accuracy: 1,
            qualified: false,
          },
          {
            bucket: "range23",
            sampleSize: 2,
            hits: 1,
            accuracy: 0.5,
            qualified: false,
          },
          { bucket: "range4Plus", sampleSize: 0, hits: 0, qualified: false },
        ],
        limitations: [
          "Computed only from Evaluation History (A1.5); missing history is never estimated or fabricated.",
          "Overall sample size (3) is below the minimum qualified threshold (20); report metrics are directional only.",
        ],
      },
    };

    render(
      <ExplainableMatchReport
        evidence={evidence}
        match={match}
        report={reportWithCalibration}
      />,
    );

    expect(screen.getByText(zh.report.calibration)).toBeInTheDocument();
    expect(
      screen.getByText(zh.report.calibrationConfidenceBucketAccuracy),
    ).toBeInTheDocument();
    expect(
      screen.getByText(zh.report.calibrationReliabilityTable),
    ).toBeInTheDocument();
    expect(
      screen.getByText(zh.report.calibrationExpectedCalibrationError),
    ).toBeInTheDocument();
    expect(screen.getByText(zh.report.calibrationBrierScore)).toBeInTheDocument();
    expect(
      screen.getAllByText(zh.report.calibrationInsufficientBadge).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "Computed only from Evaluation History (A1.5); missing history is never estimated or fabricated.",
      ),
    ).toBeInTheDocument();
  });

  it("renders V1A Football Intelligence Validation profile comparison with insufficient-sample flags", () => {
    const minimalCalibration = {
      schemaVersion: "calibration-report.mvp.a2",
      computedAt: "2026-07-24T00:00:00.000Z",
      sampleSize: 1,
      qualified: false,
      minimumQualifiedSampleSize: 20,
      provenance: {
        sourceRecordCount: 1,
        evaluationHistorySchemaVersions: ["evaluation-history.mvp.a15"],
        evaluationModelVersions: ["evaluation.mvp.a1"],
        projectionModelVersions: ["projection.v2.p1b.player"],
      },
      confidenceBucketAccuracy: [],
      confidenceDistribution: [],
      reliabilityTable: [],
      expectedCalibrationError: { value: 0.1, sampleSize: 1, qualified: false },
      brierScore: { value: 0.2, sampleSize: 1, qualified: false },
      outcomeCalibration: [],
      goalRangeCalibration: [],
      limitations: [],
    } as const;

    const reportWithValidation: AnalysisReportDto = {
      ...report,
      validation: {
        schemaVersion: "validation-report.mvp.v1a",
        computedAt: "2026-07-24T00:00:00.000Z",
        totalSampleSize: 1,
        minimumQualifiedSampleSize: 20,
        provenance: {
          sourceRecordCount: 1,
          evaluationHistorySchemaVersions: ["evaluation-history.mvp.a15"],
          evaluationModelVersions: ["evaluation.mvp.a1"],
          projectionModelVersions: ["projection.v2.p1b.player"],
        },
        profiles: [
          {
            profile: "baseline",
            label: "Baseline",
            sampleSize: 1,
            qualified: false,
            winnerAccuracy: { value: 1, sampleSize: 1, qualified: false },
            drawAccuracy: { value: undefined, sampleSize: 0, qualified: false },
            scoreAccuracy: { value: 0, sampleSize: 1, qualified: false },
            goalRangeAccuracy: { value: 1, sampleSize: 1, qualified: false },
            coverage: { value: 0.8, sampleSize: 1, qualified: false },
            paperReturn: { value: 1, sampleSize: 1, qualified: false },
            calibration: minimalCalibration,
          },
          {
            profile: "club_intelligence",
            label: "Club Intelligence",
            sampleSize: 0,
            qualified: false,
            winnerAccuracy: { value: undefined, sampleSize: 0, qualified: false },
            drawAccuracy: { value: undefined, sampleSize: 0, qualified: false },
            scoreAccuracy: { value: undefined, sampleSize: 0, qualified: false },
            goalRangeAccuracy: { value: undefined, sampleSize: 0, qualified: false },
            coverage: { value: undefined, sampleSize: 0, qualified: false },
            paperReturn: { value: undefined, sampleSize: 0, qualified: false },
            calibration: { ...minimalCalibration, sampleSize: 0 },
          },
          {
            profile: "club_player",
            label: "Club + Player",
            sampleSize: 0,
            qualified: false,
            winnerAccuracy: { value: undefined, sampleSize: 0, qualified: false },
            drawAccuracy: { value: undefined, sampleSize: 0, qualified: false },
            scoreAccuracy: { value: undefined, sampleSize: 0, qualified: false },
            goalRangeAccuracy: { value: undefined, sampleSize: 0, qualified: false },
            coverage: { value: undefined, sampleSize: 0, qualified: false },
            paperReturn: { value: undefined, sampleSize: 0, qualified: false },
            calibration: { ...minimalCalibration, sampleSize: 0 },
          },
          {
            profile: "club_player_xg",
            label: "Club + Player + xG",
            sampleSize: 0,
            qualified: false,
            winnerAccuracy: { value: undefined, sampleSize: 0, qualified: false },
            drawAccuracy: { value: undefined, sampleSize: 0, qualified: false },
            scoreAccuracy: { value: undefined, sampleSize: 0, qualified: false },
            goalRangeAccuracy: { value: undefined, sampleSize: 0, qualified: false },
            coverage: { value: undefined, sampleSize: 0, qualified: false },
            paperReturn: { value: undefined, sampleSize: 0, qualified: false },
            calibration: { ...minimalCalibration, sampleSize: 0 },
          },
          {
            profile: "full_football_intelligence",
            label: "Full Football Intelligence",
            sampleSize: 0,
            qualified: false,
            winnerAccuracy: { value: undefined, sampleSize: 0, qualified: false },
            drawAccuracy: { value: undefined, sampleSize: 0, qualified: false },
            scoreAccuracy: { value: undefined, sampleSize: 0, qualified: false },
            goalRangeAccuracy: { value: undefined, sampleSize: 0, qualified: false },
            coverage: { value: undefined, sampleSize: 0, qualified: false },
            paperReturn: { value: undefined, sampleSize: 0, qualified: false },
            calibration: { ...minimalCalibration, sampleSize: 0 },
          },
        ],
        limitations: [
          "Computed only from Evaluation History (A1.5); missing history is never estimated or fabricated.",
          "This report never claims one profile improved over another — read qualified flags and sample sizes before drawing any conclusion.",
        ],
      },
    };

    render(
      <ExplainableMatchReport
        evidence={evidence}
        match={match}
        report={reportWithValidation}
      />,
    );

    expect(screen.getByText(zh.report.validation)).toBeInTheDocument();
    expect(
      screen.getByText(zh.report.validationProfileLabel.baseline),
    ).toBeInTheDocument();
    expect(
      screen.getByText(zh.report.validationProfileLabel.club_intelligence),
    ).toBeInTheDocument();
    expect(
      screen.getByText(zh.report.validationProfileLabel.full_football_intelligence),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(zh.report.validationInsufficientBadge).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "This report never claims one profile improved over another — read qualified flags and sample sizes before drawing any conclusion.",
      ),
    ).toBeInTheDocument();
  });

  it("renders O1 Football Intelligence Contribution domain rows with insufficient-sample flags", () => {
    const zeroMetric: ValidationMetricSummaryDto = {
      value: undefined,
      sampleSize: 0,
      qualified: false,
    };
    const zeroDomainRow = (
      domain: DomainContributionRowDto["domain"],
      label: string,
    ): DomainContributionRowDto => ({
      domain,
      label,
      sampleSize: 0,
      qualified: false,
      coverage: zeroMetric,
      winnerAccuracy: zeroMetric,
      drawAccuracy: zeroMetric,
      scoreAccuracy: zeroMetric,
      goalRangeAccuracy: zeroMetric,
      expectedCalibrationError: zeroMetric,
      brierScore: zeroMetric,
      paperReturn: zeroMetric,
    });

    const reportWithContribution: AnalysisReportDto = {
      ...report,
      contribution: {
        schemaVersion: "contribution-report.mvp.o1",
        computedAt: "2026-07-24T00:00:00.000Z",
        totalSampleSize: 1,
        minimumQualifiedSampleSize: 20,
        provenance: {
          sourceRecordCount: 1,
          evaluationHistorySchemaVersions: ["evaluation-history.mvp.a15"],
          evaluationModelVersions: ["evaluation.mvp.a1"],
          projectionModelVersions: ["projection.v2.p1b.player"],
        },
        domains: [
          {
            domain: "venue_intelligence",
            label: "Venue Intelligence",
            sampleSize: 1,
            qualified: false,
            coverage: { value: 1, sampleSize: 1, qualified: false },
            winnerAccuracy: { value: 1, sampleSize: 1, qualified: false },
            drawAccuracy: { value: undefined, sampleSize: 0, qualified: false },
            scoreAccuracy: { value: 0, sampleSize: 1, qualified: false },
            goalRangeAccuracy: { value: 1, sampleSize: 1, qualified: false },
            expectedCalibrationError: {
              value: 0.1,
              sampleSize: 1,
              qualified: false,
            },
            brierScore: { value: 0.2, sampleSize: 1, qualified: false },
            paperReturn: { value: 1, sampleSize: 1, qualified: false },
          },
          zeroDomainRow("availability_intelligence", "Availability Intelligence"),
          zeroDomainRow("advanced_statistics", "Advanced Statistics"),
          zeroDomainRow("expected_goals", "Expected Goals"),
          zeroDomainRow("match_context", "Match Context"),
          zeroDomainRow("club_intelligence", "Club Intelligence"),
          zeroDomainRow("player_intelligence", "Player Intelligence"),
          zeroDomainRow("market_intelligence", "Market Intelligence"),
        ],
        limitations: [
          "Computed only from Evaluation History (A1.5); missing history is never estimated or fabricated.",
          "This report never claims causation and never ranks domains — it reports only measured historical statistics in a fixed canonical order; read qualified flags and sample sizes before drawing any conclusion.",
        ],
      },
    };

    render(
      <ExplainableMatchReport
        evidence={evidence}
        match={match}
        report={reportWithContribution}
      />,
    );

    expect(screen.getByText(zh.report.contribution)).toBeInTheDocument();
    expect(
      screen.getByText(zh.report.contributionDomainLabel.venue_intelligence),
    ).toBeInTheDocument();
    expect(
      screen.getByText(zh.report.contributionDomainLabel.club_intelligence),
    ).toBeInTheDocument();
    expect(
      screen.getByText(zh.report.contributionDomainLabel.market_intelligence),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(zh.report.contributionInsufficientBadge).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "This report never claims causation and never ranks domains — it reports only measured historical statistics in a fixed canonical order; read qualified flags and sample sizes before drawing any conclusion.",
      ),
    ).toBeInTheDocument();
  });
});
