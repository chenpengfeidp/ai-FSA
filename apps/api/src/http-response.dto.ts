import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const evidenceTypes = [
  "HEAD_TO_HEAD",
  "INJURY",
  "LINEUP",
  "MATCH_INFO",
  "NEWS",
  "ODDS",
  "PLAYER",
  "RANKING",
  "STATISTICS",
  "SUSPENSION",
  "TEAM_FORM",
  "VENUE",
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

  @ApiProperty({ example: "football:api-sports" })
  declare readonly providerId: string;

  @ApiProperty({
    enum: ["football", "market", "sentiment", "prediction", "internal"],
    example: "football",
  })
  declare readonly category: string;
}

export class EvidenceDto {
  @ApiProperty({ example: "evidence-fixture-match-example" })
  declare readonly id: string;

  @ApiProperty({ example: "football:api-sports" })
  declare readonly providerId: string;

  @ApiProperty({ example: "api-football" })
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

  @ApiProperty({ example: "2026-07-17T10:00:00Z", format: "date-time" })
  declare readonly timestamp: string;

  @ApiProperty({ enum: ["fresh", "stale", "unknown"], example: "fresh" })
  declare readonly freshness: string;

  @ApiProperty({
    enum: ["high", "medium", "low", "unknown"],
    example: "medium",
  })
  declare readonly confidence: string;

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
      "asianHandicapLean",
      "asianHandicapLine",
      "attackRatingAway",
      "attackRatingHome",
      "awayTeam",
      "defenseRatingAway",
      "defenseRatingHome",
      "h2hLean",
      "h2hSampleSize",
      "homeAdvantage",
      "homeTeam",
      "kickoff",
      "marketImpliedAway",
      "marketImpliedDraw",
      "marketImpliedHome",
      "marketLean",
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
      "H2H_SUPPORTS_AWAY",
      "H2H_SUPPORTS_HOME",
      "HOME_ADVANTAGE_MATERIAL",
      "HOME_ATTACK_EDGE",
      "HOME_TEAM_PRESENT",
      "KICKOFF_PRESENT",
      "MARKET_AH_LEAN_AWAY",
      "MARKET_AH_LEAN_HOME",
      "MARKET_LEAN_AWAY",
      "MARKET_LEAN_HOME",
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

  @ApiProperty({ example: "calibration:population-demo:v1" })
  declare readonly calibrationArtifactId: string;

  @ApiProperty({ example: "calibration.v1.frequency_ratio_1x2" })
  declare readonly calibrationModelVersion: string;

  @ApiProperty({ example: "computed_candidate" })
  declare readonly calibrationStatus: string;

  @ApiProperty({ example: "calibration-population-demo-v1-…" })
  declare readonly calibrationChecksum: string;

  @ApiProperty({ example: false })
  declare readonly calibrationQualified: boolean;

  @ApiProperty({ enum: ["blocked", "completed_nonempty", "failed"] })
  declare readonly status: string;

  @ApiProperty({ example: "abc123" })
  declare readonly checksum: string;
}

export class NarrativeSectionDto {
  @ApiProperty({ example: "Overview" })
  declare readonly title: string;

  @ApiProperty({
    example:
      "Liverpool vs Chelsea: sealed recommendation is lean_home. These values were not recomputed.",
  })
  declare readonly body: string;
}

export class NarrativeDraftDto {
  @ApiProperty({ enum: ["inference"], example: "inference" })
  declare readonly epistemicKind: string;

  @ApiProperty({ example: "local_deterministic_v1" })
  declare readonly providerId: string;

  @ApiProperty({ example: "prompt-manifest:report:match-example:abc" })
  declare readonly promptManifestId: string;

  @ApiProperty({ example: "fnv1a-deadbeef" })
  declare readonly promptManifestChecksum: string;

  @ApiProperty({ isArray: true, type: () => NarrativeSectionDto })
  declare readonly sections: readonly NarrativeSectionDto[];

  @ApiProperty({
    example:
      "Inference draft only. Not fact, not market truth, not wagering advice.",
  })
  declare readonly disclaimer: string;

  @ApiProperty({ example: "2026-07-17T10:00:00Z", format: "date-time" })
  declare readonly generatedAt: string;
}

export class ScenarioDto {
  @ApiProperty({ enum: ["mostLikely", "secondLikely", "upset"] })
  declare readonly slot: string;

  @ApiProperty({ enum: ["home", "draw", "away"] })
  declare readonly winner: string;

  @ApiProperty({ example: 2 })
  declare readonly homeGoals: number;

  @ApiProperty({ example: 1 })
  declare readonly awayGoals: number;

  @ApiProperty({ example: 0.12 })
  declare readonly probability: number;

  @ApiProperty({ example: "Home win 2-1" })
  declare readonly label: string;
}

export class ScenarioSetDto {
  @ApiProperty({ example: "scenario.mvp.a05" })
  declare readonly policyVersion: string;

  @ApiProperty({ example: "football:244001" })
  declare readonly matchId: string;

