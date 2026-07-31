import { stableChecksum } from "../projection/stable-checksum.js";
import type { LambdaParameterSet } from "./lambda/lambda-parameter-set.js";
import { FEATURE_ENRICHED_LAMBDA_PARAMETER_SET } from "./lambda/feature-enriched-lambda-weights.js";
import type { MatchScriptParameterSet } from "./match-script/match-script-parameter-set.js";
import { GOVERNED_MATCH_SCRIPT_PARAMETER_SET } from "./match-script/match-script-governed-parameters.js";
import {
  DEFAULT_CONFIDENCE_PARAMETERS,
  DEFAULT_FOOTBALL_STATE_PARAMETERS,
  DEFAULT_MATRIX_MERGE_PARAMETERS,
  DEFAULT_RECOMMENDATION_PARAMETERS,
  type ConfidenceParameterSet,
  type FootballStateParameterSet,
  type MatrixMergeParameterSet,
  type RecommendationParameterSet,
} from "./projection-parameter-groups.js";

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
export const PROJECTION_FRAMEWORK_VERSION_MULTI_SCRIPT =
  "projectionFramework.v2.multiScript";
export const PROJECTION_FRAMEWORK_VERSION_UNIFIED_MATRIX =
  "projectionFramework.v2.unifiedMatrix";

export const PROJECTION_PARAMETER_VERSION_BASELINE =
  "projection.v3.baseline" as const;
export const PROJECTION_PARAMETER_VERSION_EXPERIMENTAL =
  "projection.v3.experimental" as const;
export const PROJECTION_PARAMETER_VERSION_REPLAY = "projection.v3.replay" as const;

export type ProjectionParameterVersionLabel =
  | typeof PROJECTION_PARAMETER_VERSION_BASELINE
  | typeof PROJECTION_PARAMETER_VERSION_EXPERIMENTAL
  | typeof PROJECTION_PARAMETER_VERSION_REPLAY;

export type ProjectionFrameworkVersion =
  | typeof PROJECTION_FRAMEWORK_VERSION
  | typeof PROJECTION_FRAMEWORK_VERSION_FOUNDATION
  | typeof PROJECTION_FRAMEWORK_VERSION_MATCH_SCRIPT
  | typeof PROJECTION_FRAMEWORK_VERSION_MULTI_SCRIPT
  | typeof PROJECTION_FRAMEWORK_VERSION_UNIFIED_MATRIX;

export type ProjectionParameterArtifactStatus =
  | "uncalibrated_baseline"
  | "computed_candidate";

export interface ProjectionParameterArtifact {
  readonly artifactId: string;
  readonly versionLabel: ProjectionParameterVersionLabel;
  readonly policyVersion: typeof PROJECTION_PARAMS_POLICY_VERSION;
  readonly frameworkVersion: ProjectionFrameworkVersion;
  readonly status: ProjectionParameterArtifactStatus;
  readonly qualified: boolean;
  readonly checksum: string;
  readonly limitations: readonly string[];
  readonly lambda: LambdaParameterSet;
  readonly matchScript?: MatchScriptParameterSet;
  readonly footballState: FootballStateParameterSet;
  readonly confidence: ConfidenceParameterSet;
  readonly recommendation: RecommendationParameterSet;
  readonly matrixMerge: MatrixMergeParameterSet;
}

