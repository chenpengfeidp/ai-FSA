import type { DeterministicMatchProjection } from "../projection/deterministic-match-projection.js";
import {
  PROJECTION_FRAMEWORK_VERSION_MATCH_SCRIPT,
  type ProjectionParameterArtifact,
} from "./projection-parameter-artifact.js";
import type { FootballStateEnvelope } from "./football-state/football-state-envelope.js";
import type { MatchScriptSet } from "./match-script/match-script-set.js";
import type { ProbabilityMatrix } from "./probability-matrix/probability-matrix.js";

export interface MatchScriptSummary {
  readonly scriptId: string;
  readonly label: string;
  readonly weight: number;
  readonly activationReason: string;
  readonly activationReasons: readonly string[];
  readonly footballStateRefs: readonly string[];
  readonly activatingRules: readonly string[];
  readonly strengtheningFeatures: readonly string[];
  readonly lambdaHome: number;
  readonly lambdaAway: number;
}

export interface ProjectionFrameworkMetadata {
  readonly frameworkVersion: typeof PROJECTION_FRAMEWORK_VERSION_MATCH_SCRIPT;
  readonly parameterArtifactId: string;
  readonly parameterArtifactChecksum: string;
  readonly footballStatePolicyVersion: FootballStateEnvelope["policyVersion"];
  readonly matchScriptPolicyVersion: MatchScriptSet["policyVersion"];
  readonly footballStateChecksum: string;
  readonly matchScriptSetChecksum: string;
  readonly probabilityMatrixChecksum: string | null;
  readonly activeMatchScripts: readonly MatchScriptSummary[];
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
  readonly scriptMatrices: readonly Readonly<{
    readonly scriptId: string;
    readonly matrix: ProbabilityMatrix;
  }>[];
}): ProjectionFrameworkMetadata {
  const matrixByScriptId = new Map(
    input.scriptMatrices.map((entry) => [entry.scriptId, entry.matrix]),
  );

  return Object.freeze({
    frameworkVersion: PROJECTION_FRAMEWORK_VERSION_MATCH_SCRIPT,
    parameterArtifactId: input.parameters.artifactId,
    parameterArtifactChecksum: input.parameters.checksum,
    footballStatePolicyVersion: input.footballState.policyVersion,
    matchScriptPolicyVersion: input.matchScriptSet.policyVersion,
    footballStateChecksum: input.footballState.checksum,
    matchScriptSetChecksum: input.matchScriptSet.checksum,
    probabilityMatrixChecksum: input.probabilityMatrix?.checksum ?? null,
    activeMatchScripts: Object.freeze(
      input.matchScriptSet.scripts.map((script) => {
        const matrix = matrixByScriptId.get(script.scriptId);

        return Object.freeze({
          scriptId: script.scriptId,
          label: script.label,
          weight: script.weight,
          activationReason: script.activationReason,
          activationReasons: script.activationReasons,
          footballStateRefs: script.footballStateRefs,
          activatingRules: script.activatingRules,
          strengtheningFeatures: script.strengtheningFeatures,
          lambdaHome: matrix?.lambdaHome ?? 0,
          lambdaAway: matrix?.lambdaAway ?? 0,
        });
      }),
    ),
  });
}
