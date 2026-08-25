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
  | "managerCareerStabilityAway"
  | "managerCareerStabilityHome"
  | "managerChangeRiskAway"
  | "managerChangeRiskHome"
  | "managerContinuityAway"
  | "managerContinuityHome"
  | "managerExperienceAway"
  | "managerExperienceHome"
  | "managerStabilityAway"
  | "managerStabilityHome"
  | "managerTenureStabilityAway"
  | "managerTenureStabilityHome"
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
  | "MANAGER_CHANGE_RISK_AWAY"
  | "MANAGER_CHANGE_RISK_HOME"
  | "MANAGER_CONTINUITY_EDGE"
  | "MANAGER_CONTINUITY_EDGE_AWAY"
  | "MANAGER_EXPERIENCE_EDGE"
  | "MANAGER_EXPERIENCE_EDGE_AWAY"
  | "MANAGER_STABILITY"
  | "MANAGER_STABILITY_AWAY"
  | "MANAGER_STABILITY_EDGE"
  | "MANAGER_STABILITY_EDGE_AWAY"
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
  | "manager_intelligence"
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

export interface ContributionReportDto {
  readonly schemaVersion: string;
  readonly computedAt: string;
  readonly totalSampleSize: number;
  readonly minimumQualifiedSampleSize: number;
  readonly provenance: ContributionProvenanceDto;
  readonly domains: readonly DomainContributionRowDto[];
  readonly limitations: readonly string[];
}

export interface FootballStateDimensionDto {
  readonly id: string;
  readonly label: string;
  readonly level: "absent" | "low" | "medium" | "high";
  readonly score: number;
  readonly basis: "derived" | "feature" | "identity";
  readonly sourceRefs: readonly string[];
}

export interface FootballStateReportDto {
  readonly policyVersion: string;
  readonly checksum: string;
  readonly dimensions: readonly FootballStateDimensionDto[];
  readonly compositeTags: readonly string[];
  readonly driverFeatureNames: readonly string[];
  readonly limitations: readonly string[];
}

export interface ScriptScorelineDto {
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly probability: number;
}

export interface ScriptMergeContributionDto {
  readonly weight: number;
  readonly weightedPHome: number;
  readonly weightedPDraw: number;
  readonly weightedPAway: number;
}

export interface MatchScriptSummaryDto {
  readonly scriptId: string;
  readonly label: string;
  readonly weight: number;
  readonly activationReason: string;
  readonly activationReasons: readonly string[];
  readonly footballStateRefs: readonly string[];
  readonly activatingRules: readonly string[];
  readonly strengtheningFeatures: readonly string[];
  readonly lambdaHome: number;
  readonly lambdaAway: number;
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
  readonly mostLikelyScoreline: ScriptScorelineDto;
  readonly secondScoreline: ScriptScorelineDto | null;
  readonly goalRange: Readonly<{
    readonly range01: number;
    readonly range23: number;
    readonly range4Plus: number;
  }>;
  readonly mergeContribution: ScriptMergeContributionDto;
  readonly pBttsYes: number;
  readonly pBttsNo: number;
  readonly pOver25: number;
  readonly pUnder25: number;
}

export interface MatrixDerivedPredictionsDto {
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
  readonly goalRange: Readonly<{
    readonly range01: number;
    readonly range23: number;
    readonly range4Plus: number;
  }>;
  readonly mostLikelyScoreline: ScriptScorelineDto;
  readonly secondScoreline: ScriptScorelineDto | null;
  readonly pBttsYes: number;
  readonly pBttsNo: number;
  readonly pOver25: number;
  readonly pUnder25: number;
}

export interface UnifiedMatrixSummaryDto {
  readonly policyVersion: string;
  readonly mergeAlgorithm: string;
  readonly matrixChecksum: string;
  readonly scriptCount: number;
  readonly explanation: string;
  readonly derived: MatrixDerivedPredictionsDto;
  readonly derivationNotes: readonly string[];
}

export interface ProjectionFrameworkDto {
  readonly frameworkVersion: string;
  readonly parameterArtifactId: string;
  readonly parameterVersionLabel: string;
  readonly parameterArtifactChecksum: string;
  readonly footballStatePolicyVersion: string;
  readonly matchScriptPolicyVersion: string;
  readonly footballStateChecksum: string;
  readonly matchScriptSetChecksum: string;
  readonly probabilityMatrixChecksum: string | null;
  readonly activeMatchScripts: readonly MatchScriptSummaryDto[];
  readonly unifiedMatrix: UnifiedMatrixSummaryDto | null;
}

export interface ProjectionParameterArtifactSummaryDto {
  readonly versionLabel: string;
  readonly artifactId: string;
  readonly checksum: string;
  readonly frameworkVersion: string;
  readonly policyVersion: string;
  readonly status: string;
  readonly qualified: boolean;
  readonly isActive: boolean;
  readonly parameterGroups: readonly string[];
  readonly limitations: readonly string[];
  readonly usedInAnalysis: boolean;
}

export interface ProjectionParameterCatalogDto {
  readonly modelVersion: string;
  readonly activeVersionLabel: string;
  readonly artifacts: readonly ProjectionParameterArtifactSummaryDto[];
  readonly limitations: readonly string[];
}

