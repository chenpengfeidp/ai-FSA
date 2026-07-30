import type { FeatureBundle } from "@fas/feature";
import type { RuleResult } from "@fas/rule";
import type { CalibrationArtifact } from "@fas/statistics";
import { computeDeterministicMatchProjection } from "./compute-deterministic-projection.js";
import type { DeterministicMatchProjection } from "./deterministic-match-projection.js";
import { computeProjectionV2 } from "../projection-v2/compute-projection-v2.js";
import type { ProjectionFrameworkMetadata } from "../projection-v2/projection-result.js";
import { createFootballStateReportMetadata } from "../projection-v2/football-state/football-state-report-metadata.js";
import type { FootballStateReportMetadata } from "../projection-v2/football-state/football-state-report-metadata.js";
import {
  DEFAULT_PROJECTION_POLICY_PIN,
  type ProjectionPolicyPin,
  resolveProjectionParameterArtifact,
} from "../projection-v2/resolve-projection-policy.js";

export interface ComputeMatchProjectionResult {
  readonly projection: DeterministicMatchProjection;
  readonly projectionFramework?: ProjectionFrameworkMetadata;
  readonly footballState?: FootballStateReportMetadata;
}

export function computeMatchProjection(input: {
  readonly featureBundle: FeatureBundle;
  readonly ruleResults: readonly RuleResult[];
  readonly requiredEvidencePresentCount: number;
  readonly calibrationArtifact?: CalibrationArtifact;
  readonly projectionPolicyPin?: ProjectionPolicyPin;
}): ComputeMatchProjectionResult {
  const pin = input.projectionPolicyPin ?? DEFAULT_PROJECTION_POLICY_PIN;

  if (pin === "v2") {
    const parameters = resolveProjectionParameterArtifact(pin);
    const result = computeProjectionV2({
      featureBundle: input.featureBundle,
      ruleResults: input.ruleResults,
      requiredEvidencePresentCount: input.requiredEvidencePresentCount,
      ...(input.calibrationArtifact === undefined
        ? {}
        : { calibrationArtifact: input.calibrationArtifact }),
      ...(parameters === undefined ? {} : { parameters }),
    });

    return Object.freeze({
      projection: result.projection,
      projectionFramework: result.framework,
      footballState: createFootballStateReportMetadata(result.footballState),
    });
  }

  return Object.freeze({
    projection: computeDeterministicMatchProjection({
      featureBundle: input.featureBundle,
      ruleResults: input.ruleResults,
      requiredEvidencePresentCount: input.requiredEvidencePresentCount,
      ...(input.calibrationArtifact === undefined
        ? {}
        : { calibrationArtifact: input.calibrationArtifact }),
    }),
  });
}
