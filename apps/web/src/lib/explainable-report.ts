import type {
  AnalysisReportDto,
  FeatureDto,
  FeatureName,
  JsonValue,
  RuleResultDto,
} from "../types/analysis";
import type { EvidenceDto, EvidenceType } from "../types/evidence";
import type {
  ConfidenceLevel,
  EvidenceTimelineItemView,
  ExplainableReportView,
  FeatureImportanceItemView,
  GoalRangeView,
  MostLikelyScoreView,
  RuleEvaluationItemView,
  WinnerPredictionView,
} from "../types/explainable-report";
import type { MatchSummary } from "../types/match-center";
import { formatJsonValue, formatTimestamp } from "./utils";

const FEATURE_LABELS: Readonly<Record<FeatureName, string>> = Object.freeze({
  homeTeam: "Home Team",
  awayTeam: "Away Team",
  kickoff: "Kickoff",
});

const RULE_TITLES: Readonly<Record<string, string>> = Object.freeze({
  HOME_TEAM_PRESENT: "Home Team Present",
  AWAY_TEAM_PRESENT: "Away Team Present",
  KICKOFF_PRESENT: "Kickoff Present",
});

const EVIDENCE_TITLES: Readonly<Record<EvidenceType, string>> = Object.freeze({
  HEAD_TO_HEAD: "Head-to-head",
  INJURY: "Player injuries",
  LINEUP: "Lineup",
  MATCH_INFO: "Match information",
  NEWS: "News",
  ODDS: "Odds",
  RANKING: "Ranking",
  STATISTICS: "Statistics",
  TEAM_FORM: "Recent form",
  WEATHER: "Weather",
});

function roundPercent(value: number): number {
  return Math.round(value);
}

function resolveConfidence(passCount: number, ruleCount: number): ConfidenceLevel {
  if (ruleCount === 0) {
    return "Low";
  }

  const ratio = passCount / ruleCount;

  if (ratio >= 1) {
    return "Very High";
  }

  if (ratio >= 0.75) {
    return "High";
  }

  if (ratio >= 0.5) {
    return "Medium";
  }

  return "Low";
}

function confidencePercent(level: ConfidenceLevel): number {
  switch (level) {
    case "Very High":
      return 100;
    case "High":
      return 75;
    case "Medium":
      return 50;
    case "Low":
      return 25;
  }
}

function findRuleScore(rules: readonly RuleResultDto[], ruleName: string): number {
  const rule = rules.find((item) => item.ruleName === ruleName);
  return rule?.score ?? 0;
}

function buildWinnerPrediction(
  homeTeam: string,
  awayTeam: string,
  rules: readonly RuleResultDto[],
): WinnerPredictionView {
  const homeScore = Math.max(0, findRuleScore(rules, "HOME_TEAM_PRESENT"));
  const awayScore = Math.max(0, findRuleScore(rules, "AWAY_TEAM_PRESENT"));
  const total = homeScore + awayScore;

  if (total <= 0) {
    return Object.freeze({
      homeTeam,
      awayTeam,
      homePercent: 50,
      awayPercent: 50,
      recommendedTeam: null,
    });
  }

  const homePercent = roundPercent((homeScore / total) * 100);
  const awayPercent = 100 - homePercent;
  const recommendedTeam =
    homePercent === awayPercent
      ? null
      : homePercent > awayPercent
        ? homeTeam
        : awayTeam;

  return Object.freeze({
    homeTeam,
    awayTeam,
    homePercent,
    awayPercent,
    recommendedTeam,
  });
}

function buildMostLikelyScore(confidence: ConfidenceLevel): MostLikelyScoreView {
  return Object.freeze({
    available: false,
    homeGoals: null,
    awayGoals: null,
    confidence,
    note: "Scoreline is not included in the current deterministic report output.",
  });
}

function buildGoalRange(): GoalRangeView {
  return Object.freeze({
    available: false,
    options: Object.freeze([
      Object.freeze({ id: "0-1", label: "0-1 Goals", recommended: false }),
      Object.freeze({ id: "2-3", label: "2-3 Goals", recommended: false }),
      Object.freeze({ id: "4+", label: "4+ Goals", recommended: false }),
    ]),
    recommendedLabel: null,
    note: "Goal range is not included in the current deterministic report output.",
  });
}