export interface FixtureResolutionDto {
  readonly requestedHomeTeam: string;
  readonly requestedAwayTeam: string;
  readonly requestedDate?: string;
  readonly normalizedHomeTeam: string;
  readonly normalizedAwayTeam: string;
  readonly resolvedHomeTeam: string;
  readonly resolvedAwayTeam: string;
  readonly resolvedMatchId: string;
  readonly kickoff: string;
  readonly competition: string;
  readonly scheduleSource: string;
  readonly providerSource: string;
  readonly homeAwaySwapped: boolean;
}

export interface AnalysisProvenanceDto {
  readonly projectionPolicyPin: "v1" | "v2";
  readonly fixtureResolution?: FixtureResolutionDto;
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
  readonly projectionFramework?: ProjectionFrameworkDto;
  readonly footballState?: FootballStateReportDto;
  readonly actualResult?: ActualMatchResultDto;
  readonly evaluation?: PredictionEvaluationDto;
  readonly evaluationHistory?: readonly EvaluationHistoryRecordDto[];
  readonly calibration?: PredictionCalibrationReportDto;
  readonly validation?: ValidationReportDto;
  readonly contribution?: ContributionReportDto;
  readonly projectionReplay?: ProjectionReplayReportDto;
  readonly projectionDiagnostics?: ProjectionDiagnosticsReportDto;
  readonly projectionParameters?: ProjectionParameterCatalogDto;
  readonly analysisProvenance?: AnalysisProvenanceDto;
}

export interface ProjectionReplayMetricSummaryDto {
  readonly value: number | undefined;
  readonly sampleSize: number;
  readonly qualified: boolean;
}

export interface ProjectionReplayAccuracyBlockDto {
  readonly sampleSize: number;
  readonly scoredSampleSize: number;
  readonly v2ReplaySampleSize: number;
  readonly winnerAccuracy: ProjectionReplayMetricSummaryDto;
  readonly drawAccuracy: ProjectionReplayMetricSummaryDto;
  readonly scoreAccuracy: ProjectionReplayMetricSummaryDto;
  readonly goalRangeAccuracy: ProjectionReplayMetricSummaryDto;
  readonly bttsAccuracy: ProjectionReplayMetricSummaryDto;
  readonly overUnderAccuracy: ProjectionReplayMetricSummaryDto;
  readonly confidenceCorrelation: ProjectionReplayMetricSummaryDto;
}

export interface ProjectionReplayAccuracyDeltaDto {
  readonly winnerAccuracyDelta: number | undefined;
  readonly drawAccuracyDelta: number | undefined;
  readonly scoreAccuracyDelta: number | undefined;
  readonly goalRangeAccuracyDelta: number | undefined;
  readonly bttsAccuracyDelta: number | undefined;
  readonly overUnderAccuracyDelta: number | undefined;
  readonly confidenceCorrelationDelta: number | undefined;
}

export interface ProjectionVersionComparisonDto {
  readonly v1: ProjectionReplayAccuracyBlockDto;
  readonly v2: ProjectionReplayAccuracyBlockDto;
  readonly improvement: ProjectionReplayAccuracyDeltaDto;
}

export interface ReplaySummaryDto {
  readonly populationSampleSize: number;
  readonly v1ScoredSampleSize: number;
  readonly v2ScoredSampleSize: number;
  readonly v2ReplayCoverage: ProjectionReplayMetricSummaryDto;
  readonly replayedAt: string;
}

export interface ScriptContributionDto {
  readonly scriptId: string;
  readonly label: string;
  readonly activationCount: number;
  readonly activationFrequency: number;
  readonly averageWeight: number;
  readonly averageConfidence: number;
  readonly winnerAccuracy: ProjectionReplayMetricSummaryDto;
  readonly goalRangeAccuracy: ProjectionReplayMetricSummaryDto;
  readonly scoreAccuracy: ProjectionReplayMetricSummaryDto;
}

export interface FootballStateContributionDto {
  readonly dimensionId: string;
  readonly dimensionLabel: string;
  readonly level: string;
  readonly sampleSize: number;
  readonly winnerAccuracy: ProjectionReplayMetricSummaryDto;
  readonly goalRangeAccuracy: ProjectionReplayMetricSummaryDto;
  readonly scoreAccuracy: ProjectionReplayMetricSummaryDto;
}

export interface ProjectionReplayReportDto {
  readonly modelVersion: string;
  readonly computedAt: string;
  readonly summary: ReplaySummaryDto;
  readonly versionComparison: ProjectionVersionComparisonDto;
  readonly scriptContributions: readonly ScriptContributionDto[];
  readonly footballStateContributions: readonly FootballStateContributionDto[];
  readonly limitations: readonly string[];
  readonly checksum: string;
}

export interface FailureCategoryCountDto {
  readonly category: string;
  readonly label: string;
  readonly count: number;
  readonly rate: ProjectionReplayMetricSummaryDto;
}

export interface FailureDistributionDto {
  readonly sampleSize: number;
  readonly categories: readonly FailureCategoryCountDto[];
  readonly topFailureReasons: readonly FailureCategoryCountDto[];
}

