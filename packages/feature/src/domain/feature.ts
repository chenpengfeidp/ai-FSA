import type { JsonValue } from "@fas/domain";
import { createMatchId, type MatchId } from "@fas/match";

export type FeatureName =
  | "attackRatingAway"
  | "attackRatingHome"
  | "awayTeam"
  | "defenseRatingAway"
  | "defenseRatingHome"
  | "homeAdvantage"
  | "homeTeam"
  | "kickoff"
  | "momentumAway"
  | "momentumHome";

export interface Feature {
  readonly featureId: string;
  readonly matchId: MatchId;
  readonly name: FeatureName;
  readonly value: JsonValue;
  readonly explanation: string;
  readonly sourceEvidenceId: string;
  readonly generatedAt: string;
}

export interface CreateFeatureInput {
  readonly featureId: string;
  readonly matchId: MatchId;
  readonly name: string;
  readonly value: JsonValue;
  readonly explanation?: string;
  readonly sourceEvidenceId: string;
  readonly generatedAt: string;
}

export class FeatureValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeatureValidationError";
  }
}

const featureNames: ReadonlySet<string> = new Set([
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
]);
const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new FeatureValidationError(`${field} must not be empty.`);
  }

  return normalized;
}

function requireFeatureName(value: string): FeatureName {
  if (!featureNames.has(value)) {
    throw new FeatureValidationError("name is invalid.");
  }

  return value as FeatureName;
}

function requireTimestamp(value: string): string {
  if (!isoTimestampPattern.test(value) || Number.isNaN(Date.parse(value))) {
    throw new FeatureValidationError(
      "generatedAt must be a valid ISO 8601 timestamp.",
    );
  }

  return value;
}

function cloneAndFreezeJson(value: JsonValue): JsonValue {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new FeatureValidationError("value must contain only valid JSON values.");
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

export function createFeature(input: CreateFeatureInput): Feature {
  return Object.freeze({
    featureId: requireNonEmpty(input.featureId, "featureId"),
    matchId: createMatchId(input.matchId),
    name: requireFeatureName(input.name),
    value: cloneAndFreezeJson(input.value),
    explanation: input.explanation?.trim() ?? "",
    sourceEvidenceId: requireNonEmpty(input.sourceEvidenceId, "sourceEvidenceId"),
    generatedAt: requireTimestamp(input.generatedAt),
  });
}
