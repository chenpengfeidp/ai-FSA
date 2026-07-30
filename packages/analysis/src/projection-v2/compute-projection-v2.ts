import type { FeatureBundle } from "@fas/feature";
import type { RuleResult } from "@fas/rule";
import type { CalibrationArtifact } from "@fas/statistics";
import { computeDeterministicProjectionV2 } from "../projection/compute-deterministic-projection-v2.js";
import { computeFootballState } from "./football-state/compute-football-state.js";
import { buildLambdasV2 } from "./lambda/lambda-builder-v2.js";
import { generateMatchScriptSet } from "./match-script/match-script-generator.js";
import { buildScriptProbabilityMatrix } from "./probability-matrix/build-script-probability-matrix.js";
import { mergeProbabilityMatrices } from "./probability-matrix/merge-probability-matrices.js";
import type { ProbabilityMatrix } from "./probability-matrix/probability-matrix.js";
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
  const scriptMatrices: Array<{
    readonly scriptId: string;
    readonly matrix: ProbabilityMatrix;
  }> = [];

  if (!lambdaResult.blocked) {
    for (const script of matchScriptSet.scripts) {
      scriptMatrices.push(
        Object.freeze({
          scriptId: script.scriptId,
          matrix: buildScriptProbabilityMatrix({
            baseLambdaHome: lambdaResult.lambdaHome,
            baseLambdaAway: lambdaResult.lambdaAway,
            modifiers: script.lambdaModifiers,
            parameters: parameters.lambda,
          }),
        }),
      );
    }
  }

  const probabilityMatrix = lambdaResult.blocked
    ? null
    : mergeProbabilityMatrices(
        matchScriptSet.scripts
          .map((script, index) =>
            Object.freeze({
              weight: script.weight,
              matrix: scriptMatrices[index]?.matrix,
            }),
          )
          .filter(
            (
              entry,
            ): entry is Readonly<{
              readonly weight: number;
              readonly matrix: ProbabilityMatrix;
            }> => entry.matrix !== undefined,
          ),
      );
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
    ...(probabilityMatrix === null || probabilityMatrix === undefined
      ? {}
      : { mergedProbabilityMatrix: probabilityMatrix }),
  });
  const framework = createProjectionFrameworkMetadata({
    parameters,
    footballState,
    matchScriptSet,
    probabilityMatrix,
    scriptMatrices: Object.freeze([...scriptMatrices]),
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
