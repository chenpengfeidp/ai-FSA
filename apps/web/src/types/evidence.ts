import type { JsonValue } from "./analysis";

export type EvidenceType =
  | "HEAD_TO_HEAD"
  | "INJURY"
  | "LINEUP"
  | "MATCH_INFO"
  | "NEWS"
  | "ODDS"
  | "PLAYER"
  | "RANKING"
  | "STATISTICS"
  | "SUSPENSION"
  | "TEAM_FORM"
  | "VENUE"
  | "WEATHER";

export type EvidenceFreshness = "fresh" | "stale" | "unknown";

export type EvidenceQuality = "rejected" | "unverified" | "verified";

export type EvidenceSourceConfidence = "high" | "low" | "medium" | "unknown";

export type EvidenceProviderCategory =
  | "football"
  | "internal"
  | "market"
  | "prediction"
  | "sentiment";

export interface EvidenceProvenanceDto {
  readonly collector: string;
  readonly method: string;
  readonly providerId: string;
  readonly category: EvidenceProviderCategory;
}

export interface EvidenceDto {
  readonly id: string;
  readonly providerId: string;
  readonly source: string;
  readonly sourceId: string;
  readonly type: EvidenceType;
  readonly matchId?: string;
  readonly collectedAt: string;
  readonly eventTime: string;
  readonly timestamp: string;
  readonly freshness: EvidenceFreshness;
  readonly confidence: EvidenceSourceConfidence;
  readonly quality: EvidenceQuality;
  readonly provenance: EvidenceProvenanceDto;
  readonly payload: Readonly<{ [key: string]: JsonValue }>;
}

export interface EvidenceListSuccessDto {
  readonly ok: true;
  readonly value: readonly EvidenceDto[];
}

export interface EvidenceQueryErrorDto {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

export type EvidenceByMatchResponseDto =
  | EvidenceListSuccessDto
  | EvidenceQueryErrorDto;