  @ApiProperty({ type: () => ScenarioDto })
  declare readonly mostLikely: ScenarioDto;

  @ApiProperty({ type: () => ScenarioDto })
  declare readonly secondLikely: ScenarioDto;

  @ApiProperty({ type: () => ScenarioDto })
  declare readonly upset: ScenarioDto;

  @ApiProperty({ example: 0.45 })
  declare readonly residualMass: number;

  @ApiProperty({ example: "fnv1a-deadbeef" })
  declare readonly checksum: string;
}

export class IntelligenceConfidenceDto {
  @ApiProperty({ example: "confidence.mvp.a05" })
  declare readonly policyVersion: string;

  @ApiProperty({ example: "football:244001" })
  declare readonly matchId: string;

  @ApiProperty({ example: 62.5 })
  declare readonly predictionConfidence: number;

  @ApiProperty({ enum: ["low", "medium", "high", "very_high"] })
  declare readonly confidenceBand: string;

  @ApiProperty({ example: 28.4 })
  declare readonly upsetRisk: number;

  @ApiProperty({ example: 85.7 })
  declare readonly evidenceCompleteness: number;

  @ApiProperty({ example: 70.0 })
  declare readonly ruleAgreement: number;

  @ApiProperty({ isArray: true, type: String })
  declare readonly limitations: readonly string[];

  @ApiProperty({ example: "fnv1a-deadbeef" })
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

  @ApiProperty({ type: () => ScenarioSetDto })
  declare readonly scenarios: ScenarioSetDto;

  @ApiProperty({ type: () => IntelligenceConfidenceDto })
  declare readonly intelligenceConfidence: IntelligenceConfidenceDto;

  @ApiProperty({ type: () => NarrativeDraftDto })
  declare readonly narrative: NarrativeDraftDto;
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

export class UpcomingMatchDto {
  @ApiProperty({ example: "match-example-2" })
  declare readonly matchId: string;

  @ApiProperty({ example: "eb2553d10d63dc912b99f8fd0d675721" })
  declare readonly eventId: string;

  @ApiProperty({ example: "soccer_epl" })
  declare readonly sportKey: string;

  @ApiProperty({ example: "EPL" })
  declare readonly competition: string;

  @ApiProperty({ example: "Arsenal" })
  declare readonly homeTeam: string;

  @ApiProperty({ example: "Coventry City" })
  declare readonly awayTeam: string;

  @ApiProperty({ example: "2026-08-21T19:00:00Z", format: "date-time" })
  declare readonly kickoff: string;

  @ApiProperty({
    description:
      "True when full fixture evidence exists for analyze/import in this slice.",
    example: true,
  })
  declare readonly analyzable: boolean;

  @ApiProperty({
    enum: ["api-football", "fixture", "the-odds-api"],
    example: "api-football",
  })
  declare readonly providerSource: string;

  @ApiProperty({
    enum: ["fixture", "http-live", "recorded-snapshot"],
    example: "recorded-snapshot",
  })
  declare readonly providerMethod: string;
}

export class UpcomingMatchesMetaDto {
  @ApiProperty({
    enum: ["recorded", "live", "fixture"],
    example: "recorded",
    description: "API ODDS_PROVIDER_MODE (odds overlay / fallback path).",
  })
  declare readonly oddsProviderMode: "recorded" | "live" | "fixture";

  @ApiProperty({
    enum: ["recorded", "live", "fixture"],
    example: "recorded",
    description:
      "API FOOTBALL_DATA_PROVIDER_MODE. When not fixture, Match Center schedule is Football Data primary.",
  })
  declare readonly footballDataProviderMode: "recorded" | "live" | "fixture";

  @ApiProperty({
    enum: ["football-data", "odds"],
    example: "football-data",
    description: "Which provider built the primary Match Center schedule.",
  })
  declare readonly scheduleSource: "football-data" | "odds";

  @ApiProperty({
    example: false,
    description:
      "True when the primary live schedule source failed and fell back to a recorded cassette.",
  })
  declare readonly usedRecordedFallback: boolean;
}

export class UpcomingMatchesSuccessResponseDto {
  @ApiProperty({ enum: [true], example: true })
  declare readonly ok: true;

  @ApiProperty({ isArray: true, type: () => UpcomingMatchDto })
  declare readonly value: readonly UpcomingMatchDto[];

  @ApiProperty({ type: () => UpcomingMatchesMetaDto })
  declare readonly meta: UpcomingMatchesMetaDto;
}

export class UpcomingMatchesErrorDto {
  @ApiProperty({ example: "UPCOMING_MATCHES_FAILED" })
  declare readonly code: string;

  @ApiProperty({ example: "Unable to load upcoming matches." })
  declare readonly message: string;
}

export class UpcomingMatchesErrorResponseDto {
  @ApiProperty({ enum: [false], example: false })
  declare readonly ok: false;

  @ApiProperty({ type: () => UpcomingMatchesErrorDto })
  declare readonly error: UpcomingMatchesErrorDto;
}
