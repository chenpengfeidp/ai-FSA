import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const evidenceTypes = [
  "HEAD_TO_HEAD",
  "INJURY",
  "LINEUP",
  "MATCH_INFO",
  "NEWS",
  "ODDS",
  "RANKING",
  "STATISTICS",
  "TEAM_FORM",
  "WEATHER",
] as const;

const importErrorCodes = [
  "DUPLICATE_EVIDENCE",
  "EVIDENCE_IMPORT_FAILED",
  "MATCH_NOT_FOUND",
  "NORMALIZATION_FAILED",
  "PROVIDER_FAILED",
  "REPOSITORY_FAILED",
  "UNEXPECTED_ERROR",
] as const;

export class EvidenceProvenanceDto {
  @ApiProperty({ example: "@fas/evidence-normalizer" })
  declare readonly collector: string;

  @ApiProperty({ example: "fixture" })
  declare readonly method: string;
}

export class EvidenceDto {
  @ApiProperty({ example: "evidence-fixture-match-example" })
  declare readonly id: string;

  @ApiProperty({ example: "fixture" })
  declare readonly source: string;

  @ApiProperty({ example: "fixture-match-example" })
  declare readonly sourceId: string;

  @ApiProperty({ enum: evidenceTypes, example: "MATCH_INFO" })
  declare readonly type: string;

  @ApiPropertyOptional({ example: "match-example" })
  declare readonly matchId?: string;

  @ApiProperty({ example: "2026-07-17T10:00:00Z", format: "date-time" })
  declare readonly collectedAt: string;

  @ApiProperty({ example: "2026-08-01T19:30:00Z", format: "date-time" })
  declare readonly eventTime: string;

  @ApiProperty({ enum: ["fresh", "stale", "unknown"], example: "fresh" })
  declare readonly freshness: string;

  @ApiProperty({
    enum: ["rejected", "unverified", "verified"],
    example: "unverified",
  })
  declare readonly quality: string;

  @ApiProperty({ type: () => EvidenceProvenanceDto })
  declare readonly provenance: EvidenceProvenanceDto;

  @ApiProperty({
    additionalProperties: true,
    example: {
      away: "Chelsea",
      home: "Liverpool",
      kickoff: "2026-08-01T19:30:00Z",
    },
    type: "object",
  })
  declare readonly payload: Record<string, unknown>;
}

export class EvidenceNormalizerErrorDto {
  @ApiProperty({ example: "INVALID_FIELD" })
  declare readonly code: string;

  @ApiProperty({ example: "matchId must be a non-empty string." })
  declare readonly message: string;

  @ApiPropertyOptional({ example: "matchId" })
  declare readonly field?: string;
}

export class ImportErrorDto {
  @ApiProperty({ enum: importErrorCodes, example: "MATCH_NOT_FOUND" })
  declare readonly code: string;

  @ApiProperty({ example: 'Match "match-unknown" was not found.' })
  declare readonly message: string;

  @ApiPropertyOptional({ type: () => EvidenceNormalizerErrorDto })
  declare readonly normalizerError?: EvidenceNormalizerErrorDto;
}

export class EvidenceQueryErrorDto {
  @ApiProperty({ enum: ["REPOSITORY_FAILED"], example: "REPOSITORY_FAILED" })
  declare readonly code: "REPOSITORY_FAILED";

  @ApiProperty({ example: "Evidence repository query failed." })
  declare readonly message: string;
}

export class ImportSuccessResponseDto {
  @ApiProperty({ enum: [true], example: true })
  declare readonly ok: true;

  @ApiProperty({ type: () => EvidenceDto })
  declare readonly value: EvidenceDto;
}

export class ImportErrorResponseDto {
  @ApiProperty({ enum: [false], example: false })
  declare readonly ok: false;

  @ApiProperty({ type: () => ImportErrorDto })
  declare readonly error: ImportErrorDto;
}

export class EvidenceByIdSuccessResponseDto {
  @ApiProperty({ enum: [true], example: true })
  declare readonly ok: true;

  @ApiPropertyOptional({ type: () => EvidenceDto })
  declare readonly value?: EvidenceDto;
}

export class EvidenceListSuccessResponseDto {
  @ApiProperty({ enum: [true], example: true })
  declare readonly ok: true;

  @ApiProperty({ isArray: true, type: () => EvidenceDto })
  declare readonly value: readonly EvidenceDto[];
}

export class EvidenceQueryErrorResponseDto {
  @ApiProperty({ enum: [false], example: false })
  declare readonly ok: false;

  @ApiProperty({ type: () => EvidenceQueryErrorDto })
  declare readonly error: EvidenceQueryErrorDto;
}

export class FeatureDto {
  @ApiProperty({ example: "feature:evidence-fixture-match-example:homeTeam" })
  declare readonly featureId: string;

  @ApiProperty({ example: "match-example" })
  declare readonly matchId: string;

  @ApiProperty({
    enum: [
      "attackRatingAway",
      "attackRatingHome",
      "awayTeam",
      "defenseRatingAway",
      "defenseRatingHome",
      "homeAdvantage",
      "homeTeam",
      "kickoff",
      "momentumAway",
      "momentumHome",
    ],
    example: "homeTeam",
  })
  declare readonly name: string;

