import {
  computeDeterministicMatchProjection,
  createAnalysisResult,
  type AnalysisResult,
} from "@fas/analysis";
import { createEvidence } from "@fas/evidence";
import { FeatureExtractor } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { RuleEvaluator } from "@fas/rule";
import { describe, expect, it } from "vitest";
import { GenerateMatchReportUseCase, ReportBuilder } from "../src/index.js";

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
    generatedAt,
  });
}

describe("ReportBuilder", () => {
  it("builds a successful deterministic match report without recomputing projection", () => {
    const analysis = makeCompletedAnalysis();
    const report = new ReportBuilder().build(analysis);

    expect(report.reportId).toBe(`report:match-1:${generatedAt}`);
    expect(report.deterministic).toEqual(analysis.projection);
    expect(report.deterministic.pHome).toBe(analysis.projection.pHome);
    expect(report.summary.some((line) => line.startsWith("Projection "))).toBe(true);
    expect(report.features).toEqual(analysis.features);
    expect(report.rules).toEqual(analysis.ruleResults);
    expect(report.narrative.epistemicKind).toBe("inference");
    expect(report.narrative.sections.length).toBeGreaterThan(0);
    expect(report.narrative.sections[0]?.body).toContain("were not recomputed");
  });

  it("returns a deeply immutable report", () => {
    const report = new ReportBuilder().build(makeCompletedAnalysis());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.summary)).toBe(true);
    expect(Object.isFrozen(report.features)).toBe(true);
    expect(Object.isFrozen(report.rules)).toBe(true);
    expect(Object.isFrozen(report.deterministic)).toBe(true);
    expect(Object.isFrozen(report.narrative)).toBe(true);
  });

  it("produces equal output for the same AnalysisResult", () => {
    const analysis = makeCompletedAnalysis();
    const builder = new ReportBuilder();

    expect(builder.build(analysis)).toEqual(builder.build(analysis));
  });

  it("does not modify AnalysisResult", () => {
    const analysis = makeCompletedAnalysis();
    const snapshot = JSON.stringify(analysis);

    new ReportBuilder().build(analysis);

    expect(JSON.stringify(analysis)).toBe(snapshot);
  });
});

describe("GenerateMatchReportUseCase", () => {
  it("returns AnalysisReport JSON directly after successful analysis", async () => {
    const analysis = makeCompletedAnalysis();
    const useCase = new GenerateMatchReportUseCase(
      { execute: async () => ({ ok: true, value: analysis }) },
      new ReportBuilder(),
    );

    const result = await useCase.execute(matchId);

    expect(result).toEqual(new ReportBuilder().build(analysis));
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
      new ReportBuilder(),
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
      new ReportBuilder(),
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
