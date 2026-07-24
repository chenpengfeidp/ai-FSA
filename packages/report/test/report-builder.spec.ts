import { LocalDeterministicNarrativeAdapter } from "@fas/ai-provider";
import {
  buildScenarioSet,
  computeDeterministicMatchProjection,
  computeIntelligenceConfidence,
  createAnalysisResult,
  type AnalysisResult,
} from "@fas/analysis";
import { createEvidence } from "@fas/evidence";
import { FeatureExtractor } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { RuleEvaluator } from "@fas/rule";
import {
  buildEvaluationHistoryRecord,
  createActualMatchResult,
  evaluatePrediction,
  InMemoryEvaluationHistoryRepository,
} from "@fas/statistics";
import { describe, expect, it } from "vitest";
import { GenerateMatchReportUseCase, ReportBuilder } from "../src/index.js";

function createReportBuilder(): ReportBuilder {
  return new ReportBuilder(new LocalDeterministicNarrativeAdapter());
}

const matchId = createMatchId("match-1");
const generatedAt = "2026-07-17T10:00:00Z";

function makeCompletedAnalysis(): AnalysisResult {
  const evidenceSet = Object.freeze([
    createEvidence({
      id: "evidence-1",
      source: "fixture",
      sourceId: "fixture-match-1",
      type: "MATCH_INFO",
      matchId,
      collectedAt: generatedAt,
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
      },
      payload: {
        away: "Chelsea",
        home: "Liverpool",
        kickoff: "2026-08-01T19:30:00Z",
      },
    }),
    createEvidence({
      id: "evidence-form-home",
      source: "fixture",
      sourceId: "fixture-form-home",
      type: "TEAM_FORM",
      matchId,
      collectedAt: generatedAt,
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
      },
      payload: {
        teamSide: "home",
        window: 5,
        results: ["W", "W", "D", "W", "L"],
        goalsFor: [2, 3, 1, 2, 0],
        goalsAgainst: [0, 1, 1, 1, 1],
      },
    }),
    createEvidence({
      id: "evidence-form-away",
      source: "fixture",
      sourceId: "fixture-form-away",
      type: "TEAM_FORM",
      matchId,
      collectedAt: generatedAt,
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
      },
      payload: {
        teamSide: "away",
        window: 5,
        results: ["L", "D", "L", "W", "L"],
        goalsFor: [0, 1, 1, 2, 0],
        goalsAgainst: [2, 1, 3, 1, 2],
      },
    }),
    createEvidence({
      id: "evidence-stats-home",
      source: "fixture",
      sourceId: "fixture-stats-home",
      type: "STATISTICS",
      matchId,
      collectedAt: generatedAt,
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
      },
      payload: {
        teamSide: "home",
        windowMatches: 5,
        shotsForPerMatch: 15,
        shotsAgainstPerMatch: 9,
        xgForPerMatch: 1.8,
        xgAgainstPerMatch: 1.0,
      },
    }),
    createEvidence({
      id: "evidence-stats-away",
      source: "fixture",
      sourceId: "fixture-stats-away",
      type: "STATISTICS",
      matchId,
      collectedAt: generatedAt,
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
      },
      payload: {
        teamSide: "away",
        windowMatches: 5,
        shotsForPerMatch: 10,
        shotsAgainstPerMatch: 14,
        xgForPerMatch: 1.0,
        xgAgainstPerMatch: 1.7,
      },
    }),
  ]);
  const featureBundle = new FeatureExtractor().extractBundle(evidenceSet);
  const ruleResults = new RuleEvaluator().evaluate(featureBundle.features);
  const projection = computeDeterministicMatchProjection({
    featureBundle,
    ruleResults,
    requiredEvidencePresentCount: 5,
  });
  const scenarios = buildScenarioSet(projection);
  const intelligenceConfidence = computeIntelligenceConfidence({
    matchId,
    evidenceSet,
    featureBundle,
    ruleResults,
    scenarios,
  });

  const matchInfo = evidenceSet[0];

  if (matchInfo === undefined) {
    throw new Error("Expected MATCH_INFO evidence in test fixture.");
  }

  return createAnalysisResult({
    matchId,
    evidence: matchInfo,
    evidenceSet,
    features: featureBundle.features,
    featureBundle,
    ruleResults,
    projection,
    scenarios,
    intelligenceConfidence,
    generatedAt,
  });
}

