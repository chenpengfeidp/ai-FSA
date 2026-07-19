import type { AnalysisResult, DeterministicMatchProjection } from "@fas/analysis";
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
  if (feature.explanation.length > 0) {
    return feature.explanation;
  }

  const value = formatFeatureValue(feature);

  switch (feature.name) {
    case "homeTeam":
      return `Home team: ${value}.`;
    case "awayTeam":
      return `Away team: ${value}.`;
    case "kickoff":
      return `Kickoff: ${value}.`;
    default:
      return `${feature.name}: ${value}.`;
  }
}

function failedRuleSummary(rule: RuleResult): string {
  return `Rule ${rule.ruleName} failed: ${rule.explanation}`;
}

function projectionSummary(projection: DeterministicMatchProjection): string {
  return `Projection ${projection.recommendation} (H ${projection.pHome.toFixed(3)} / D ${projection.pDraw.toFixed(3)} / A ${projection.pAway.toFixed(3)}).`;
}

function isPresenceRule(rule: RuleResult): boolean {
  return (
    rule.ruleName === "HOME_TEAM_PRESENT" ||
    rule.ruleName === "AWAY_TEAM_PRESENT" ||
    rule.ruleName === "KICKOFF_PRESENT"
  );
}

function buildSummary(analysis: AnalysisResult): readonly string[] {
  const summary: string[] = [];
  const failedPresenceRules = analysis.ruleResults.filter(
    (rule) => isPresenceRule(rule) && rule.status === "FAIL",
  );

  if (failedPresenceRules.length === 0) {
    summary.push("Match information is complete.");
  } else {
    summary.push(...failedPresenceRules.map(failedRuleSummary));
  }

  summary.push(...analysis.features.map(featureSummary));
  summary.push(projectionSummary(analysis.projection));
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
      deterministic: analysis.projection,
    });
  }
}
