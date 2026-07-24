export type JsonValue =
  | boolean
  | null
  | number
  | string
  | readonly JsonValue[]
  | Readonly<{ [key: string]: JsonValue }>;

export type FeatureName =
  | "asianHandicapLean"
  | "asianHandicapLine"
  | "attackEfficiencyAway"
  | "attackEfficiencyHome"
  | "attackRatingAway"
  | "attackRatingHome"
  | "availabilityPenaltyAway"
  | "availabilityPenaltyHome"
  | "awayTeam"
  | "awayLeagueStrength"
  | "chanceCreationAway"
  | "chanceCreationHome"
  | "clubAttackStrengthAway"
  | "clubAttackStrengthHome"
  | "clubDefensiveStrengthAway"
  | "clubDefensiveStrengthHome"
  | "clubStrengthAway"
  | "clubStrengthHome"
  | "defenseRatingAway"
  | "defenseRatingHome"
  | "disciplineRiskAway"
  | "disciplineRiskHome"
  | "fatigueIndexAway"
  | "fatigueIndexHome"
  | "finishingEfficiencyAway"
  | "finishingEfficiencyHome"
  | "formAtHomeAway"
  | "formAtHomeHome"
  | "formOnRoadAway"
  | "formOnRoadHome"
  | "formStrengthAway"
  | "formStrengthHome"
  | "goalDifferenceStrengthAway"
  | "goalDifferenceStrengthHome"
  | "goalkeeperReliabilityAway"
  | "goalkeeperReliabilityHome"
  | "goalsConcededRateAway"
  | "goalsConcededRateHome"
  | "goalsScoredRateAway"
  | "goalsScoredRateHome"
  | "h2hLean"
  | "h2hSampleSize"
  | "homeAdvantage"
  | "homeLeagueStrength"
  | "homeStability"
  | "homeTeam"
  | "keyPlayerAvailabilityAway"
  | "keyPlayerAvailabilityHome"
  | "kickoff"
  | "knockoutContext"
  | "leagueStrengthAway"
  | "leagueStrengthHome"
  | "managerStabilityAway"
  | "managerStabilityHome"
  | "marketConsensus"
  | "marketImpliedAway"
  | "marketImpliedDraw"
  | "marketImpliedHome"
  | "marketLean"
  | "marketVolatility"
  | "momentum"
  | "momentumAway"
  | "momentumHome"
  | "playerAttackContributionAway"
  | "playerAttackContributionHome"
  | "playerAvailabilityImpactAway"
  | "playerAvailabilityImpactHome"
  | "pointsPerMatchAway"
  | "pointsPerMatchHome"
  | "possessionAway"
  | "possessionHome"
  | "recentFormAway"
  | "recentFormHome"
  | "recentFormShortAway"
  | "recentFormShortHome"
  | "reverseLineMovement"
  | "rotationPressureAway"
  | "rotationPressureHome"
  | "scheduleAdvantage"
  | "sharpSupport"
  | "squadAvailabilityScoreAway"
  | "squadAvailabilityScoreHome"
  | "steamMove"
  | "venueAdvantage"
  | "xgAttackQualityAway"
  | "xgAttackQualityHome"
  | "xgDefenseQualityAway"
  | "xgDefenseQualityHome"
  | "xgDominance";

export interface FeatureDto {
  readonly featureId: string;
  readonly matchId: string;
  readonly name: FeatureName;
  readonly value: JsonValue;
  readonly explanation: string;
  readonly sourceEvidenceId: string;
  readonly generatedAt: string;
}

