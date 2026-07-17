import { createAnalysisResult, type AnalysisResult } from "@fas/analysis";
import { createEvidence } from "@fas/evidence";
import { createFeature, type Feature, type FeatureName } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { createRuleResult, type RuleName, type RuleResult } from "@fas/rule";
import { describe, expect, it } from "vitest";
import { GenerateMatchReportUseCase, ReportBuilder } from "../src/index.js";

const matchId = createMatchId("match-1");
const generatedAt = "2026-07-17T10:00:00Z";

const featureValues = {
  awayTeam: "Chelsea",
  homeTeam: "Liverpool",
  kickoff: "2026-08-01T19:30:00Z",
} as const;

const ruleDefinitions = {
  AWAY_TEAM_PRESENT: {
    featureName: "awayTeam",
    ruleId: "rule:away-team-present:v1",
  },
  HOME_TEAM_PRESENT: {
    featureName: "homeTeam",
    ruleId: "rule:home-team-present:v1",
  },
  KICKOFF_PRESENT: {
    featureName: "kickoff",
    ruleId: "rule:kickoff-present:v1",
  },
} as const;

function makeFeature(name: FeatureName): Feature {
  return createFeature({
    featureId: `feature:evidence-1:${name}`,
    matchId,
    name,
    value: featureValues[name],
    sourceEvidenceId: "evidence-1",
    generatedAt,
  });
}

function makeRule(ruleName: RuleName, pass = true): RuleResult {
  const definition = ruleDefinitions[ruleName];

  return createRuleResult({
    ruleId: definition.ruleId,
    matchId,
    ruleName,
    status: pass ? "PASS" : "FAIL",
    score: pass ? 1 : 0,
    explanation: pass
      ? `${ruleName} passed because its source Feature is present.`
      : `${ruleName} failed because its source Feature is missing.`,
    sourceFeatureIds: pass ? [`feature:evidence-1:${definition.featureName}`] : [],
    evaluatedAt: generatedAt,
  });
}

function makeAnalysis(
  features: readonly Feature[] = [
    makeFeature("homeTeam"),
    makeFeature("awayTeam"),
    makeFeature("kickoff"),
  ],
  rules: readonly RuleResult[] = [
    makeRule("HOME_TEAM_PRESENT"),
    makeRule("AWAY_TEAM_PRESENT"),
    makeRule("KICKOFF_PRESENT"),
  ],
): AnalysisResult {
  const evidence = createEvidence({
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
  });

  return createAnalysisResult({
    matchId,
    evidence,
    features,
    ruleResults: rules,
    generatedAt,
  });
}

