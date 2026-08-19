import type { FeatureBundle } from "@fas/feature";
import type { RuleResult } from "@fas/rule";
import type { CalibrationArtifact } from "@fas/statistics";
import { computeDeterministicProjectionV2 } from "../projection/compute-deterministic-projection-v2.js";
import { computeFootballState } from "./football-state/compute-football-state.js";
import { buildLambdasV2 } from "./lambda/lambda-builder-v2.js";
import { generateMatchScriptSet } from "./match-script/match-script-generator.js";
import { computeMultiScriptProjection } from "./multi-script/compute-multi-script-projection.js";
import {
  MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT,
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
  const parameters = input.parameters ?? MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT;
  const footballState = computeFootballState({
    featureBundle: input.featureBundle,
    lambdaParameters: parameters.lambda,
    footballStateParameters: parameters.footballState,
  });
  const matchScriptSet = generateMatchScriptSet({
    footballState,
    ...(parameters.matchScript === undefined
      ? {}
      : { parameters: parameters.matchScript }),
  });
  const lambdaResult = buildLambdasV2({
    footballState,
    parameters: parameters.lambda,
  });
  const multiScriptProjection = lambdaResult.blocked
    ? Object.freeze({
        perScriptProjections: Object.freeze([]),
        mergedMatrix: null,
      })
    : computeMultiScriptProjection({
        matchScriptSet,
        baseLambdaHome: lambdaResult.lambdaHome,
        baseLambdaAway: lambdaResult.lambdaAway,
        parameters: parameters.lambda,
        ...(parameters.matrixMerge.lowScoreDependence === undefined
          ? {}
          : { lowScoreDependence: parameters.matrixMerge.lowScoreDependence }),
      });
  const projection = computeDeterministicProjectionV2({
    featureBundle: input.featureBundle,
    ruleResults: input.ruleResults,
    requiredEvidencePresentCount: input.requiredEvidencePresentCount,
    parameters,
    footballState,
    matchScriptSet,
    ...(input.calibrationArtifact === undefined
      ? {}
      : { calibrationArtifact: input.calibrationArtifact }),
    ...(multiScriptProjection.mergedMatrix === null ||
    multiScriptProjection.mergedMatrix === undefined
      ? {}
      : { mergedProbabilityMatrix: multiScriptProjection.mergedMatrix }),
  });
  const framework = createProjectionFrameworkMetadata({
    parameters,
    footballState,
    matchScriptSet,
    probabilityMatrix: multiScriptProjection.mergedMatrix,
    perScriptProjections: multiScriptProjection.perScriptProjections,
  });

  return Object.freeze({
    projection,
    parameters,
    footballState,
    matchScriptSet,
    probabilityMatrix: multiScriptProjection.mergedMatrix,
    perScriptProjections: multiScriptProjection.perScriptProjections,
    framework,
  });
}
