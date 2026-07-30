import { stableChecksum } from "../projection/stable-checksum.js";
import type { LambdaParameterSet } from "./lambda/lambda-parameter-set.js";
import { FEATURE_ENRICHED_LAMBDA_PARAMETER_SET } from "./lambda/feature-enriched-lambda-weights.js";
import type { MatchScriptParameterSet } from "./match-script/match-script-parameter-set.js";
import { GOVERNED_MATCH_SCRIPT_PARAMETER_SET } from "./match-script/match-script-governed-parameters.js";

export const PROJECTION_PARAMS_BASELINE_ARTIFACT_ID =
  "projectionParams:v3.0:baseline";
export const PROJECTION_PARAMS_FEATURE_LAMBDA_ARTIFACT_ID =
  "projectionParams:v3.0:featureLambda";
export const PROJECTION_PARAMS_MATCH_SCRIPT_ARTIFACT_ID =
  "projectionParams:v3.1:matchScript";
export const PROJECTION_PARAMS_POLICY_VERSION = "projectionParams.v3.0";
export const PROJECTION_FRAMEWORK_VERSION_FOUNDATION =
  "projectionFramework.v2.foundation";
export const PROJECTION_FRAMEWORK_VERSION = "projectionFramework.v2.featureLambda";
export const PROJECTION_FRAMEWORK_VERSION_MATCH_SCRIPT =
  "projectionFramework.v2.matchScript";

export type ProjectionFrameworkVersion =
  | typeof PROJECTION_FRAMEWORK_VERSION
  | typeof PROJECTION_FRAMEWORK_VERSION_FOUNDATION
  | typeof PROJECTION_FRAMEWORK_VERSION_MATCH_SCRIPT;

export type ProjectionParameterArtifactStatus =
  | "uncalibrated_baseline"
  | "computed_candidate";

export interface ProjectionParameterArtifact {
  readonly artifactId: string;
  readonly policyVersion: typeof PROJECTION_PARAMS_POLICY_VERSION;
  readonly frameworkVersion: ProjectionFrameworkVersion;
  readonly status: ProjectionParameterArtifactStatus;
  readonly qualified: boolean;
  readonly checksum: string;
  readonly limitations: readonly string[];
  readonly lambda: LambdaParameterSet;
  readonly matchScript?: MatchScriptParameterSet;
}

export interface CreateProjectionParameterArtifactInput {
  readonly artifactId: string;
  readonly policyVersion: typeof PROJECTION_PARAMS_POLICY_VERSION;
  readonly frameworkVersion: ProjectionFrameworkVersion;
  readonly status: ProjectionParameterArtifactStatus;
  readonly qualified: boolean;
  readonly checksum: string;
  readonly limitations: readonly string[];
  readonly lambda: LambdaParameterSet;
  readonly matchScript?: MatchScriptParameterSet;
}

export class ProjectionParameterArtifactValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectionParameterArtifactValidationError";
  }
}

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ProjectionParameterArtifactValidationError(
      `${field} must not be empty.`,
    );
  }

  return normalized;
}

function checksumForLambda(lambda: LambdaParameterSet): string {
  return stableChecksum(JSON.stringify(lambda));
}

export function createProjectionParameterArtifact(
  input: CreateProjectionParameterArtifactInput,
): ProjectionParameterArtifact {
  if (input.status === "uncalibrated_baseline" && input.qualified) {
    throw new ProjectionParameterArtifactValidationError(
      "uncalibrated_baseline artifacts cannot be marked qualified.",
    );
  }

  return Object.freeze({
    artifactId: requireNonEmpty(input.artifactId, "artifactId"),
    policyVersion: input.policyVersion,
    frameworkVersion: input.frameworkVersion,
    status: input.status,
    qualified: input.qualified,
    checksum: requireNonEmpty(input.checksum, "checksum"),
    limitations: Object.freeze([...input.limitations]),
    lambda: Object.freeze({
      ...input.lambda,
      featureWeights: Object.freeze([...input.lambda.featureWeights]),
    }),
    ...(input.matchScript === undefined
      ? {}
      : {
          matchScript: Object.freeze({
            ...input.matchScript,
            catalog: Object.freeze([...input.matchScript.catalog]),
          }),
        }),
  });
}