export type RuleName =
  | "ATTACK_EFFICIENCY_AWAY_EDGE"
  | "ATTACK_EFFICIENCY_HOME_EDGE"
  | "ATTACK_STRENGTH_EDGE"
  | "ATTACK_STRENGTH_EDGE_AWAY"
  | "AWAY_ATTACK_EDGE"
  | "AWAY_TEAM_PRESENT"
  | "AWAY_VENUE_FORM_EDGE"
  | "CHANCE_CREATION_AWAY_EDGE"
  | "CHANCE_CREATION_HOME_EDGE"
  | "CLUB_STRENGTH_EDGE"
  | "CLUB_STRENGTH_EDGE_AWAY"
  | "DEFENSE_STRENGTH_EDGE"
  | "DEFENSE_STRENGTH_EDGE_AWAY"
  | "DISCIPLINE_AWAY_RISK"
  | "DISCIPLINE_HOME_RISK"
  | "FATIGUE_AWAY"
  | "FATIGUE_HOME"
  | "FORM_STRENGTH_EDGE"
  | "FORM_STRENGTH_EDGE_AWAY"
  | "GOALKEEPER_EDGE_AWAY"
  | "GOALKEEPER_EDGE_HOME"
  | "GOALS_SCORED_AWAY_EDGE"
  | "GOALS_SCORED_HOME_EDGE"
  | "H2H_SUPPORTS_AWAY"
  | "H2H_SUPPORTS_HOME"
  | "HOME_ADVANTAGE_MATERIAL"
  | "HOME_ATTACK_EDGE"
  | "HOME_STABILITY"
  | "HOME_TEAM_PRESENT"
  | "HOME_VENUE_FORM_EDGE"
  | "KEY_PLAYER_MISSING_AWAY"
  | "KEY_PLAYER_MISSING_HOME"
  | "KICKOFF_PRESENT"
  | "KNOCKOUT_CONTEXT"
  | "LEAGUE_STRENGTH_EDGE"
  | "LEAGUE_STRENGTH_EDGE_AWAY"
  | "MANAGER_STABILITY"
  | "MANAGER_STABILITY_AWAY"
  | "MARKET_AH_LEAN_AWAY"
  | "MARKET_AH_LEAN_HOME"
  | "MARKET_CONSENSUS"
  | "MARKET_LEAN_AWAY"
  | "MARKET_LEAN_HOME"
  | "MARKET_VOLATILITY"
  | "MOMENTUM_AWAY"
  | "PLAYER_ATTACK_EDGE_AWAY"
  | "PLAYER_ATTACK_EDGE_HOME"
  | "PLAYER_AVAILABILITY_EDGE_AWAY"
  | "PLAYER_AVAILABILITY_EDGE_HOME"
  | "REVERSE_LINE_MOVEMENT"
  | "SHARP_SUPPORT"
  | "STEAM_MOVE"
  | "MOMENTUM_HOME"
  | "POSSESSION_AWAY_EDGE"
  | "POSSESSION_HOME_EDGE"
  | "REST_ADVANTAGE_AWAY"
  | "REST_ADVANTAGE_HOME"
  | "ROTATION_PRESSURE"
  | "XG_ATTACK_AWAY_EDGE"
  | "XG_ATTACK_HOME_EDGE"
  | "XG_DEFENSIVE_AWAY_EDGE"
  | "XG_DEFENSIVE_EDGE"
  | "XG_DOMINANCE"
  | "XG_DOMINANCE_AWAY";

export type RuleStatus = "FAIL" | "INAPPLICABLE" | "PASS";

export interface RuleResultDto {
  readonly ruleId: string;
  readonly matchId: string;
  readonly ruleName: RuleName;
  readonly status: RuleStatus;
  readonly score: number;
  readonly weight: number;
  readonly channel: "away+" | "home+" | "none";
  readonly explanation: string;
  readonly sourceFeatureIds: readonly string[];
  readonly evaluatedAt: string;
}

export type RecommendationCode =
  | "cautious"
  | "insufficient_evidence"
  | "lean_away"
  | "lean_draw"
  | "lean_home";

export interface ScorelineDto {
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly probability: number;
}

export interface DeterministicProjectionDto {
  readonly projectionModelVersion: string;
  readonly matchId: string;
  readonly lambdaHome: number;
  readonly lambdaAway: number;
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
  readonly topScorelines: readonly ScorelineDto[];
  readonly goalRange: Readonly<{
    range01: number;
    range23: number;
    range4Plus: number;
  }>;
  readonly confidence: number;
  readonly recommendation: RecommendationCode;
  readonly limitations: readonly string[];
  readonly calibrationArtifactId: string;
  readonly calibrationModelVersion: string;
  readonly calibrationStatus: string;
  readonly calibrationChecksum: string;
  readonly calibrationQualified: boolean;
  readonly status: "blocked" | "completed_nonempty" | "failed";
  readonly checksum: string;
}

export interface NarrativeSectionDto {
  readonly title: string;
  readonly body: string;
}

export interface NarrativeDraftDto {
  readonly epistemicKind: "inference";
  readonly providerId: string;
  readonly promptManifestId: string;
  readonly promptManifestChecksum: string;
  readonly sections: readonly NarrativeSectionDto[];
  readonly disclaimer: string;
  readonly generatedAt: string;
}

export type MatchWinnerDto = "away" | "draw" | "home";

export interface ActualMatchResultDto {
  readonly matchId: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly winner: MatchWinnerDto;
  readonly totalGoals: number;
  readonly competitionId?: string;
  readonly competitionName?: string;
  readonly matchStatus: "FINISHED";
  readonly providerId: string;
  readonly providerSourceId: string;
  readonly providerMethod: string;
  readonly observedAt: string;
}

