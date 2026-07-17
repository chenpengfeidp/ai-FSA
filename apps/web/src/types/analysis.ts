export type JsonValue =
  | boolean
  | null
  | number
  | string
  | readonly JsonValue[]
  | Readonly<{ [key: string]: JsonValue }>;

export type FeatureName = "awayTeam" | "homeTeam" | "kickoff";

export interface FeatureDto {
  readonly featureId: string;
  readonly matchId: string;
  readonly name: FeatureName;
  readonly value: JsonValue;
  readonly sourceEvidenceId: string;
  readonly generatedAt: string;
}

export type RuleName = "AWAY_TEAM_PRESENT" | "HOME_TEAM_PRESENT" | "KICKOFF_PRESENT";

export type RuleStatus = "FAIL" | "PASS";

export interface RuleResultDto {
  readonly ruleId: string;
  readonly matchId: string;
  readonly ruleName: RuleName;
  readonly status: RuleStatus;
  readonly score: number;
  readonly explanation: string;
  readonly sourceFeatureIds: readonly string[];
  readonly evaluatedAt: string;
}

export interface AnalysisReportDto {
  readonly reportId: string;
  readonly matchId: string;
  readonly generatedAt: string;
  readonly summary: readonly string[];
  readonly features: readonly FeatureDto[];
  readonly rules: readonly RuleResultDto[];
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