describe("ReportBuilder", () => {
  it("builds a successful deterministic match report without recomputing projection", () => {
    const analysis = makeCompletedAnalysis();
    const report = createReportBuilder().build(analysis);

    expect(report.reportId).toBe(`report:match-1:${generatedAt}`);
    expect(report.deterministic).toEqual(analysis.projection);
    expect(report.deterministic.pHome).toBe(analysis.projection.pHome);
    expect(report.summary.some((line) => line.startsWith("Projection "))).toBe(true);
    expect(report.features).toEqual(analysis.features);
    expect(report.rules).toEqual(analysis.ruleResults);
    expect(report.narrative.epistemicKind).toBe("inference");
    expect(report.narrative.sections.length).toBe(6);
    expect(report.narrative.sections.map((section) => section.title)).toEqual([
      "Overview",
      "Key Factors",
      "Strength Comparison",
      "Risk Analysis",
      "Prediction",
      "Recommended Score",
    ]);
    expect(report.scenarios.mostLikely.slot).toBe("mostLikely");
    expect(report.intelligenceConfidence.policyVersion).toBe("confidence.mvp.a05");
    expect(report.actualResult).toBeUndefined();
    expect(report.evaluation).toBeUndefined();
  });

  it("returns a deeply immutable report", () => {
    const report = createReportBuilder().build(makeCompletedAnalysis());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.summary)).toBe(true);
    expect(Object.isFrozen(report.features)).toBe(true);
    expect(Object.isFrozen(report.rules)).toBe(true);
    expect(Object.isFrozen(report.deterministic)).toBe(true);
    expect(Object.isFrozen(report.narrative)).toBe(true);
  });

  it("produces equal output for the same AnalysisResult", () => {
    const analysis = makeCompletedAnalysis();
    const builder = createReportBuilder();

    expect(builder.build(analysis)).toEqual(builder.build(analysis));
  });

  it("does not modify AnalysisResult", () => {
    const analysis = makeCompletedAnalysis();
    const snapshot = JSON.stringify(analysis);

    createReportBuilder().build(analysis);

    expect(JSON.stringify(analysis)).toBe(snapshot);
  });
});

describe("Intelligence MVP narrative and report seal", () => {
  it("seals narrative from AnalysisResult without recomputing Projection", () => {
    const analysis = makeCompletedAnalysis();
    const report = createReportBuilder().build(analysis);

    expect(report.deterministic).toEqual(analysis.projection);
    expect(report.scenarios).toEqual(analysis.scenarios);
    expect(report.intelligenceConfidence).toEqual(analysis.intelligenceConfidence);
    expect(report.narrative.sections.length).toBeGreaterThan(0);
    expect(
      report.narrative.sections.some((section) =>
        section.body.toLowerCase().includes("recentform"),
      ),
    ).toBe(true);
    expect(report.summary.some((line) => line.startsWith("Most Likely:"))).toBe(
      true,
    );
    expect(
      report.summary.some((line) => line.startsWith("Prediction Confidence:")),
    ).toBe(true);
  });
});

describe("GenerateMatchReportUseCase", () => {
  it("returns AnalysisReport JSON directly after successful analysis", async () => {
    const analysis = makeCompletedAnalysis();
    const useCase = new GenerateMatchReportUseCase(
      { execute: async () => ({ ok: true, value: analysis }) },
      createReportBuilder(),
    );

    const result = await useCase.execute(matchId);

    expect(result).toEqual(createReportBuilder().build(analysis));
    expect("ok" in result).toBe(false);
  });

  it("preserves typed analysis failures", async () => {
    const useCase = new GenerateMatchReportUseCase(
      {
        execute: async () => ({
          error: {
            code: "EVIDENCE_NOT_FOUND",
            message: "Evidence was not found.",
          },
          ok: false,
        }),
      },
      createReportBuilder(),
    );

    await expect(useCase.execute(matchId)).resolves.toEqual({
      error: {
        code: "EVIDENCE_NOT_FOUND",
        message: "Evidence was not found.",
      },
      ok: false,
    });
  });

  it("converts unexpected analysis and report failures", async () => {
    const analysisFailure = new GenerateMatchReportUseCase(
      {
        execute: async () => {
          throw new Error("analysis failed");
        },
      },
      createReportBuilder(),
    );
    const reportFailure = new GenerateMatchReportUseCase(
      { execute: async () => ({ ok: true, value: makeCompletedAnalysis() }) },
      {
        build: () => {
          throw new Error("report failed");
        },
      },
    );

    await expect(analysisFailure.execute(matchId)).resolves.toMatchObject({
      error: { code: "ANALYSIS_FAILED" },
      ok: false,
    });
    await expect(reportFailure.execute(matchId)).resolves.toMatchObject({
      error: { code: "REPORT_BUILD_FAILED" },
      ok: false,
    });
  });
});

