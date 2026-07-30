import {
  BASELINE_PROJECTION_PARAMETER_ARTIFACT,
  FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT,
  type ProjectionParameterArtifact,
} from "./projection-parameter-artifact.js";

export type ProjectionPolicyPin = "v1" | "v2";

export const DEFAULT_PROJECTION_POLICY_PIN: ProjectionPolicyPin = "v1";

export function resolveProjectionParameterArtifact(
  pin: ProjectionPolicyPin,
): ProjectionParameterArtifact | undefined {
  if (pin === "v2") {
    return FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT;
  }

  return undefined;
}

export { BASELINE_PROJECTION_PARAMETER_ARTIFACT };
