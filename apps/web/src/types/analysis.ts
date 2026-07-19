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
  | "attackRatingAway"
  | "attackRatingHome"
  | "awayTeam"
  | "defenseRatingAway"
  | "defenseRatingHome"
  | "h2hLean"
  | "h2hSampleSize"
  | "homeAdvantage"
  | "homeTeam"
  | "kickoff"
  | "marketImpliedAway"
  | "marketImpliedDraw"
  | "marketImpliedHome"
  | "marketLean"
  | "momentumAway"
  | "momentumHome";

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
  | "AWAY_ATTACK_EDGE"
  | "AWAY_TEAM_PRESENT"
  | "H2H_SUPPORTS_AWAY"
  | "H2H_SUPPORTS_HOME"
  | "HOME_ADVANTAGE_MATERIAL"
  | "HOME_ATTACK_EDGE"
  | "HOME_TEAM_PRESENT"
  | "KICKOFF_PRESENT"
  | "MARKET_AH_LEAN_AWAY"
  | "MARKET_AH_LEAN_HOME"
  | "MARKET_LEAN_AWAY"
  | "MARKET_LEAN_HOME"
  | "MOMENTUM_AWAY"
  | "MOMENTUM_HOME";

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

export interface AnalysisReportDto {
  readonly reportId: string;
  readonly matchId: string;
  readonly generatedAt: string;
  readonly summary: readonly string[];
  readonly features: readonly FeatureDto[];
  readonly rules: readonly RuleResultDto[];
  readonly deterministic: DeterministicProjectionDto;
  readonly narrative: NarrativeDraftDto;
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
