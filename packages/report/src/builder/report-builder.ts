import type { AnalysisResult } from "@fas/analysis";
import type { Feature } from "@fas/feature";
import type { RuleResult } from "@fas/rule";
import {
  createAnalysisReport,
  type AnalysisReport,
} from "../domain/analysis-report.js";

function formatFeatureValue(feature: Feature): string {
  if (typeof feature.value === "string") {
    return feature.value;
  }

  return JSON.stringify(feature.value);
}

function featureSummary(feature: Feature): string {
  const value = formatFeatureValue(feature);

  switch (feature.name) {
    case "homeTeam":
      return `Home team: ${value}.`;
    case "awayTeam":
      return `Away team: ${value}.`;
    case "kickoff":
      return `Kickoff: ${value}.`;
  }
}

function failedRuleSummary(rule: RuleResult): string {
  return `Rule ${rule.ruleName} failed: ${rule.explanation}`;
}

function buildSummary(analysis: AnalysisResult): readonly string[] {
  const summary: string[] = [];
  const failedRules = analysis.ruleResults.filter((rule) => rule.status === "FAIL");

  if (failedRules.length === 0) {
    summary.push("Match information is complete.");
  } else {
    summary.push(...failedRules.map(failedRuleSummary));
  }

  summary.push(...analysis.features.map(featureSummary));
  return Object.freeze(summary);
}

export class ReportBuilder {
  build(analysis: AnalysisResult): AnalysisReport {
    return createAnalysisReport({
      reportId: `report:${analysis.matchId}:${analysis.generatedAt}`,
      matchId: analysis.matchId,
      generatedAt: analysis.generatedAt,
      summary: buildSummary(analysis),
      features: analysis.features,
      rules: analysis.ruleResults,
    });
  }
}
