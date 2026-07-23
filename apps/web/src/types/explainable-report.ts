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

export type ClubIntelligenceWindowId = "current" | "season";

export interface ClubIntelligenceMetricsView {
  readonly leagueRank: number | null;
  readonly leaguePoints: number | null;
  readonly goalDifference: number | null;
  readonly goalsScored: number | null;
  readonly goalsConceded: number | null;
  readonly wins: number | null;
  readonly draws: number | null;
  readonly losses: number | null;
  readonly played: number | null;
  readonly homePlayed: number | null;
  readonly homeWins: number | null;
  readonly homeDraws: number | null;
  readonly homeLosses: number | null;
  readonly homeGoalsScored: number | null;
  readonly homeGoalsConceded: number | null;
  readonly awayPlayed: number | null;
  readonly awayWins: number | null;
  readonly awayDraws: number | null;
  readonly awayLosses: number | null;
  readonly awayGoalsScored: number | null;
  readonly awayGoalsConceded: number | null;
  readonly currentForm: string | null;
  readonly promotionRelegationStatus: string | null;
  readonly managerName: string | null;
  readonly managerStartDate: string | null;
  readonly managerTenureDays: number | null;
}

export interface ClubIntelligenceRecordView {
  readonly teamSide: "away" | "home";
  readonly teamName: string;
  readonly window: ClubIntelligenceWindowId;
  readonly competitionName: string | null;
  readonly season: string | null;
  readonly observedAt: string;
  readonly metrics: ClubIntelligenceMetricsView;
  readonly providerId: string;
  readonly source: string;
  readonly provenanceMethod: string;
}

export interface ClubIntelligenceContextView {
  readonly available: boolean;
  readonly records: readonly ClubIntelligenceRecordView[];
  readonly note: string;
}

export interface MatchContextMetricsView {
  readonly restDays: number | null;
  readonly daysSinceLastMatch: number | null;
  readonly daysUntilNextMatch: number | null;
  readonly matchesInLast7Days: number | null;
  readonly matchesInLast14Days: number | null;
  readonly fixtureCongestion: number | null;
  readonly homeAwayContext: "away" | "home" | null;
  readonly travelContext: "away" | "home" | null;
  readonly venueCity: string | null;
  readonly competitionKind: string | null;
  readonly competitionTypeLabel: string | null;
  readonly isKnockout: boolean | null;
  readonly roundLabel: string | null;
  readonly leg: "first" | "second" | null;
  readonly aggregateScore: string | null;
}

export interface MatchContextRecordView {
  readonly teamSide: "away" | "home";
  readonly teamName: string;
  readonly competitionName: string | null;
  readonly season: string | null;
  readonly observedAt: string;
  readonly metrics: MatchContextMetricsView;
  readonly providerId: string;
  readonly source: string;
  readonly provenanceMethod: string;
}

export interface MatchContextEvidenceView {
  readonly available: boolean;
  readonly records: readonly MatchContextRecordView[];
  readonly note: string;
}

export type MarketTypeView = "asian_handicap" | "european_1x2" | "over_under";

export type MarketSelectionView =
  | "asian_away"
  | "asian_home"
  | "away"
  | "draw"
  | "home"
  | "over"
  | "under";

export interface MarketEvidenceRecordView {
  readonly marketType: MarketTypeView;
  readonly selection: MarketSelectionView;
  readonly line: number | null;
  readonly openingValue: number | null;
  readonly currentValue: number | null;
  readonly closingValue: number | null;
  readonly movement: number | null;
  readonly lineMovement: number | null;
  readonly observedAt: string;
  readonly marketSource: string | null;
}

export interface MarketEvidenceSummaryView {
  readonly observedAt: string;
  readonly marketSource: string | null;
  readonly homeOdds: number | null;
  readonly drawOdds: number | null;
  readonly awayOdds: number | null;
  readonly asianHandicapLine: number | null;
  readonly asianHandicapHomeOdds: number | null;
  readonly asianHandicapAwayOdds: number | null;
  readonly overUnderLine: number | null;
  readonly overOdds: number | null;
  readonly underOdds: number | null;
  readonly openingHomeOdds: number | null;
  readonly openingDrawOdds: number | null;
  readonly openingAwayOdds: number | null;
  readonly closingHomeOdds: number | null;
  readonly closingDrawOdds: number | null;
  readonly closingAwayOdds: number | null;
  readonly oddsMovementHome: number | null;
  readonly oddsMovementDraw: number | null;
  readonly oddsMovementAway: number | null;
  readonly asianHandicapOpeningLine: number | null;
  readonly handicapMovement: number | null;
  readonly overUnderOpeningLine: number | null;
  readonly overUnderLineMovement: number | null;
  readonly publicBettingHomePct: number | null;
  readonly publicBettingDrawPct: number | null;
  readonly publicBettingAwayPct: number | null;
  readonly bettingVolume: number | null;
  readonly sharpMoneyIndicator: boolean | string | null;
}

export interface MarketEvidenceView {
  readonly available: boolean;
  readonly summary: MarketEvidenceSummaryView | null;
  readonly markets: readonly MarketEvidenceRecordView[];
  readonly providerId: string | null;
  readonly source: string | null;
  readonly provenanceMethod: string | null;
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
  readonly clubIntelligence: ClubIntelligenceContextView;
  readonly matchContext: MatchContextEvidenceView;
  readonly marketEvidence: MarketEvidenceView;
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
