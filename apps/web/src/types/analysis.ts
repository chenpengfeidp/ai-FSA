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
  | "GOALS_SCORED_AWAY_EDGE"
  | "GOALS_SCORED_HOME_EDGE"
  | "H2H_SUPPORTS_AWAY"
  | "H2H_SUPPORTS_HOME"
  | "HOME_ADVANTAGE_MATERIAL"
  | "HOME_ATTACK_EDGE"
  | "HOME_STABILITY"
  | "HOME_TEAM_PRESENT"
  | "HOME_VENUE_FORM_EDGE"
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