export interface ScriptDiagnosticsRowDto {
  readonly scriptId: string;
  readonly label: string;
  readonly activationCount: number;
  readonly accuracy: ProjectionReplayMetricSummaryDto;
  readonly averageConfidence: number;
  readonly averageScoreError: number;
  readonly averageGoalError: number;
}

export interface ScriptDiagnosticsDto {
  readonly rows: readonly ScriptDiagnosticsRowDto[];
  readonly worstScripts: readonly ScriptDiagnosticsRowDto[];
  readonly bestScripts: readonly ScriptDiagnosticsRowDto[];
}

export interface FootballStateDiagnosticsRowDto {
  readonly dimensionId: string;
  readonly dimensionLabel: string;
  readonly level: string;
  readonly sampleSize: number;
  readonly accuracy: ProjectionReplayMetricSummaryDto;
  readonly falsePositive: number;
  readonly falseNegative: number;
}

export interface FootballStateDiagnosticsDto {
  readonly rows: readonly FootballStateDiagnosticsRowDto[];
}

export interface RuleActivationRowDto {
  readonly ruleName: string;
  readonly activationCount: number;
  readonly activationRate: number;
}

export interface RuleIncorrectCorrelationRowDto {
  readonly ruleName: string;
  readonly incorrectCount: number;
  readonly incorrectRate: number;
  readonly activationCount: number;
}

export interface RuleConflictPairRowDto {
  readonly homeRule: string;
  readonly awayRule: string;
  readonly coActivationCount: number;
  readonly incorrectCount: number;
  readonly incorrectRate: number;
}

export interface RuleSaturationSummaryDto {
  readonly averagePassRules: number;
  readonly averageApplicableRules: number;
  readonly maxPassRules: number;
  readonly saturatedMatchCount: number;
  readonly saturationThreshold: number;
}

export interface RuleDiagnosticsDto {
  readonly mostFrequentlyActivated: readonly RuleActivationRowDto[];
  readonly correlatedWithIncorrect: readonly RuleIncorrectCorrelationRowDto[];
  readonly conflictPairs: readonly RuleConflictPairRowDto[];
  readonly saturation: RuleSaturationSummaryDto;
}

export interface ConfidenceBucketRowDto {
  readonly band: "high" | "low" | "medium" | "very_high";
  readonly sampleSize: number;
  readonly accuracy: ProjectionReplayMetricSummaryDto;
  readonly incorrectCount: number;
}

export interface ConfidenceDiagnosticsDto {
  readonly highConfidenceWrong: number;
  readonly lowConfidenceCorrect: number;
  readonly highConfidenceWrongRate: ProjectionReplayMetricSummaryDto;
  readonly lowConfidenceCorrectRate: ProjectionReplayMetricSummaryDto;
  readonly calibrationBuckets: readonly ConfidenceBucketRowDto[];
}

export interface ProjectionDiagnosticsReportDto {
  readonly modelVersion: string;
  readonly computedAt: string;
  readonly sampleSize: number;
  readonly failureDistribution: FailureDistributionDto;
  readonly scriptDiagnostics: ScriptDiagnosticsDto;
  readonly footballStateDiagnostics: FootballStateDiagnosticsDto;
  readonly ruleDiagnostics: RuleDiagnosticsDto;
  readonly confidenceDiagnostics: ConfidenceDiagnosticsDto;
  readonly limitations: readonly string[];
  readonly checksum: string;
}

export interface FixtureDiscoveryCandidateDto {
  readonly matchId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoff: string;
  readonly competition: string;
  readonly providerSource: string;
  readonly analyzable: boolean;
  readonly homeAwaySwapped: boolean;
}

export interface FixtureDiscoveryErrorDto {
  readonly code: "FIXTURE_AMBIGUOUS" | "FIXTURE_NOT_FOUND";
  readonly message: string;
  readonly candidates?: readonly FixtureDiscoveryCandidateDto[];
}

export interface FixtureDiscoveryErrorResponseDto {
  readonly ok: false;
  readonly error: FixtureDiscoveryErrorDto;
}

export type AnalyzeByTeamsResponseDto =
  | AnalysisReportDto
  | BackendErrorResponseDto
  | FixtureDiscoveryErrorResponseDto;

export type AnalyzeByTeamsFailureKind =
  | "analysis"
  | "fixture"
  | "network"
  | "policy";

export interface AnalyzeByTeamsFailure {
  readonly kind: AnalyzeByTeamsFailureKind;
  readonly code: string;
  readonly message: string;
  readonly candidates?: readonly FixtureDiscoveryCandidateDto[];
}

export type AnalyzeByTeamsResult =
  | Readonly<{ ok: true; report: AnalysisReportDto }>
  | Readonly<{ ok: false; failure: AnalyzeByTeamsFailure }>;

export interface BackendErrorDto {
  readonly code: string;
  readonly message: string;
}

export interface BackendErrorResponseDto {
  readonly error: BackendErrorDto;
  readonly ok: false;
}

export type AnalyzeMatchResponseDto = AnalysisReportDto | BackendErrorResponseDto;
