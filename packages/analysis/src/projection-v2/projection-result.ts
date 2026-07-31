import type { DeterministicMatchProjection } from "../projection/deterministic-match-projection.js";
import {
  PROJECTION_FRAMEWORK_VERSION_UNIFIED_MATRIX,
  type ProjectionParameterArtifact,
} from "./projection-parameter-artifact.js";
import type { FootballStateEnvelope } from "./football-state/football-state-envelope.js";
import type { MatchScriptSet } from "./match-script/match-script-set.js";
import {
  buildMatchScriptProjectionSummaries,
  type MatchScriptProjectionSummary,
} from "./multi-script/build-multi-script-projection-metadata.js";
import type { PerScriptProjection } from "./multi-script/compute-multi-script-projection.js";
import type { ProbabilityMatrix } from "./probability-matrix/probability-matrix.js";
import {
  buildUnifiedMatrixSummary,
  type UnifiedMatrixSummary,
} from "./unified-matrix/build-unified-matrix-summary.js";

export type MatchScriptSummary = MatchScriptProjectionSummary;

export interface ProjectionFrameworkMetadata {
  readonly frameworkVersion: typeof PROJECTION_FRAMEWORK_VERSION_UNIFIED_MATRIX;
  readonly parameterArtifactId: string;
  readonly parameterArtifactChecksum: string;
  readonly footballStatePolicyVersion: FootballStateEnvelope["policyVersion"];
  readonly matchScriptPolicyVersion: MatchScriptSet["policyVersion"];
  readonly footballStateChecksum: string;
  readonly matchScriptSetChecksum: string;
  readonly probabilityMatrixChecksum: string | null;
  readonly activeMatchScripts: readonly MatchScriptProjectionSummary[];
  readonly unifiedMatrix: UnifiedMatrixSummary | null;
}

export interface ProjectionResult {
  readonly projection: DeterministicMatchProjection;
  readonly parameters: ProjectionParameterArtifact;
  readonly footballState: FootballStateEnvelope;
  readonly matchScriptSet: MatchScriptSet;
  readonly probabilityMatrix: ProbabilityMatrix | null;
  readonly perScriptProjections: readonly PerScriptProjection[];
  readonly framework: ProjectionFrameworkMetadata;
}

export function createProjectionFrameworkMetadata(input: {
  readonly parameters: ProjectionParameterArtifact;
  readonly footballState: FootballStateEnvelope;
  readonly matchScriptSet: MatchScriptSet;
  readonly probabilityMatrix: ProbabilityMatrix | null;
  readonly perScriptProjections: readonly PerScriptProjection[];
}): ProjectionFrameworkMetadata {
  const activeMatchScripts = buildMatchScriptProjectionSummaries({
    scripts: input.matchScriptSet.scripts,
    perScriptProjections: input.perScriptProjections,
  });
  const unifiedMatrix = buildUnifiedMatrixSummary({
    perScriptProjections: input.perScriptProjections,
    unifiedMatrix: input.probabilityMatrix,
  });

  return Object.freeze({
    frameworkVersion: PROJECTION_FRAMEWORK_VERSION_UNIFIED_MATRIX,
    parameterArtifactId: input.parameters.artifactId,
    parameterArtifactChecksum: input.parameters.checksum,
    footballStatePolicyVersion: input.footballState.policyVersion,
    matchScriptPolicyVersion: input.matchScriptSet.policyVersion,
    footballStateChecksum: input.footballState.checksum,
    matchScriptSetChecksum: input.matchScriptSet.checksum,
    probabilityMatrixChecksum: input.probabilityMatrix?.checksum ?? null,
    activeMatchScripts,
    unifiedMatrix,
  });
}
