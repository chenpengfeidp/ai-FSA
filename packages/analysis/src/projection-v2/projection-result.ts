import type { DeterministicMatchProjection } from "../projection/deterministic-match-projection.js";
import {
  PROJECTION_FRAMEWORK_VERSION,
  type ProjectionParameterArtifact,
} from "./projection-parameter-artifact.js";
import type { FootballStateEnvelope } from "./football-state/football-state-envelope.js";
import type { MatchScriptSet } from "./match-script/match-script-set.js";
import type { ProbabilityMatrix } from "./probability-matrix/probability-matrix.js";

export interface ProjectionFrameworkMetadata {
  readonly frameworkVersion: typeof PROJECTION_FRAMEWORK_VERSION;
  readonly parameterArtifactId: string;
  readonly parameterArtifactChecksum: string;
  readonly footballStatePolicyVersion: FootballStateEnvelope["policyVersion"];
  readonly matchScriptPolicyVersion: MatchScriptSet["policyVersion"];
  readonly footballStateChecksum: string;
  readonly matchScriptSetChecksum: string;
  readonly probabilityMatrixChecksum: string | null;
}

export interface ProjectionResult {
  readonly projection: DeterministicMatchProjection;
  readonly parameters: ProjectionParameterArtifact;
  readonly footballState: FootballStateEnvelope;
  readonly matchScriptSet: MatchScriptSet;
  readonly probabilityMatrix: ProbabilityMatrix | null;
  readonly framework: ProjectionFrameworkMetadata;
}

export function createProjectionFrameworkMetadata(input: {
  readonly parameters: ProjectionParameterArtifact;
  readonly footballState: FootballStateEnvelope;
  readonly matchScriptSet: MatchScriptSet;
  readonly probabilityMatrix: ProbabilityMatrix | null;
}): ProjectionFrameworkMetadata {
  return Object.freeze({
    frameworkVersion: PROJECTION_FRAMEWORK_VERSION,
    parameterArtifactId: input.parameters.artifactId,
    parameterArtifactChecksum: input.parameters.checksum,
    footballStatePolicyVersion: input.footballState.policyVersion,
    matchScriptPolicyVersion: input.matchScriptSet.policyVersion,
    footballStateChecksum: input.footballState.checksum,
    matchScriptSetChecksum: input.matchScriptSet.checksum,
    probabilityMatrixChecksum: input.probabilityMatrix?.checksum ?? null,
  });
}
