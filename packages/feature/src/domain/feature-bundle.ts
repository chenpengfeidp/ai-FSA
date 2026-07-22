import { createMatchId, type MatchId } from "@fas/match";
import type { Feature } from "./feature.js";

export const FEATURE_MODEL_VERSION = "feature.v2.f12b.advstats";

export type FeatureBundleStatus =
  | "blocked"
  | "completed_nonempty"
  | "degraded"
  | "failed";

export interface FeatureBundle {
  readonly featureModelVersion: typeof FEATURE_MODEL_VERSION;
  readonly matchId: MatchId;
  readonly features: readonly Feature[];
  readonly evidenceRefs: readonly string[];
  readonly checksum: string;
  readonly status: FeatureBundleStatus;
}

export interface CreateFeatureBundleInput {
  readonly matchId: MatchId;
  readonly features: readonly Feature[];
  readonly evidenceRefs: readonly string[];
  readonly checksum: string;
  readonly status: FeatureBundleStatus;
}

export class FeatureBundleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeatureBundleValidationError";
  }
}

export function createFeatureBundle(input: CreateFeatureBundleInput): FeatureBundle {
  const matchId = createMatchId(input.matchId);

  if (input.features.some((feature) => feature.matchId !== matchId)) {
    throw new FeatureBundleValidationError(
      "features must reference the FeatureBundle MatchId.",
    );
  }

  return Object.freeze({
    featureModelVersion: FEATURE_MODEL_VERSION,
    matchId,
    features: Object.freeze([...input.features]),
    evidenceRefs: Object.freeze([...input.evidenceRefs]),
    checksum: input.checksum,
    status: input.status,
  });
}