const FOUNDATION_ONLY_LAMBDA_PARAMETER_SET: LambdaParameterSet = Object.freeze({
  baseRate: 1.3,
  min: 0.05,
  max: 5,
  homeAttackShare: 0.6,
  awaySuppressShare: 0.4,
  ratingScale: 50,
  defenseFloor: 0.05,
  featureWeights: Object.freeze([]),
});

/**
 * Pinned baseline parameters for Projection V2 foundation parity.
 * No optional Feature weights — reproduces V1 λ on foundation fixtures.
 */
export const BASELINE_PROJECTION_PARAMETER_ARTIFACT: ProjectionParameterArtifact =
  createProjectionParameterArtifact({
    artifactId: PROJECTION_PARAMS_BASELINE_ARTIFACT_ID,
    policyVersion: PROJECTION_PARAMS_POLICY_VERSION,
    frameworkVersion: PROJECTION_FRAMEWORK_VERSION_FOUNDATION,
    status: "uncalibrated_baseline",
    qualified: false,
    checksum: checksumForLambda(FOUNDATION_ONLY_LAMBDA_PARAMETER_SET),
    lambda: FOUNDATION_ONLY_LAMBDA_PARAMETER_SET,
    limitations: Object.freeze([
      "Baseline projection parameters: identity Football State and single baseline Match Script only.",
      "LambdaBuilderV2 uses foundation attack/defence ratings only.",
      "Not derived from Evaluation History or offline replay.",
      "Not Evaluation-qualified for release claims.",
    ]),
  });

/**
 * P2E Feature-enriched lambda artifact.
 * All football coefficients live in the artifact — not in Projection logic.
 */
export const FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT: ProjectionParameterArtifact =
  createProjectionParameterArtifact({
    artifactId: PROJECTION_PARAMS_FEATURE_LAMBDA_ARTIFACT_ID,
    policyVersion: PROJECTION_PARAMS_POLICY_VERSION,
    frameworkVersion: PROJECTION_FRAMEWORK_VERSION,
    status: "uncalibrated_baseline",
    qualified: false,
    checksum: checksumForLambda(FEATURE_ENRICHED_LAMBDA_PARAMETER_SET),
    lambda: FEATURE_ENRICHED_LAMBDA_PARAMETER_SET,
    limitations: Object.freeze([
      "Feature-enriched lambda artifact: Intelligence Features contribute directly to expected goals.",
      "RuleResults are explainability-only in Projection V2; they do not adjust 1X2 probabilities.",
      "Not derived from Evaluation History or offline replay.",
      "Not Evaluation-qualified for release claims.",
    ]),
  });

/**
 * P2F Match Script artifact — Feature-enriched λ plus governed script mixture.
 */
export const MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT: ProjectionParameterArtifact =
  createProjectionParameterArtifact({
    artifactId: PROJECTION_PARAMS_MATCH_SCRIPT_ARTIFACT_ID,
    policyVersion: PROJECTION_PARAMS_POLICY_VERSION,
    frameworkVersion: PROJECTION_FRAMEWORK_VERSION_MATCH_SCRIPT,
    status: "uncalibrated_baseline",
    qualified: false,
    checksum: stableChecksum(
      JSON.stringify({
        lambda: FEATURE_ENRICHED_LAMBDA_PARAMETER_SET,
        matchScript: GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
      }),
    ),
    lambda: FEATURE_ENRICHED_LAMBDA_PARAMETER_SET,
    matchScript: GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
    limitations: Object.freeze([
      "Match Script artifact: multiple pre-match scripts merged into one probability matrix.",
      "Feature-enriched lambda per script; governed script weights from matchScript.v1 tables.",
      "RuleResults activate scripts only — they do not softmax-adjust 1X2 probabilities.",
      "Not derived from Evaluation History or offline replay.",
      "Not Evaluation-qualified for release claims.",
    ]),
  });
