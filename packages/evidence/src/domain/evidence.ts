import type { JsonObject, JsonValue } from "@fas/domain";
import { createMatchId, type MatchId } from "@fas/match";
import type { EvidenceProviderCategory } from "../provider/categories.js";
import { resolveProviderFromSource } from "../provider/resolve-provider.js";

export type EvidenceFreshness = "fresh" | "stale" | "unknown";
export type EvidenceQuality = "rejected" | "unverified" | "verified";
/** Source/evidence confidence — not Rule, Projection, or AI confidence (doc 41). */
export type EvidenceSourceConfidence = "high" | "low" | "medium" | "unknown";
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

export interface EvidenceProvenance {
  readonly collector: string;
  readonly method: string;
  readonly providerId: string;
  readonly category: EvidenceProviderCategory;
}

export interface Evidence {
  readonly id: string;
  /** Stable FAS provider registry id (e.g. football:api-sports). */
  readonly providerId: string;
  readonly source: string;
  readonly sourceId: string;
  readonly type: EvidenceType;
  readonly matchId?: MatchId;
  readonly collectedAt: string;
  readonly eventTime: string;
  /** Intake timestamp (defaults to collectedAt). */
  readonly timestamp: string;
  readonly freshness: EvidenceFreshness;
  readonly confidence: EvidenceSourceConfidence;
  readonly quality: EvidenceQuality;
  readonly provenance: EvidenceProvenance;
  readonly payload: JsonObject;
}

export interface CreateEvidenceInput {
  readonly id: string;
  readonly providerId?: string;
  readonly source: string;
  readonly sourceId: string;
  readonly type: string;
  readonly matchId?: MatchId;
  readonly collectedAt: string;
  readonly eventTime: string;
  readonly timestamp?: string;
  readonly freshness: EvidenceFreshness;
  readonly confidence?: EvidenceSourceConfidence;
  readonly quality: EvidenceQuality;
  readonly provenance: {
    readonly collector: string;
    readonly method: string;
    readonly providerId?: string;
    readonly category?: EvidenceProviderCategory;
  };
  readonly payload: JsonObject;
}

export class EvidenceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvidenceValidationError";
  }
}

const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const freshnessValues: ReadonlySet<string> = new Set(["fresh", "stale", "unknown"]);
const qualityValues: ReadonlySet<string> = new Set([
  "rejected",
  "unverified",
  "verified",
]);
const confidenceValues: ReadonlySet<string> = new Set([
  "high",
  "medium",
  "low",
  "unknown",
]);
const evidenceTypeValues: ReadonlySet<string> = new Set([
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
]);

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new EvidenceValidationError(`${field} must not be empty.`);
  }

  return normalized;
}

function requireTimestamp(value: string, field: string): string {
  if (!isoTimestampPattern.test(value) || Number.isNaN(Date.parse(value))) {
    throw new EvidenceValidationError(
      `${field} must be a valid ISO 8601 timestamp.`,
    );
  }

  return value;
}

function requireAllowedValue<T extends string>(
  value: T,
  allowedValues: ReadonlySet<string>,
  field: string,
): T {
  if (!allowedValues.has(value)) {
    throw new EvidenceValidationError(`${field} is invalid.`);
  }

  return value;
}

function cloneAndFreezeJson(value: JsonValue): JsonValue {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new EvidenceValidationError(
      "payload must contain only valid JSON values.",
    );
  }

  if (Array.isArray(value)) {
    return Object.freeze(value.map(cloneAndFreezeJson));
  }

  if (value !== null && typeof value === "object") {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          key,
          cloneAndFreezeJson(entry),
        ]),
      ),
    );
  }

  return value;
}

export function createEvidence(input: CreateEvidenceInput): Evidence {
  const source = requireNonEmpty(input.source, "source");
  const binding = resolveProviderFromSource(
    source,
    input.providerId ?? input.provenance.providerId,
    input.provenance.category,
  );
  const providerId = requireNonEmpty(binding.providerId, "providerId");
  const collectedAt = requireTimestamp(input.collectedAt, "collectedAt");
  const timestamp = requireTimestamp(input.timestamp ?? collectedAt, "timestamp");
  const confidence = requireAllowedValue(
    input.confidence ?? "unknown",
    confidenceValues,
    "confidence",
  ) as EvidenceSourceConfidence;

  const provenance = Object.freeze({
    collector: requireNonEmpty(input.provenance.collector, "provenance.collector"),
    method: requireNonEmpty(input.provenance.method, "provenance.method"),
    providerId,
    category: binding.category,
  });
  const payload = cloneAndFreezeJson(input.payload) as JsonObject;
  const matchReference =
    input.matchId === undefined ? {} : { matchId: createMatchId(input.matchId) };

  return Object.freeze({
    id: requireNonEmpty(input.id, "id"),
    providerId,
    source,
    sourceId: requireNonEmpty(input.sourceId, "sourceId"),
    type: requireAllowedValue(
      input.type,
      evidenceTypeValues,
      "type",
    ) as EvidenceType,
    ...matchReference,
    collectedAt,
    eventTime: requireTimestamp(input.eventTime, "eventTime"),
    timestamp,
    freshness: requireAllowedValue(input.freshness, freshnessValues, "freshness"),
    confidence,
    quality: requireAllowedValue(input.quality, qualityValues, "quality"),
    provenance,
    payload,
  });
}
