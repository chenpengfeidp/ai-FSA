import { CALIBRATION_CANDIDATE1_LAMBDA_PARAMETER_SET } from "./lambda/calibration-candidate1-lambda-weights.js";
import { GOVERNED_MATCH_SCRIPT_PARAMETER_SET } from "./match-script/match-script-governed-parameters.js";
import {
  DEFAULT_CONFIDENCE_PARAMETERS,
  DEFAULT_FOOTBALL_STATE_PARAMETERS,
  DEFAULT_RECOMMENDATION_PARAMETERS,
  MATRIX_MERGE_PARAMETER_POLICY_VERSION,
  type MatrixMergeParameterSet,
} from "./projection-parameter-groups.js";
import {
  checksumForProjectionParameterPayload,
  createProjectionParameterArtifact,
  PROJECTION_PARAMS_MATCH_SCRIPT_ARTIFACT_ID,
  PROJECTION_PARAMS_POLICY_VERSION,
  PROJECTION_FRAMEWORK_VERSION_UNIFIED_MATRIX,
  PROJECTION_PARAMETER_VERSION_CALIBRATION_CANDIDATE1,
  type ProjectionParameterArtifact,
} from "./projection-parameter-artifact.js";

export const PROJECTION_CALIBRATION_CANDIDATE1_VERSION_LABEL =
  PROJECTION_PARAMETER_VERSION_CALIBRATION_CANDIDATE1;

export const PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT_ID =
  "projectionParams:v3.2:calibrationCandidate1";

export const CALIBRATION_CANDIDATE1_MATRIX_MERGE_PARAMETERS: MatrixMergeParameterSet =
  Object.freeze({
    policyVersion: MATRIX_MERGE_PARAMETER_POLICY_VERSION,
    algorithm: "convex_cell_merge_v1",
    normalizeWeights: true,
    lowScoreDependence: Object.freeze({
      enabled: true,
      rho: -0.1,
    }),
  });

function buildCalibrationCandidate1Artifact(): ProjectionParameterArtifact {
  const footballState = DEFAULT_FOOTBALL_STATE_PARAMETERS;
  const confidence = DEFAULT_CONFIDENCE_PARAMETERS;
  const recommendation = DEFAULT_RECOMMENDATION_PARAMETERS;
  const matrixMerge = CALIBRATION_CANDIDATE1_MATRIX_MERGE_PARAMETERS;
  const lambda = CALIBRATION_CANDIDATE1_LAMBDA_PARAMETER_SET;
  const matchScript = GOVERNED_MATCH_SCRIPT_PARAMETER_SET;

  return createProjectionParameterArtifact({
    artifactId: PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT_ID,
    versionLabel: PROJECTION_CALIBRATION_CANDIDATE1_VERSION_LABEL,
    policyVersion: PROJECTION_PARAMS_POLICY_VERSION,
    frameworkVersion: PROJECTION_FRAMEWORK_VERSION_UNIFIED_MATRIX,
    status: "computed_candidate",
    qualified: false,
    checksum: checksumForProjectionParameterPayload({
      versionLabel: PROJECTION_CALIBRATION_CANDIDATE1_VERSION_LABEL,
      lambda,
      matchScript,
      footballState,
      confidence,
      recommendation,
      matrixMerge,
    }),
    limitations: Object.freeze([
      "P2K-CAL-2 governed calibration candidate — NON-DEFAULT / NOT production promoted.",
      "Corrects percent-scale Feature normalization for Projection λ (percentCentered vs unitCentered).",
      "Feature-group-specific λ governance: attack, xg, clubStrength, matchContext, defence, playerAvailability, baseRate, home advantage.",
      "Optional Dixon–Coles low-score dependence (rho=-0.10) governed by matrixMerge.lowScoreDependence.",
      "Production Match Script remains Baseline A; Candidate C is unchanged.",
      "Not derived from live match outcomes during prediction; offline replay validation only.",
      "Not Evaluation-qualified for release claims or automatic promotion.",
    ]),
    lambda,
    matchScript,
    footballState,
    confidence,
    recommendation,
    matrixMerge,
  });
}

/**
 * P2K-CAL-2 calibration candidate artifact.
 * `productionPromoted` is always false — promotion requires separate governance.
 */
export const PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT: ProjectionParameterArtifact =
  buildCalibrationCandidate1Artifact();

export const PROJECTION_CALIBRATION_CANDIDATE1_BASELINE_ARTIFACT_ID =
  PROJECTION_PARAMS_MATCH_SCRIPT_ARTIFACT_ID;
