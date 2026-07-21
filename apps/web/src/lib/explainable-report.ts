import type {
  AnalysisReportDto,
  FeatureDto,
  FeatureName,
  JsonValue,
  RuleResultDto,
} from "../types/analysis";
import type { EvidenceDto, EvidenceType } from "../types/evidence";
import type {
  AvailabilityAbsenceItemView,
  AvailabilitySummaryView,
  ConfidenceLevel,
  EvidenceTimelineItemView,
  ExplainableReportView,
  FeatureImportanceItemView,
  GoalRangeId,
  GoalRangeView,
  MostLikelyScoreView,
  PlayerContextItemView,
  PlayersContextView,
  RuleEvaluationItemView,
  VenueContextView,
  WinnerPredictionView,
} from "../types/explainable-report";
import type { MatchSummary } from "../types/match-center";
import { formatJsonValue, formatTimestamp } from "./utils";

const FEATURE_LABELS: Readonly<Record<FeatureName, string>> = Object.freeze({
  asianHandicapLean: "Asian Handicap Lean",
  asianHandicapLine: "Asian Handicap Line",
  attackRatingAway: "Away Attack Rating",
  attackRatingHome: "Home Attack Rating",
  awayTeam: "Away Team",
  defenseRatingAway: "Away Defense Rating",
  defenseRatingHome: "Home Defense Rating",
  h2hLean: "H2H Lean",
  h2hSampleSize: "H2H Sample Size",
  homeAdvantage: "Home Advantage",
  homeTeam: "Home Team",
  kickoff: "Kickoff",
  marketImpliedAway: "Market Implied Away",
  marketImpliedDraw: "Market Implied Draw",
  marketImpliedHome: "Market Implied Home",
  marketLean: "Market Lean",
  momentumAway: "Away Momentum",
  momentumHome: "Home Momentum",
});

const RULE_TITLES: Readonly<Record<string, string>> = Object.freeze({
  AWAY_ATTACK_EDGE: "Away Attack Edge",
  AWAY_TEAM_PRESENT: "Away Team Present",
  H2H_SUPPORTS_AWAY: "H2H Supports Away",
  H2H_SUPPORTS_HOME: "H2H Supports Home",
  HOME_ADVANTAGE_MATERIAL: "Material Home Advantage",
  HOME_ATTACK_EDGE: "Home Attack Edge",
  HOME_TEAM_PRESENT: "Home Team Present",
  KICKOFF_PRESENT: "Kickoff Present",
  MARKET_AH_LEAN_AWAY: "Asian Handicap Lean Away",
  MARKET_AH_LEAN_HOME: "Asian Handicap Lean Home",
  MARKET_LEAN_AWAY: "Market Lean Away",
  MARKET_LEAN_HOME: "Market Lean Home",
  MOMENTUM_AWAY: "Away Momentum Edge",
  MOMENTUM_HOME: "Home Momentum Edge",
});

const EVIDENCE_TITLES: Readonly<Record<EvidenceType, string>> = Object.freeze({
  HEAD_TO_HEAD: "Head-to-head",
  INJURY: "Injury",
  LINEUP: "Lineup",
  MATCH_INFO: "Match information",
  NEWS: "News",
  ODDS: "Odds",
  PLAYER: "Player",
  RANKING: "Ranking",
  STATISTICS: "Statistics",
  SUSPENSION: "Suspension",
  TEAM_FORM: "Recent form",
  VENUE: "Venue",
  WEATHER: "Weather",
});