export interface EvaluationMetricsDto {
  readonly winnerHit: boolean;
  readonly scoreHit: boolean;
  readonly goalHit: boolean;
  readonly goalRangeHit: boolean;
  readonly predictedWinner: MatchWinnerDto;
  readonly predictedGoalRange: "range01" | "range23" | "range4Plus";
  readonly actualGoalRange: "range01" | "range23" | "range4Plus";
  readonly scenarioHit: Readonly<{
    mostLikely: boolean;
    alternative: boolean;
    upset: boolean;
    anyScoreline: boolean;
    mostLikelyWinner: boolean;
  }>;
  readonly confidenceCorrectness: "correct" | "incorrect" | "not_claimed";
  readonly ruleCoverage: Readonly<{
    applicable: number;
    pass: number;
    fail: number;
    inapplicable: number;
    agreementRatio: number;
  }>;
  readonly featureCoverage: Readonly<{
    present: number;
    corePresent: number;
    coreExpected: number;
    coverageRatio: number;
  }>;
  readonly paperUnitReturn: number;
  readonly paperMetricDisclaimer: string;
}

export interface PredictionEvaluationDto {
  readonly evaluationModelVersion: string;
  readonly matchId: string;
  readonly evaluatedAt: string;
  readonly status: "excluded" | "scored";
  readonly exclusionReason?: string;
  readonly projectionChecksum: string;
  readonly projectionModelVersion: string;
  readonly metrics?: EvaluationMetricsDto;
}

export interface EvaluationHistoryRecordDto {
  readonly historyId: string;
  readonly matchId: string;
  readonly competitionId?: string;
  readonly competitionName?: string;
  readonly season: string;
  readonly matchDate: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly featureModelVersion: string;
  readonly ruleSetVersion: string;
  readonly projectionModelVersion: string;
  readonly evaluationModelVersion: string;
  readonly recordedAt: string;
  readonly confidence: Readonly<{
    predictionConfidence: number;
    confidenceBand: "high" | "low" | "medium" | "very_high";
  }>;
  readonly evaluation: PredictionEvaluationDto;
}

export type ConfidenceBandLabel = "high" | "low" | "medium" | "very_high";

export type MatchOutcomeLabel = "away" | "draw" | "home";

export type GoalRangeBucketLabel = "range01" | "range23" | "range4Plus";

export interface ConfidenceBucketAccuracyRowDto {
  readonly band: ConfidenceBandLabel;
  readonly sampleSize: number;
  readonly hits: number;
  readonly accuracy?: number;
  readonly qualified: boolean;
}

export interface ConfidenceDistributionRowDto {
  readonly band: ConfidenceBandLabel;
  readonly sampleSize: number;
  readonly share: number;
}

export interface ProbabilityBucketRowDto {
  readonly bucketLabel: string;
  readonly minProbability: number;
  readonly maxProbability: number;
  readonly sampleSize: number;
  readonly meanPredictedProbability?: number;
  readonly observedFrequency?: number;
  readonly qualified: boolean;
}

export interface OutcomeCalibrationRowDto extends ProbabilityBucketRowDto {
  readonly outcome: MatchOutcomeLabel;
}

export interface GoalRangeCalibrationRowDto {
  readonly bucket: GoalRangeBucketLabel;
  readonly sampleSize: number;
  readonly hits: number;
  readonly accuracy?: number;
  readonly qualified: boolean;
}

export interface CalibrationErrorMetricDto {
  readonly value?: number;
  readonly sampleSize: number;
  readonly qualified: boolean;
}

export interface PredictionCalibrationProvenanceDto {
  readonly sourceRecordCount: number;
  readonly evaluationHistorySchemaVersions: readonly string[];
  readonly evaluationModelVersions: readonly string[];
  readonly projectionModelVersions: readonly string[];
  readonly earliestMatchDate?: string;
  readonly latestMatchDate?: string;
}

/**
 * A2 Prediction Calibration — read-only measurement over Evaluation History.
 * Population-level: not scoped to a single match. Display-only; never
 * adjusts Prediction, Feature, Rule, or Projection outputs.
 */
export interface PredictionCalibrationReportDto {
  readonly schemaVersion: string;
  readonly computedAt: string;
  readonly sampleSize: number;
  readonly qualified: boolean;
  readonly minimumQualifiedSampleSize: number;
  readonly provenance: PredictionCalibrationProvenanceDto;
  readonly confidenceBucketAccuracy: readonly ConfidenceBucketAccuracyRowDto[];
  readonly confidenceDistribution: readonly ConfidenceDistributionRowDto[];
  readonly reliabilityTable: readonly ProbabilityBucketRowDto[];
  readonly expectedCalibrationError: CalibrationErrorMetricDto;
  readonly brierScore: CalibrationErrorMetricDto;
  readonly outcomeCalibration: readonly OutcomeCalibrationRowDto[];
  readonly goalRangeCalibration: readonly GoalRangeCalibrationRowDto[];
  readonly limitations: readonly string[];
}

