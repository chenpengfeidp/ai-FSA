import type { Evidence } from "@fas/evidence";
import { createFeature, type Feature, type FeatureName } from "../domain/feature.js";

export type FeatureExtractionErrorCode =
  | "MATCH_ID_REQUIRED"
  | "MATCH_INFO_FIELD_INVALID";

export class FeatureExtractionError extends Error {
  readonly code: FeatureExtractionErrorCode;
  readonly field: string | undefined;

  constructor(code: FeatureExtractionErrorCode, message: string, field?: string) {
    super(message);
    this.name = "FeatureExtractionError";
    this.code = code;
    this.field = field;
  }
}

const emptyFeatures = Object.freeze([]) as readonly Feature[];

function requirePayloadString(evidence: Evidence, field: string): string {
  const value = evidence.payload[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new FeatureExtractionError(
      "MATCH_INFO_FIELD_INVALID",
      `${field} must be a non-empty string.`,
      field,
    );
  }

  return value;
}

function featureId(evidenceId: string, name: FeatureName): string {
  return `feature:${evidenceId}:${name}`;
}

export class FeatureExtractor {
  extract(evidence: Evidence): readonly Feature[] {
    if (evidence.type !== "MATCH_INFO") {
      return emptyFeatures;
    }

    if (evidence.matchId === undefined) {
      throw new FeatureExtractionError(
        "MATCH_ID_REQUIRED",
        "MATCH_INFO Evidence must reference a MatchId.",
        "matchId",
      );
    }

    const matchId = evidence.matchId;
    const inputs = [
      {
        name: "homeTeam" as const,
        value: requirePayloadString(evidence, "home"),
      },
      {
        name: "awayTeam" as const,
        value: requirePayloadString(evidence, "away"),
      },
      {
        name: "kickoff" as const,
        value: requirePayloadString(evidence, "kickoff"),
      },
    ];
    const features = inputs.map(({ name, value }) =>
      createFeature({
        featureId: featureId(evidence.id, name),
        matchId,
        name,
        value,
        sourceEvidenceId: evidence.id,
        generatedAt: evidence.collectedAt,
      }),
    );

    return Object.freeze(features);
  }
}