function buildVenueContext(evidence: readonly EvidenceDto[]): {
  readonly headerLabel: string | null;
  readonly venue: VenueContextView;
} {
  const venueEvidence = evidence.find((item) => item.type === "VENUE");

  if (venueEvidence === undefined) {
    return {
      headerLabel: null,
      venue: Object.freeze({
        available: false,
        name: null,
        city: null,
        venueId: null,
        providerId: null,
        source: null,
        note: "Venue evidence is not available for this match.",
      }),
    };
  }

  const name =
    typeof venueEvidence.payload.name === "string"
      ? venueEvidence.payload.name
      : null;
  const city =
    typeof venueEvidence.payload.city === "string"
      ? venueEvidence.payload.city
      : null;
  const venueId =
    typeof venueEvidence.payload.venueId === "string"
      ? venueEvidence.payload.venueId
      : null;
  const headerLabel =
    name === null ? null : city === null ? name : `${name} · ${city}`;

  return {
    headerLabel,
    venue: Object.freeze({
      available: true,
      name,
      city,
      venueId,
      providerId: venueEvidence.providerId,
      source: venueEvidence.source,
      note: "Venue is factual match context from Evidence (not used by Rules or Projection).",
    }),
  };
}

function mapPlayerEvidence(item: EvidenceDto): PlayerContextItemView | null {
  if (item.type !== "PLAYER") {
    return null;
  }

  const name =
    typeof item.payload.name === "string" && item.payload.name.trim().length > 0
      ? item.payload.name.trim()
      : null;
  const playerId =
    typeof item.payload.playerId === "string" &&
    item.payload.playerId.trim().length > 0
      ? item.payload.playerId.trim()
      : null;
  const teamId =
    typeof item.payload.teamId === "string" && item.payload.teamId.trim().length > 0
      ? item.payload.teamId.trim()
      : null;
  const teamName =
    typeof item.payload.teamName === "string" &&
    item.payload.teamName.trim().length > 0
      ? item.payload.teamName.trim()
      : null;
  const teamSide =
    item.payload.teamSide === "home" || item.payload.teamSide === "away"
      ? item.payload.teamSide
      : null;

  if (
    name === null ||
    playerId === null ||
    teamId === null ||
    teamName === null ||
    teamSide === null
  ) {
    return null;
  }

  return Object.freeze({
    playerId,
    name,
    teamId,
    teamName,
    teamSide,
    position:
      typeof item.payload.position === "string" ? item.payload.position : null,
    number: typeof item.payload.number === "number" ? item.payload.number : null,
    nationality:
      typeof item.payload.nationality === "string" ? item.payload.nationality : null,
    photo: typeof item.payload.photo === "string" ? item.payload.photo : null,
    providerId: item.providerId,
    source: item.source,
  });
}

function buildPlayersContext(evidence: readonly EvidenceDto[]): PlayersContextView {
  const players = evidence
    .map(mapPlayerEvidence)
    .filter((item): item is PlayerContextItemView => item !== null);

  if (players.length === 0) {
    return Object.freeze({
      available: false,
      home: Object.freeze([]),
      away: Object.freeze([]),
      note: "Player evidence is not available for this match.",
    });
  }

  return Object.freeze({
    available: true,
    home: Object.freeze(players.filter((player) => player.teamSide === "home")),
    away: Object.freeze(players.filter((player) => player.teamSide === "away")),
    note: "Players are basic squad identity from Evidence (not used by Rules or Projection).",
  });
}

function mapAvailabilityEvidence(
  item: EvidenceDto,
): AvailabilityAbsenceItemView | null {
  if (item.type !== "INJURY" && item.type !== "SUSPENSION") {
    return null;
  }

  const kind =
    item.payload.kind === "injury" || item.payload.kind === "suspension"
      ? item.payload.kind
      : item.type === "INJURY"
        ? ("injury" as const)
        : ("suspension" as const);

  const playerName =
    typeof item.payload.playerName === "string" &&
    item.payload.playerName.trim().length > 0
      ? item.payload.playerName.trim()
      : typeof item.payload.name === "string" && item.payload.name.trim().length > 0
        ? item.payload.name.trim()
        : null;
  const playerId =
    typeof item.payload.playerId === "string" &&
    item.payload.playerId.trim().length > 0
      ? item.payload.playerId.trim()
      : null;
  const teamId =
    typeof item.payload.teamId === "string" && item.payload.teamId.trim().length > 0
      ? item.payload.teamId.trim()
      : null;
  const teamName =
    typeof item.payload.teamName === "string" &&
    item.payload.teamName.trim().length > 0
      ? item.payload.teamName.trim()
      : null;
  const teamSide =
    item.payload.teamSide === "home" || item.payload.teamSide === "away"
      ? item.payload.teamSide
      : null;

  if (
    playerName === null ||
    playerId === null ||
    teamId === null ||
    teamName === null ||
    teamSide === null
  ) {
    return null;
  }

  return Object.freeze({
    playerId,
    playerName,
    teamId,
    teamName,
    teamSide,
    kind,
    reason: typeof item.payload.reason === "string" ? item.payload.reason : null,
    providerId: item.providerId,
    source: item.source,
  });
}

