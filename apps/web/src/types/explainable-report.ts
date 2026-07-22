import type { RuleStatus } from "./analysis";
import type { EvidenceFreshness, EvidenceQuality, EvidenceType } from "./evidence";

export type ConfidenceLevel = "Low" | "Medium" | "High" | "Very High";

export type GoalRangeId = "0-1" | "2-3" | "4+";

export interface ExplainableMatchHeader {
  readonly competition: string;
  readonly kickoffTime: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly matchId: string;
  readonly venueLabel: string | null;
}

export interface VenueContextView {
  readonly available: boolean;
  readonly name: string | null;
  readonly city: string | null;
  readonly venueId: string | null;
  readonly providerId: string | null;
  readonly source: string | null;
  readonly note: string;
}

export interface PlayerContextItemView {
  readonly playerId: string;
  readonly name: string;
  readonly teamId: string;
  readonly teamName: string;
  readonly teamSide: "away" | "home";
  readonly position: string | null;
  readonly number: number | null;
  readonly nationality: string | null;
  readonly photo: string | null;
  readonly providerId: string;
  readonly source: string;
}

export interface PlayersContextView {
  readonly available: boolean;
  readonly home: readonly PlayerContextItemView[];
  readonly away: readonly PlayerContextItemView[];
  readonly note: string;
}

export type AvailabilityKind = "injury" | "suspension";

export interface AvailabilityAbsenceItemView {
  readonly playerId: string;
  readonly playerName: string;
  readonly teamId: string;
  readonly teamName: string;
  readonly teamSide: "away" | "home";
  readonly kind: AvailabilityKind;
  readonly reason: string | null;
  readonly providerId: string;
  readonly source: string;
}

export interface AvailabilitySummaryView {
  readonly available: boolean;
  readonly injuryCount: number;
  readonly suspensionCount: number;
  readonly totalCount: number;
  readonly injuries: readonly AvailabilityAbsenceItemView[];
  readonly suspensions: readonly AvailabilityAbsenceItemView[];
  readonly note: string;
}

export interface RefereeContextView {
  readonly available: boolean;
  readonly name: string | null;
  readonly country: string | null;
  readonly league: string | null;
  readonly appearances: number | null;
  readonly yellowCardsPerMatch: number | null;
  readonly redCardsPerMatch: number | null;
  readonly providerId: string | null;
  readonly source: string | null;
  readonly note: string;
}

export interface LineupPlayerItemView {
  readonly playerId: string;
  readonly name: string;
  readonly number: number | null;
  readonly position: string | null;
  readonly grid: string | null;
}

export interface TeamLineupView {
  readonly teamSide: "away" | "home";
  readonly teamName: string;
  readonly formation: string | null;
  readonly startXI: readonly LineupPlayerItemView[];
  readonly substitutes: readonly LineupPlayerItemView[];
  readonly providerId: string;
  readonly source: string;
}

export interface LineupsContextView {
  readonly available: boolean;
  readonly home: TeamLineupView | null;
  readonly away: TeamLineupView | null;
  readonly note: string;
}

export type AdvancedStatsScope = "fixture" | "season-average";

export interface AdvancedTeamStatisticsView {
  readonly teamSide: "away" | "home";
  readonly scope: AdvancedStatsScope;
  readonly shotsTotal: number | null;
  readonly shotsOnTarget: number | null;
  readonly shotsOffTarget: number | null;
  readonly possessionPct: number | null;
  readonly corners: number | null;
  readonly yellowCards: number | null;
  readonly redCards: number | null;
  readonly attacks: number | null;
  readonly dangerousAttacks: number | null;
  readonly fouls: number | null;
  readonly saves: number | null;
  readonly passingAccuracyPct: number | null;
  readonly shotsForPerMatch: number | null;
  readonly shotsAgainstPerMatch: number | null;
  readonly providerId: string;
  readonly source: string;
}

export interface AdvancedStatisticsContextView {
  readonly available: boolean;
  readonly home: AdvancedTeamStatisticsView | null;
  readonly away: AdvancedTeamStatisticsView | null;
  readonly note: string;
}