function seedOtherMatchHistoryRecord(
  repository: InMemoryEvaluationHistoryRepository,
): Promise<unknown> {
  const otherMatchId = "other-match";
  const prediction = Object.freeze({
    matchId: otherMatchId,
    projectionChecksum: "proj-other",
    projectionStatus: "completed_nonempty" as const,
    pHome: 0.6,
    pDraw: 0.25,
    pAway: 0.15,
    topScorelines: Object.freeze([
      Object.freeze({ homeGoals: 1, awayGoals: 0, probability: 0.12 }),
    ]),
    goalRange: Object.freeze({ range01: 0.3, range23: 0.45, range4Plus: 0.25 }),
    predictionConfidence: 70,
    confidenceBand: "high" as const,
    scenarios: Object.freeze({
      mostLikely: Object.freeze({
        slot: "mostLikely" as const,
        winner: "home" as const,
        homeGoals: 1,
        awayGoals: 0,
        probability: 0.6,
      }),
      secondLikely: Object.freeze({
        slot: "secondLikely" as const,
        winner: "draw" as const,
        homeGoals: 1,
        awayGoals: 1,
        probability: 0.25,
      }),
      upset: Object.freeze({
        slot: "upset" as const,
        winner: "away" as const,
        homeGoals: 0,
        awayGoals: 1,
        probability: 0.15,
      }),
    }),
    rules: Object.freeze([]),
    featureNames: Object.freeze(["homeTeam", "awayTeam"]),
    projectionModelVersion: "projection.v2.i2b.market",
    featureModelVersion: "feature.v2.i2b.market",
    ruleSetVersion: "rule.mvp.i2b.market",
  });

  const actual = createActualMatchResult({
    matchId: otherMatchId,
    homeGoals: 1,
    awayGoals: 0,
    winner: "home",
    totalGoals: 1,
    matchStatus: "FINISHED",
    providerId: "football:demo",
    providerSourceId: "demo:other-match:result",
    providerMethod: "recorded-snapshot",
    observedAt: "2026-07-01T15:00:00.000Z",
  });

  const evaluation = evaluatePrediction({
    prediction,
    actual,
    evaluatedAt: "2026-07-01T15:00:00.000Z",
  });

  const record = buildEvaluationHistoryRecord({
    predictionSnapshot: prediction,
    actualResult: actual,
    evaluation,
    homeTeam: "Other Home FC",
    awayTeam: "Other Away FC",
    matchDate: "2026-07-01T10:00:00.000Z",
    recordedAt: "2026-07-01T15:00:00.000Z",
  });

  return repository.save(record);
}

describe("GenerateMatchReportUseCase — A2 Prediction Calibration overlay", () => {
  it("attaches a population-wide calibration report even when this match has no History yet", async () => {
    const repository = new InMemoryEvaluationHistoryRepository();
    await seedOtherMatchHistoryRecord(repository);

    const analysis = makeCompletedAnalysis();
    const useCase = new GenerateMatchReportUseCase(
      { execute: async () => ({ ok: true, value: analysis }) },
      createReportBuilder(),
      repository,
    );

    const result = await useCase.execute(matchId);

    if ("ok" in result) {
      throw new Error("Expected a sealed AnalysisReport.");
    }

    expect(result.evaluationHistory).toBeUndefined();
    expect(result.calibration).toBeDefined();
    expect(result.calibration?.schemaVersion).toBe("calibration-report.mvp.a2");
    // Population-wide: includes the unrelated seeded match, not just this one.
    expect(result.calibration?.sampleSize).toBe(1);
    expect(result.calibration?.qualified).toBe(false);
    expect(result.calibration?.limitations.length).toBeGreaterThan(0);
  });

  it("never mutates Feature/Rule/Projection while attaching the calibration overlay", async () => {
    const repository = new InMemoryEvaluationHistoryRepository();
    const analysis = makeCompletedAnalysis();
    const useCase = new GenerateMatchReportUseCase(
      { execute: async () => ({ ok: true, value: analysis }) },
      createReportBuilder(),
      repository,
    );

    const result = await useCase.execute(matchId);

    if ("ok" in result) {
      throw new Error("Expected a sealed AnalysisReport.");
    }

    expect(result.deterministic).toEqual(analysis.projection);
    expect(result.features).toEqual(analysis.features);
    expect(result.rules).toEqual(analysis.ruleResults);
    expect(result.calibration?.sampleSize).toBe(0);
    expect(result.calibration?.qualified).toBe(false);
  });
});