function buildAvailabilitySummary(
  evidence: readonly EvidenceDto[],
): AvailabilitySummaryView {
  const absences = evidence
    .map(mapAvailabilityEvidence)
    .filter((item): item is AvailabilityAbsenceItemView => item !== null);

  if (absences.length === 0) {
    return Object.freeze({
      available: false,
      injuryCount: 0,
      suspensionCount: 0,
      totalCount: 0,
      injuries: Object.freeze([]),
      suspensions: Object.freeze([]),
      note: "Availability evidence is not available for this match. Absence of Facts is not a confirmation that all players are available.",
    });
  }

  const injuries = Object.freeze(absences.filter((item) => item.kind === "injury"));
  const suspensions = Object.freeze(
    absences.filter((item) => item.kind === "suspension"),
  );

  return Object.freeze({
    available: true,
    injuryCount: injuries.length,
    suspensionCount: suspensions.length,
    totalCount: absences.length,
    injuries,
    suspensions,
    note: "Availability Summary is composed from Injury and Suspension Evidence (not used by Rules or Projection).",
  });
}

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

function buildWinnerPrediction(
  homeTeam: string,
  awayTeam: string,
  report: AnalysisReportDto,
): WinnerPredictionView {
  const projection = report.deterministic;
  const homePercent = roundPercent(projection.pHome * 100);
  const awayPercent = roundPercent(projection.pAway * 100);
  const recommendedTeam =
    projection.recommendation === "lean_home"
      ? homeTeam
      : projection.recommendation === "lean_away"
        ? awayTeam
        : null;

  return Object.freeze({
    homeTeam,
    awayTeam,
    homePercent,
    awayPercent,
    recommendedTeam,
  });
}

function confidenceFromProjection(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) {
    return "Very High";
  }

  if (confidence >= 0.65) {
    return "High";
  }

  if (confidence >= 0.5) {
    return "Medium";
  }

  return "Low";
}

function buildMostLikelyScore(
  report: AnalysisReportDto,
  confidence: ConfidenceLevel,
): MostLikelyScoreView {
  const top = report.deterministic.topScorelines[0];

  if (top === undefined) {
    return Object.freeze({
      available: false,
      homeGoals: null,
      awayGoals: null,
      confidence,
      note: "Scoreline is unavailable for this report.",
    });
  }

  return Object.freeze({
    available: true,
    homeGoals: top.homeGoals,
    awayGoals: top.awayGoals,
    confidence,
    note: `Top scoreline probability ${(top.probability * 100).toFixed(1)}%.`,
  });
}