  @ApiProperty({ example: "Liverpool" })
  declare readonly value: unknown;

  @ApiProperty({ example: "Home team extracted from MATCH_INFO." })
  declare readonly explanation: string;

  @ApiProperty({ example: "evidence-fixture-match-example" })
  declare readonly sourceEvidenceId: string;

  @ApiProperty({ example: "2026-07-17T10:00:00Z", format: "date-time" })
  declare readonly generatedAt: string;
}

export class RuleResultDto {
  @ApiProperty({ example: "rule:home-team-present:v1" })
  declare readonly ruleId: string;

  @ApiProperty({ example: "match-example" })
  declare readonly matchId: string;

  @ApiProperty({
    enum: [
      "AWAY_ATTACK_EDGE",
      "AWAY_TEAM_PRESENT",
      "HOME_ADVANTAGE_MATERIAL",
      "HOME_ATTACK_EDGE",
      "HOME_TEAM_PRESENT",
      "KICKOFF_PRESENT",
      "MOMENTUM_AWAY",
      "MOMENTUM_HOME",
    ],
    example: "HOME_TEAM_PRESENT",
  })
  declare readonly ruleName: string;

  @ApiProperty({ enum: ["FAIL", "INAPPLICABLE", "PASS"], example: "PASS" })
  declare readonly status: string;

  @ApiProperty({ example: 1 })
  declare readonly score: number;

  @ApiProperty({ example: 1 })
  declare readonly weight: number;

  @ApiProperty({ enum: ["away+", "home+", "none"], example: "none" })
  declare readonly channel: string;

  @ApiProperty({
    example: "HOME_TEAM_PRESENT passed because its source Feature is present.",
  })
  declare readonly explanation: string;

  @ApiProperty({
    example: ["feature:evidence-fixture-match-example:homeTeam"],
    isArray: true,
    type: String,
  })
  declare readonly sourceFeatureIds: readonly string[];

  @ApiProperty({ example: "2026-07-17T10:00:00Z", format: "date-time" })
  declare readonly evaluatedAt: string;
}

export class DeterministicProjectionDto {
  @ApiProperty({ example: "projection.v2.slice1" })
  declare readonly projectionModelVersion: string;

  @ApiProperty({ example: "match-example" })
  declare readonly matchId: string;

  @ApiProperty({ example: 1.8 })
  declare readonly lambdaHome: number;

  @ApiProperty({ example: 1.1 })
  declare readonly lambdaAway: number;

  @ApiProperty({ example: 0.45 })
  declare readonly pHome: number;

  @ApiProperty({ example: 0.27 })
  declare readonly pDraw: number;

  @ApiProperty({ example: 0.28 })
  declare readonly pAway: number;

  @ApiProperty({ example: 0.72 })
  declare readonly confidence: number;

  @ApiProperty({
    enum: [
      "cautious",
      "insufficient_evidence",
      "lean_away",
      "lean_draw",
      "lean_home",
    ],
    example: "lean_home",
  })
  declare readonly recommendation: string;

  @ApiProperty({ enum: ["blocked", "completed_nonempty", "failed"] })
  declare readonly status: string;

  @ApiProperty({ example: "abc123" })
  declare readonly checksum: string;
}

export class AnalysisReportDto {
  @ApiProperty({
    example: "report:match-example:2026-07-17T10:00:00Z",
  })
  declare readonly reportId: string;

  @ApiProperty({ example: "match-example" })
  declare readonly matchId: string;

  @ApiProperty({ example: "2026-07-17T10:00:00Z", format: "date-time" })
  declare readonly generatedAt: string;

  @ApiProperty({
    example: [
      "Match information is complete.",
      "Home team: Liverpool.",
      "Away team: Chelsea.",
      "Kickoff: 2026-08-01T19:30:00Z.",
    ],
    isArray: true,
    type: String,
  })
  declare readonly summary: readonly string[];

  @ApiProperty({ isArray: true, type: () => FeatureDto })
  declare readonly features: readonly FeatureDto[];

  @ApiProperty({ isArray: true, type: () => RuleResultDto })
  declare readonly rules: readonly RuleResultDto[];

  @ApiProperty({ type: () => DeterministicProjectionDto })
  declare readonly deterministic: DeterministicProjectionDto;
}

export class AnalysisErrorCauseDto {
  @ApiProperty({ example: "MATCH_NOT_FOUND" })
  declare readonly code: string;

  @ApiProperty({ example: 'Match "match-unknown" was not found.' })
  declare readonly message: string;
}

export class AnalysisEndpointErrorDto {
  @ApiProperty({ example: "IMPORT_FAILED" })
  declare readonly code: string;

  @ApiProperty({ example: "Match import failed." })
  declare readonly message: string;

  @ApiPropertyOptional({ type: () => AnalysisErrorCauseDto })
  declare readonly cause?: AnalysisErrorCauseDto;
}

export class AnalysisEndpointErrorResponseDto {
  @ApiProperty({ enum: [false], example: false })
  declare readonly ok: false;

  @ApiProperty({ type: () => AnalysisEndpointErrorDto })
  declare readonly error: AnalysisEndpointErrorDto;
}