export interface CreateProjectionParameterArtifactInput {
  readonly artifactId: string;
  readonly versionLabel: ProjectionParameterVersionLabel;
  readonly policyVersion: typeof PROJECTION_PARAMS_POLICY_VERSION;
  readonly frameworkVersion: ProjectionFrameworkVersion;
  readonly status: ProjectionParameterArtifactStatus;
  readonly qualified: boolean;
  readonly checksum: string;
  readonly limitations: readonly string[];
  readonly lambda: LambdaParameterSet;
  readonly matchScript?: MatchScriptParameterSet;
  readonly footballState?: FootballStateParameterSet;
  readonly confidence?: ConfidenceParameterSet;
  readonly recommendation?: RecommendationParameterSet;
  readonly matrixMerge?: MatrixMergeParameterSet;
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

export function checksumForProjectionParameterPayload(input: {
  readonly versionLabel: ProjectionParameterVersionLabel;
  readonly lambda: LambdaParameterSet;
  readonly matchScript?: MatchScriptParameterSet;
  readonly footballState: FootballStateParameterSet;
  readonly confidence: ConfidenceParameterSet;
  readonly recommendation: RecommendationParameterSet;
  readonly matrixMerge: MatrixMergeParameterSet;
}): string {
  return stableChecksum(
    JSON.stringify({
      versionLabel: input.versionLabel,
      lambda: input.lambda,
      matchScript: input.matchScript ?? null,
      footballState: input.footballState,
      confidence: input.confidence,
      recommendation: input.recommendation,
      matrixMerge: input.matrixMerge,
    }),
  );
}

export function createProjectionParameterArtifact(
  input: CreateProjectionParameterArtifactInput,
): ProjectionParameterArtifact {
  if (input.status === "uncalibrated_baseline" && input.qualified) {
    throw new ProjectionParameterArtifactValidationError(
      "uncalibrated_baseline artifacts cannot be marked qualified.",
    );
  }

  const footballState = input.footballState ?? DEFAULT_FOOTBALL_STATE_PARAMETERS;
  const confidence = input.confidence ?? DEFAULT_CONFIDENCE_PARAMETERS;
  const recommendation = input.recommendation ?? DEFAULT_RECOMMENDATION_PARAMETERS;
  const matrixMerge = input.matrixMerge ?? DEFAULT_MATRIX_MERGE_PARAMETERS;

  return Object.freeze({
    artifactId: requireNonEmpty(input.artifactId, "artifactId"),
    versionLabel: input.versionLabel,
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
    footballState: Object.freeze({ ...footballState }),
    confidence: Object.freeze({ ...confidence }),
    recommendation: Object.freeze({ ...recommendation }),
    matrixMerge: Object.freeze({ ...matrixMerge }),
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

function buildPinnedArtifact(input: {
  readonly artifactId: string;
  readonly versionLabel: ProjectionParameterVersionLabel;
  readonly frameworkVersion: ProjectionFrameworkVersion;
  readonly lambda: LambdaParameterSet;
  readonly matchScript?: MatchScriptParameterSet;
  readonly limitations: readonly string[];
}): ProjectionParameterArtifact {
  const footballState = DEFAULT_FOOTBALL_STATE_PARAMETERS;
  const confidence = DEFAULT_CONFIDENCE_PARAMETERS;
  const recommendation = DEFAULT_RECOMMENDATION_PARAMETERS;
  const matrixMerge = DEFAULT_MATRIX_MERGE_PARAMETERS;

  return createProjectionParameterArtifact({
    artifactId: input.artifactId,
    versionLabel: input.versionLabel,
    policyVersion: PROJECTION_PARAMS_POLICY_VERSION,
    frameworkVersion: input.frameworkVersion,
    status: "uncalibrated_baseline",
    qualified: false,
    checksum: checksumForProjectionParameterPayload({
      versionLabel: input.versionLabel,
      lambda: input.lambda,
      footballState,
      confidence,
      recommendation,
      matrixMerge,
      ...(input.matchScript === undefined ? {} : { matchScript: input.matchScript }),
    }),
    lambda: input.lambda,
    ...(input.matchScript === undefined ? {} : { matchScript: input.matchScript }),
    footballState,
    confidence,
    recommendation,
    matrixMerge,
    limitations: input.limitations,
  });
}

/**
 * Pinned baseline parameters for Projection V2 foundation parity.
 * No optional Feature weights — reproduces V1 λ on foundation fixtures.
 */
export const BASELINE_PROJECTION_PARAMETER_ARTIFACT: ProjectionParameterArtifact =
  buildPinnedArtifact({
    artifactId: PROJECTION_PARAMS_BASELINE_ARTIFACT_ID,
    versionLabel: PROJECTION_PARAMETER_VERSION_BASELINE,
    frameworkVersion: PROJECTION_FRAMEWORK_VERSION_FOUNDATION,
    lambda: FOUNDATION_ONLY_LAMBDA_PARAMETER_SET,
    limitations: Object.freeze([
      "Baseline projection parameters: identity Football State and single baseline Match Script only.",
      "LambdaBuilderV2 uses foundation attack/defence ratings only.",
      "Not derived from Evaluation History or offline replay.",
      "Not Evaluation-qualified for release claims.",
      "No Dixon–Coles ρ — independent Poisson scorelines only.",
    ]),
  });

/**
 * P2E Feature-enriched lambda artifact (experimental catalog entry).
 * All football coefficients live in the artifact — not in Projection logic.
 */
export const FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT: ProjectionParameterArtifact =
  buildPinnedArtifact({
    artifactId: PROJECTION_PARAMS_FEATURE_LAMBDA_ARTIFACT_ID,
    versionLabel: PROJECTION_PARAMETER_VERSION_EXPERIMENTAL,
    frameworkVersion: PROJECTION_FRAMEWORK_VERSION,
    lambda: FEATURE_ENRICHED_LAMBDA_PARAMETER_SET,
    limitations: Object.freeze([
      "Feature-enriched lambda artifact: Intelligence Features contribute directly to expected goals.",
      "RuleResults are explainability-only in Projection V2; they do not adjust 1X2 probabilities.",
      "Not derived from Evaluation History or offline replay.",
      "Not Evaluation-qualified for release claims.",
      "No Dixon–Coles ρ — independent Poisson scorelines only.",
    ]),
  });

/**
 * P2F/P2G Match Script artifact — active V2 / replay catalog entry.
 */
export const MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT: ProjectionParameterArtifact =
  buildPinnedArtifact({
    artifactId: PROJECTION_PARAMS_MATCH_SCRIPT_ARTIFACT_ID,
    versionLabel: PROJECTION_PARAMETER_VERSION_REPLAY,
    frameworkVersion: PROJECTION_FRAMEWORK_VERSION_UNIFIED_MATRIX,
    lambda: FEATURE_ENRICHED_LAMBDA_PARAMETER_SET,
    matchScript: GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
    limitations: Object.freeze([
      "Match Script artifact: multiple pre-match scripts merged into one probability matrix.",
      "Feature-enriched lambda per script; governed script weights from matchScript.v1 tables.",
      "RuleResults activate scripts only — they do not softmax-adjust 1X2 probabilities.",
      "Not derived from Evaluation History or offline replay.",
      "Not Evaluation-qualified for release claims.",
      "No Dixon–Coles ρ — independent Poisson scorelines only.",
      "No ML or automatic parameter tuning — version selection is operator/pin only.",
    ]),
  });