function buildGoalRange(report: AnalysisReportDto): GoalRangeView {
  const { range01, range23, range4Plus } = report.deterministic.goalRange;
  const options: ReadonlyArray<{
    readonly id: GoalRangeId;
    readonly label: string;
    readonly value: number;
  }> = Object.freeze([
    Object.freeze({ id: "0-1" as const, label: "0-1 Goals", value: range01 }),
    Object.freeze({ id: "2-3" as const, label: "2-3 Goals", value: range23 }),
    Object.freeze({ id: "4+" as const, label: "4+ Goals", value: range4Plus }),
  ]);
  const recommended = [...options].sort(
    (left, right) => right.value - left.value,
  )[0];

  return Object.freeze({
    available: true,
    options: Object.freeze(
      options.map((option) =>
        Object.freeze({
          id: option.id,
          label: option.label,
          recommended: option.id === recommended?.id,
        }),
      ),
    ),
    recommendedLabel: recommended?.label ?? null,
    note: "Goal-range probabilities assembled from the sealed deterministic projection.",
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
          timestamp: item.timestamp ?? item.collectedAt ?? item.eventTime,
          freshness: item.freshness,
          quality: item.quality,
          detail: evidenceDetail(item.payload),
          providerId: item.providerId ?? item.provenance?.providerId ?? "unknown",
          source: item.source,
          provenanceMethod: item.provenance?.method ?? "unknown",
          confidence: item.confidence ?? "unknown",
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

function featurePolarity(
  feature: FeatureDto,
  rules: readonly RuleResultDto[],
): "negative" | "positive" {
  const linked = rules.filter((rule) =>
    rule.sourceFeatureIds.includes(feature.featureId),
  );

  if (linked.some((rule) => rule.status === "FAIL")) {
    return "negative";
  }

  // Away-side features render as opposing contribution bars for visual contrast.
  if (feature.name === "awayTeam") {
    return "negative";
  }

  return "positive";
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
        polarity: featurePolarity(feature, rules),
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
        weight: rule.weight,
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
 * Projects sealed analysis/evidence/projection contracts into the Explainable Report view.
 * Does not recompute xG, probabilities, confidence, or recommendations.
 */
export function buildExplainableReportView(
  match: MatchSummary,
  report: AnalysisReportDto,
  evidence: readonly EvidenceDto[],
): ExplainableReportView {
  const passCount = report.rules.filter((rule) => rule.status === "PASS").length;
  const ruleCount = report.rules.length;
  const confidenceLevel = confidenceFromProjection(report.deterministic.confidence);
  const winnerPrediction = buildWinnerPrediction(
    match.homeTeam,
    match.awayTeam,
    report,
  );
  const mostLikelyScore = buildMostLikelyScore(report, confidenceLevel);
  const goalRange = buildGoalRange(report);
  const recommendationLabel =
    report.deterministic.recommendation === "lean_home"
      ? match.homeTeam
      : report.deterministic.recommendation === "lean_away"
        ? match.awayTeam
        : report.deterministic.recommendation === "lean_draw"
          ? "Draw lean"
          : report.deterministic.recommendation === "cautious"
            ? "Cautious"
            : "Insufficient evidence";

  const venueContext = buildVenueContext(evidence);
  const playersContext = buildPlayersContext(evidence);
  const availabilityContext = buildAvailabilitySummary(evidence);

  return Object.freeze({
    header: Object.freeze({
      competition: match.competition,
      kickoffTime: match.kickoffTime,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      matchId: match.id,
      venueLabel: venueContext.headerLabel,
    }),
    venue: venueContext.venue,
    players: playersContext,
    availability: availabilityContext,
    winnerPrediction,
    mostLikelyScore,
    goalRange,
    confidence: Object.freeze({
      level: confidenceLevel,
      percent: roundPercent(report.deterministic.confidence * 100),
      passCount,
      ruleCount,
    }),
    evidenceTimeline: buildEvidenceTimeline(evidence),
    featureImportance: buildFeatureImportance(report.features, report.rules),
    ruleEvaluations: buildRuleEvaluations(report.rules),
    finalRecommendation: Object.freeze({
      recommendedWinner: recommendationLabel,
      recommendedScore: formatScoreLabel(mostLikelyScore),
      recommendedGoalRange: goalRange.recommendedLabel ?? "Unavailable",
      confidence: confidenceLevel,
      summaryLines: report.summary,
      narrativeSections: Object.freeze(
        report.narrative.sections.map((section) =>
          Object.freeze({ title: section.title, body: section.body }),
        ),
      ),
      narrativeDisclaimer: report.narrative.disclaimer,
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