export type ExpectedGoalsWindowId =
  | "overall"
  | "home"
  | "away"
  | "recent"
  | "last5"
  | "last10"
  | "fixture";

export interface ExpectedGoalsMetricsView {
  readonly xg: number | null;
  readonly xga: number | null;
  readonly nonPenaltyXg: number | null;
  readonly nonPenaltyXga: number | null;
  readonly expectedPoints: number | null;
  readonly expectedGoalDifference: number | null;
}

export interface ExpectedGoalsRecordView {
  readonly teamSide: "away" | "home";
  readonly teamName: string;
  readonly window: ExpectedGoalsWindowId;
  readonly competitionName: string | null;
  readonly season: string | null;
  readonly observedAt: string;
  readonly metrics: ExpectedGoalsMetricsView;
  readonly providerId: string;
  readonly source: string;
  readonly provenanceMethod: string;
}

export interface ExpectedGoalsContextView {
  readonly available: boolean;
  readonly records: readonly ExpectedGoalsRecordView[];
  readonly note: string;
}

export interface WinnerPredictionView {
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly homePercent: number;
  readonly awayPercent: number;
  readonly recommendedTeam: string | null;
}

export interface MostLikelyScoreView {
  readonly available: boolean;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly confidence: ConfidenceLevel;
  readonly note: string;
}

export interface GoalRangeOptionView {
  readonly id: GoalRangeId;
  readonly label: string;
  readonly recommended: boolean;
}

export interface GoalRangeView {
  readonly available: boolean;
  readonly options: readonly GoalRangeOptionView[];
  readonly recommendedLabel: string | null;
  readonly note: string;
}

export interface ConfidenceMeterView {
  readonly level: ConfidenceLevel;
  readonly percent: number;
  readonly passCount: number;
  readonly ruleCount: number;
}

export interface EvidenceTimelineItemView {
  readonly id: string;
  readonly title: string;
  readonly type: EvidenceType;
  readonly timestamp: string;
  readonly freshness: EvidenceFreshness;
  readonly quality: EvidenceQuality;
  readonly detail: string;
  /** FAS provider registry id (Evidence source display). */
  readonly providerId: string;
  readonly source: string;
  readonly provenanceMethod: string;
  readonly confidence: string;
}

export type FeaturePolarity = "negative" | "positive";

export interface FeatureImportanceItemView {
  readonly featureId: string;
  readonly label: string;
  readonly percent: number;
  readonly valueLabel: string;
  /** Presentation polarity for contribution bars (rule outcome + feature side). */
  readonly polarity: FeaturePolarity;
}

export interface RuleEvaluationItemView {
  readonly ruleId: string;
  readonly title: string;
  readonly status: RuleStatus;
  readonly weight: number;
  readonly explanation: string;
}

export interface NarrativeSectionView {
  readonly title: string;
  readonly body: string;
}

export interface FinalRecommendationView {
  readonly recommendedWinner: string;
  readonly recommendedScore: string;
  readonly recommendedGoalRange: string;
  readonly confidence: ConfidenceLevel;
  readonly summaryLines: readonly string[];
  readonly narrativeSections: readonly NarrativeSectionView[];
  readonly narrativeDisclaimer: string;
}

export interface ExplainableReportView {
  readonly header: ExplainableMatchHeader;
  readonly venue: VenueContextView;
  readonly referee: RefereeContextView;
  readonly players: PlayersContextView;
  readonly lineups: LineupsContextView;
  readonly advancedStatistics: AdvancedStatisticsContextView;
  readonly expectedGoals: ExpectedGoalsContextView;
  readonly availability: AvailabilitySummaryView;
  readonly winnerPrediction: WinnerPredictionView;
  readonly mostLikelyScore: MostLikelyScoreView;
  readonly goalRange: GoalRangeView;
  readonly confidence: ConfidenceMeterView;
  readonly evidenceTimeline: readonly EvidenceTimelineItemView[];
  readonly featureImportance: readonly FeatureImportanceItemView[];
  readonly ruleEvaluations: readonly RuleEvaluationItemView[];
  readonly finalRecommendation: FinalRecommendationView;
}