export type FeatureProfileId =
  | "baseline"
  | "club_intelligence"
  | "club_player"
  | "club_player_xg"
  | "full_football_intelligence";

export interface ValidationMetricSummaryDto {
  readonly value?: number;
  readonly sampleSize: number;
  readonly qualified: boolean;
}

export interface ValidationProfileRowDto {
  readonly profile: FeatureProfileId;
  readonly label: string;
  readonly sampleSize: number;
  readonly qualified: boolean;
  readonly winnerAccuracy: ValidationMetricSummaryDto;
  readonly drawAccuracy: ValidationMetricSummaryDto;
  readonly scoreAccuracy: ValidationMetricSummaryDto;
  readonly goalRangeAccuracy: ValidationMetricSummaryDto;
  readonly coverage: ValidationMetricSummaryDto;
  readonly paperReturn: ValidationMetricSummaryDto;
  readonly calibration: PredictionCalibrationReportDto;
}

export interface ValidationProvenanceDto {
  readonly sourceRecordCount: number;
  readonly evaluationHistorySchemaVersions: readonly string[];
  readonly evaluationModelVersions: readonly string[];
  readonly projectionModelVersions: readonly string[];
  readonly earliestMatchDate?: string;
  readonly latestMatchDate?: string;
}

/**
 * V1A Football Intelligence Validation — read-only comparison of prediction
 * quality across Feature-configuration profiles over Evaluation History.
 * Population-level: not scoped to a single match. Display-only; never
 * adjusts Prediction, and never claims one profile improved over another.
 */
export interface ValidationReportDto {
  readonly schemaVersion: string;
  readonly computedAt: string;
  readonly totalSampleSize: number;
  readonly minimumQualifiedSampleSize: number;
  readonly provenance: ValidationProvenanceDto;
  readonly profiles: readonly ValidationProfileRowDto[];
  readonly limitations: readonly string[];
}

export type IntelligenceDomainId =
  | "venue_intelligence"
  | "availability_intelligence"
  | "advanced_statistics"
  | "expected_goals"
  | "match_context"
  | "club_intelligence"
  | "player_intelligence"
  | "market_intelligence";

export interface DomainContributionRowDto {
  readonly domain: IntelligenceDomainId;
  readonly label: string;
  readonly sampleSize: number;
  readonly qualified: boolean;
  readonly coverage: ValidationMetricSummaryDto;
  readonly winnerAccuracy: ValidationMetricSummaryDto;
  readonly drawAccuracy: ValidationMetricSummaryDto;
  readonly scoreAccuracy: ValidationMetricSummaryDto;
  readonly goalRangeAccuracy: ValidationMetricSummaryDto;
  readonly expectedCalibrationError: CalibrationErrorMetricDto;
  readonly brierScore: CalibrationErrorMetricDto;
  readonly paperReturn: ValidationMetricSummaryDto;
}

export interface ContributionProvenanceDto {
  readonly sourceRecordCount: number;
  readonly evaluationHistorySchemaVersions: readonly string[];
  readonly evaluationModelVersions: readonly string[];
  readonly projectionModelVersions: readonly string[];
  readonly earliestMatchDate?: string;
  readonly latestMatchDate?: string;
}

/**
 * O1 Football Intelligence Contribution Analysis — read-only measurement of
 * each Intelligence domain's observed historical contribution over
 * Evaluation History. Population-level: not scoped to a single match.
 * Display-only; never adjusts Prediction, never ranks domains (always
 * listed in this fixed canonical order), and never claims causation.
 */
export interface ContributionReportDto {
  readonly schemaVersion: string;
  readonly computedAt: string;
  readonly totalSampleSize: number;
  readonly minimumQualifiedSampleSize: number;
  readonly provenance: ContributionProvenanceDto;
  readonly domains: readonly DomainContributionRowDto[];
  readonly limitations: readonly string[];
}

export interface AnalysisReportDto {
  readonly reportId: string;
  readonly matchId: string;
  readonly generatedAt: string;
  readonly summary: readonly string[];
  readonly features: readonly FeatureDto[];
  readonly rules: readonly RuleResultDto[];
  readonly deterministic: DeterministicProjectionDto;
  readonly narrative: NarrativeDraftDto;
  readonly actualResult?: ActualMatchResultDto;
  readonly evaluation?: PredictionEvaluationDto;
  readonly evaluationHistory?: readonly EvaluationHistoryRecordDto[];
  readonly calibration?: PredictionCalibrationReportDto;
  readonly validation?: ValidationReportDto;
  readonly contribution?: ContributionReportDto;
}

export interface BackendErrorDto {
  readonly code: string;
  readonly message: string;
}

export interface BackendErrorResponseDto {
  readonly error: BackendErrorDto;
  readonly ok: false;
}

export type AnalyzeMatchResponseDto = AnalysisReportDto | BackendErrorResponseDto;
