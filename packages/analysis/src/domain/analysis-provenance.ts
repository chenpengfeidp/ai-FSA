import type { ProjectionPolicyPin } from "../projection-v2/resolve-projection-policy.js";

export interface FixtureResolutionMetadata {
  readonly requestedHomeTeam: string;
  readonly requestedAwayTeam: string;
  readonly requestedDate?: string;
  readonly normalizedHomeTeam: string;
  readonly normalizedAwayTeam: string;
  readonly resolvedHomeTeam: string;
  readonly resolvedAwayTeam: string;
  readonly resolvedMatchId: string;
  readonly kickoff: string;
  readonly competition: string;
  readonly scheduleSource: string;
  readonly providerSource: string;
  readonly homeAwaySwapped: boolean;
}

export interface FixtureDiscoveryCandidate {
  readonly matchId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoff: string;
  readonly competition: string;
  readonly providerSource: string;
  readonly analyzable: boolean;
  readonly homeAwaySwapped: boolean;
}

export interface AnalysisProvenanceMetadata {
  readonly projectionPolicyPin: ProjectionPolicyPin;
  readonly fixtureResolution?: FixtureResolutionMetadata;
}

export interface CreateAnalysisProvenanceInput {
  readonly projectionPolicyPin: ProjectionPolicyPin;
  readonly fixtureResolution?: FixtureResolutionMetadata;
}

export function createAnalysisProvenanceMetadata(
  input: CreateAnalysisProvenanceInput,
): AnalysisProvenanceMetadata {
  return Object.freeze({
    projectionPolicyPin: input.projectionPolicyPin,
    ...(input.fixtureResolution === undefined
      ? {}
      : { fixtureResolution: Object.freeze({ ...input.fixtureResolution }) }),
  });
}