describe("ReportBuilder", () => {
  it("builds a successful deterministic match report", () => {
    const analysis = makeAnalysis();

    const report = new ReportBuilder().build(analysis);

    expect(report.reportId).toBe(`report:match-1:${generatedAt}`);
    expect(report.matchId).toBe("match-1");
    expect(report.generatedAt).toBe(generatedAt);
    expect(report.summary).toEqual([
      "Match information is complete.",
      "Home team: Liverpool.",
      "Away team: Chelsea.",
      "Kickoff: 2026-08-01T19:30:00Z.",
    ]);
    expect(report.features).toEqual(analysis.features);
    expect(report.rules).toEqual(analysis.ruleResults);
  });

  it("reports a missing Feature from its failed RuleResult", () => {
    const analysis = makeAnalysis(
      [makeFeature("awayTeam"), makeFeature("kickoff")],
      [
        makeRule("HOME_TEAM_PRESENT", false),
        makeRule("AWAY_TEAM_PRESENT"),
        makeRule("KICKOFF_PRESENT"),
      ],
    );

    const report = new ReportBuilder().build(analysis);

    expect(report.summary).toEqual([
      "Rule HOME_TEAM_PRESENT failed: HOME_TEAM_PRESENT failed because its source Feature is missing.",
      "Away team: Chelsea.",
      "Kickoff: 2026-08-01T19:30:00Z.",
    ]);
  });

  it("includes deterministic failure text while preserving present Features", () => {
    const analysis = makeAnalysis(undefined, [
      makeRule("HOME_TEAM_PRESENT", false),
      makeRule("AWAY_TEAM_PRESENT"),
      makeRule("KICKOFF_PRESENT"),
    ]);

    const report = new ReportBuilder().build(analysis);

    expect(report.summary[0]).toBe(
      "Rule HOME_TEAM_PRESENT failed: HOME_TEAM_PRESENT failed because its source Feature is missing.",
    );
    expect(report.summary).toContain("Home team: Liverpool.");
    expect(report.features).toHaveLength(3);
  });

  it("preserves Feature and RuleResult ordering", () => {
    const features = [
      makeFeature("kickoff"),
      makeFeature("homeTeam"),
      makeFeature("awayTeam"),
    ] as const;
    const rules = [
      makeRule("KICKOFF_PRESENT"),
      makeRule("HOME_TEAM_PRESENT"),
      makeRule("AWAY_TEAM_PRESENT"),
    ] as const;

    const report = new ReportBuilder().build(makeAnalysis(features, rules));

    expect(report.features.map(({ name }) => name)).toEqual([
      "kickoff",
      "homeTeam",
      "awayTeam",
    ]);
    expect(report.rules.map(({ ruleName }) => ruleName)).toEqual([
      "KICKOFF_PRESENT",
      "HOME_TEAM_PRESENT",
      "AWAY_TEAM_PRESENT",
    ]);
    expect(report.summary.slice(1)).toEqual([
      "Kickoff: 2026-08-01T19:30:00Z.",
      "Home team: Liverpool.",
      "Away team: Chelsea.",
    ]);
  });

  it("returns a deeply immutable report", () => {
    const report = new ReportBuilder().build(makeAnalysis());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.summary)).toBe(true);
    expect(Object.isFrozen(report.features)).toBe(true);
    expect(Object.isFrozen(report.rules)).toBe(true);
    expect(report.features.every(Object.isFrozen)).toBe(true);
    expect(report.rules.every(Object.isFrozen)).toBe(true);
    expect(
      report.rules.every(({ sourceFeatureIds }) =>
        Object.isFrozen(sourceFeatureIds),
      ),
    ).toBe(true);
  });

  it("produces equal output for the same AnalysisResult", () => {
    const analysis = makeAnalysis();
    const builder = new ReportBuilder();

    expect(builder.build(analysis)).toEqual(builder.build(analysis));
  });

  it("does not modify AnalysisResult", () => {
    const analysis = makeAnalysis();
    const snapshot = JSON.stringify(analysis);

    new ReportBuilder().build(analysis);

    expect(JSON.stringify(analysis)).toBe(snapshot);
  });
});

describe("GenerateMatchReportUseCase", () => {
  it("returns AnalysisReport JSON directly after successful analysis", () => {
    const analysis = makeAnalysis();
    const useCase = new GenerateMatchReportUseCase(
      { execute: () => ({ ok: true, value: analysis }) },
      new ReportBuilder(),
    );

    const result = useCase.execute(matchId);

    expect(result).toEqual(new ReportBuilder().build(analysis));
    expect("ok" in result).toBe(false);
  });

  it("preserves typed analysis failures", () => {
    const useCase = new GenerateMatchReportUseCase(
      {
        execute: () => ({
          error: {
            code: "EVIDENCE_NOT_FOUND",
            message: "Evidence was not found.",
          },
          ok: false,
        }),
      },
      new ReportBuilder(),
    );

    expect(useCase.execute(matchId)).toEqual({
      error: {
        code: "EVIDENCE_NOT_FOUND",
        message: "Evidence was not found.",
      },
      ok: false,
    });
  });

  it("converts unexpected analysis and report failures", () => {
    const analysisFailure = new GenerateMatchReportUseCase(
      {
        execute: () => {
          throw new Error("analysis failed");
        },
      },
      new ReportBuilder(),
    );
    const reportFailure = new GenerateMatchReportUseCase(
      { execute: () => ({ ok: true, value: makeAnalysis() }) },
      {
        build: () => {
          throw new Error("report failed");
        },
      },
    );

    expect(analysisFailure.execute(matchId)).toMatchObject({
      error: { code: "ANALYSIS_FAILED" },
      ok: false,
    });
    expect(reportFailure.execute(matchId)).toMatchObject({
      error: { code: "REPORT_BUILD_FAILED" },
      ok: false,
    });
  });
});
