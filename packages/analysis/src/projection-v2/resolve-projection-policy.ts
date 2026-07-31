import {
  BASELINE_PROJECTION_PARAMETER_ARTIFACT,
  FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT,
  MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT,
  type ProjectionParameterArtifact,
} from "./projection-parameter-artifact.js";
import { getActiveProjectionParameterArtifact } from "./projection-parameter-registry.js";

export type ProjectionPolicyPin = "v1" | "v2";

export const DEFAULT_PROJECTION_POLICY_PIN: ProjectionPolicyPin = "v1";

export function resolveProjectionParameterArtifact(
  pin: ProjectionPolicyPin,
): ProjectionParameterArtifact | undefined {
  if (pin === "v2") {
    return getActiveProjectionParameterArtifact();
  }

  return undefined;
}

export {
  BASELINE_PROJECTION_PARAMETER_ARTIFACT,
  FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT,
  MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT,
};