function evidenceDetail(payload: Readonly<{ [key: string]: JsonValue }>): string {
  const keys = Object.keys(payload);

  if (keys.length === 0) {
    return "No payload details.";
  }

  return keys
    .slice(0, 4)
    .map((key) => `${key}: ${formatJsonValue(payload[key])}`)
    .join(" · ");
}

function buildEvidenceTimeline(
  evidence: readonly EvidenceDto[],
): readonly EvidenceTimelineItemView[] {
  return Object.freeze(
    [...evidence]
      .sort((left, right) => left.eventTime.localeCompare(right.eventTime))
      .map((item) =>
        Object.freeze({
          id: item.id,
          title: EVIDENCE_TITLES[item.type] ?? item.type,
          type: item.type,
          timestamp: item.eventTime,
          freshness: item.freshness,
          quality: item.quality,
          detail: evidenceDetail(item.payload),
        }),
      ),
  );
}

function featureWeight(
  feature: FeatureDto,
  rules: readonly RuleResultDto[],
): number {
  const linked = rules.filter((rule) =>
    rule.sourceFeatureIds.includes(feature.featureId),
  );

  if (linked.length === 0) {
    return 1;
  }

  return linked.reduce((total, rule) => total + Math.max(0, rule.score), 0);
}

function buildFeatureImportance(
  features: readonly FeatureDto[],
  rules: readonly RuleResultDto[],
): readonly FeatureImportanceItemView[] {
  const weights = features.map((feature) => featureWeight(feature, rules));
  const maxWeight = Math.max(...weights, 1);

  return Object.freeze(
    features.map((feature, index) =>
      Object.freeze({
        featureId: feature.featureId,
        label: FEATURE_LABELS[feature.name] ?? feature.name,
        percent: roundPercent(((weights[index] ?? 0) / maxWeight) * 100),
        valueLabel: formatJsonValue(feature.value),
      }),
    ),
  );
}

function buildRuleEvaluations(
  rules: readonly RuleResultDto[],
): readonly RuleEvaluationItemView[] {
  return Object.freeze(
    rules.map((rule) =>
      Object.freeze({
        ruleId: rule.ruleId,
        title: RULE_TITLES[rule.ruleName] ?? rule.ruleName,
        status: rule.status,
        weight: rule.score,
        explanation: rule.explanation,
      }),
    ),
  );
}

function formatScoreLabel(score: MostLikelyScoreView): string {
  if (!score.available || score.homeGoals === null || score.awayGoals === null) {
    return "Unavailable";
  }

  return `${score.homeGoals}-${score.awayGoals}`;
}

/**
 * Pure presentation mapper.
 * Projects existing analysis/evidence contracts into the Explainable Report view.
 * Does not invent match-outcome models beyond normalizing existing rule scores.
 */
export function buildExplainableReportView(
  match: MatchSummary,
  report: AnalysisReportDto,
  evidence: readonly EvidenceDto[],
): ExplainableReportView {
  const passCount = report.rules.filter((rule) => rule.status === "PASS").length;
  const ruleCount = report.rules.length;
  const confidenceLevel = resolveConfidence(passCount, ruleCount);
  const winnerPrediction = buildWinnerPrediction(
    match.homeTeam,
    match.awayTeam,
    report.rules,
  );
  const mostLikelyScore = buildMostLikelyScore(confidenceLevel);
  const goalRange = buildGoalRange();

  return Object.freeze({
    header: Object.freeze({
      competition: match.competition,
      kickoffTime: match.kickoffTime,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      matchId: match.id,
    }),
    winnerPrediction,
    mostLikelyScore,
    goalRange,
    confidence: Object.freeze({
      level: confidenceLevel,
      percent: confidencePercent(confidenceLevel),
      passCount,
      ruleCount,
    }),
    evidenceTimeline: buildEvidenceTimeline(evidence),
    featureImportance: buildFeatureImportance(report.features, report.rules),
    ruleEvaluations: buildRuleEvaluations(report.rules),
    finalRecommendation: Object.freeze({
      recommendedWinner: winnerPrediction.recommendedTeam ?? "Even signal",
      recommendedScore: formatScoreLabel(mostLikelyScore),
      recommendedGoalRange: goalRange.recommendedLabel ?? "Unavailable",
      confidence: confidenceLevel,
      summaryLines: report.summary,
    }),
  });
}

export function formatEvidenceTimestamp(value: string): string {
  return `${formatTimestamp(value)} UTC`;
}

export {
  EVIDENCE_TITLES,
  FEATURE_LABELS,
  RULE_TITLES,
  confidencePercent,
  resolveConfidence,
};
