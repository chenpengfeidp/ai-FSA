import type { FeatureBundle } from "@fas/feature";
import type { RuleResult } from "@fas/rule";
import type { CalibrationArtifact } from "@fas/statistics";
import { computeDeterministicMatchProjection } from "../projection/compute-deterministic-projection.js";
import { computeIdentityFootballState } from "./football-state/compute-identity-football-state.js";
import { computeBaselineMatchScriptSet } from "./match-script/compute-baseline-match-script-set.js";
import { buildFoundationProbabilityMatrix } from "./probability-matrix/build-foundation-probability-matrix.js";
import {
  BASELINE_PROJECTION_PARAMETER_ARTIFACT,
  type ProjectionParameterArtifact,
} from "./projection-parameter-artifact.js";
import {
  createProjectionFrameworkMetadata,
  type ProjectionResult,
} from "./projection-result.js";

export function computeProjectionV2(input: {
  readonly featureBundle: FeatureBundle;
  readonly ruleResults: readonly RuleResult[];
  readonly requiredEvidencePresentCount: number;
  readonly calibrationArtifact?: CalibrationArtifact;
  readonly parameters?: ProjectionParameterArtifact;
}): ProjectionResult {
  const parameters = input.parameters ?? BASELINE_PROJECTION_PARAMETER_ARTIFACT;
  const footballState = computeIdentityFootballState({
    featureBundle: input.featureBundle,
    ruleResults: input.ruleResults,
  });
  const matchScriptSet = computeBaselineMatchScriptSet({
    featureBundle: input.featureBundle,
    ruleResults: input.ruleResults,
    footballState,
  });
  const probabilityMatrix =
    buildFoundationProbabilityMatrix({
      featureBundle: input.featureBundle,
    }) ?? null;
  const projection = computeDeterministicMatchProjection({
    featureBundle: input.featureBundle,
    ruleResults: input.ruleResults,
    requiredEvidencePresentCount: input.requiredEvidencePresentCount,
    ...(input.calibrationArtifact === undefined
      ? {}
      : { calibrationArtifact: input.calibrationArtifact }),
  });
  const framework = createProjectionFrameworkMetadata({
    parameters,
    footballState,
    matchScriptSet,
    probabilityMatrix,
  });

  return Object.freeze({
    projection,
    parameters,
    footballState,
    matchScriptSet,
    probabilityMatrix,
    framework,
  });
}
