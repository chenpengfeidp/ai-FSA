export const PROJECTION_PARAMS_BASELINE_ARTIFACT_ID =
  "projectionParams:v3.0:baseline";
export const PROJECTION_PARAMS_POLICY_VERSION = "projectionParams.v3.0";
export const PROJECTION_FRAMEWORK_VERSION = "projectionFramework.v2.foundation";

export type ProjectionParameterArtifactStatus =
  | "uncalibrated_baseline"
  | "computed_candidate";

export interface ProjectionParameterArtifact {
  readonly artifactId: string;
  readonly policyVersion: typeof PROJECTION_PARAMS_POLICY_VERSION;
  readonly frameworkVersion: typeof PROJECTION_FRAMEWORK_VERSION;
  readonly status: ProjectionParameterArtifactStatus;
  readonly qualified: boolean;
  readonly checksum: string;
  readonly limitations: readonly string[];
}

export interface CreateProjectionParameterArtifactInput {
  readonly artifactId: string;
  readonly policyVersion: typeof PROJECTION_PARAMS_POLICY_VERSION;
  readonly frameworkVersion: typeof PROJECTION_FRAMEWORK_VERSION;
  readonly status: ProjectionParameterArtifactStatus;
  readonly qualified: boolean;
  readonly checksum: string;
  readonly limitations: readonly string[];
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
  });
}

/**
 * Pinned baseline parameters for Projection V2 foundation.
 * Coefficient tables are identity — V1-compatible behaviour only.
 */
export const BASELINE_PROJECTION_PARAMETER_ARTIFACT: ProjectionParameterArtifact =
  createProjectionParameterArtifact({
    artifactId: PROJECTION_PARAMS_BASELINE_ARTIFACT_ID,
    policyVersion: PROJECTION_PARAMS_POLICY_VERSION,
    frameworkVersion: PROJECTION_FRAMEWORK_VERSION,
    status: "uncalibrated_baseline",
    qualified: false,
    checksum: "projection-params-v3-baseline-checksum",
    limitations: Object.freeze([
      "Baseline projection parameters: identity Football State and single baseline Match Script only.",
      "All probability outputs delegate to Projection V1 deterministic logic.",
      "Not derived from Evaluation History or offline replay.",
      "Not Evaluation-qualified for release claims.",
    ]),
  });
