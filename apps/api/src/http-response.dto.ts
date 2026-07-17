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
