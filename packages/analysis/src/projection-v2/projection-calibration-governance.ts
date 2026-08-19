import {
  PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT,
  PROJECTION_CALIBRATION_CANDIDATE1_VERSION_LABEL,
} from "./projection-calibration-candidate1.js";
import { MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT } from "./projection-parameter-artifact.js";
import type { ProjectionParameterArtifact } from "./projection-parameter-artifact.js";

export const PROJECTION_CALIBRATION_CANDIDATE1_LABEL =
  PROJECTION_CALIBRATION_CANDIDATE1_VERSION_LABEL;

export interface ProjectionCalibrationGovernanceRecord {
  readonly modelVersion: "projectionCalibrationGovernance.v1.p2k.cal2";
  readonly productionDefaultVersionLabel: string;
  readonly productionDefaultArtifactId: string;
  readonly candidate1: {
    readonly versionLabel: typeof PROJECTION_CALIBRATION_CANDIDATE1_VERSION_LABEL;
    readonly artifactId: string;
    readonly checksum: string;
    readonly productionPromoted: false;
    readonly offlineReplayEligible: true;
    readonly limitations: readonly string[];
  };
  readonly limitations: readonly string[];
}

export const PROJECTION_CALIBRATION_GOVERNANCE: ProjectionCalibrationGovernanceRecord =
  Object.freeze({
    modelVersion: "projectionCalibrationGovernance.v1.p2k.cal2",
    productionDefaultVersionLabel:
      MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT.versionLabel,
    productionDefaultArtifactId:
      MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT.artifactId,
    candidate1: Object.freeze({
      versionLabel: PROJECTION_CALIBRATION_CANDIDATE1_VERSION_LABEL,
      artifactId: PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT.artifactId,
      checksum: PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT.checksum,
      productionPromoted: false as const,
      offlineReplayEligible: true as const,
      limitations: PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT.limitations,
    }),
    limitations: Object.freeze([
      "Calibration candidates are NON-DEFAULT until explicit human promotion.",
      "Offline replay may compare production baseline vs calibration candidate on sealed cohorts.",
      "Calibration does not mutate Features, Rules, Evidence, or evaluation contracts.",
    ]),
  });

export const OFFLINE_PROJECTION_CALIBRATION_LABELS = Object.freeze([
  "projection.v3.replay",
  PROJECTION_CALIBRATION_CANDIDATE1_VERSION_LABEL,
] as const);

export type OfflineProjectionCalibrationLabel =
  (typeof OFFLINE_PROJECTION_CALIBRATION_LABELS)[number];

export type OfflineProjectionCalibrationResolveErrorCode =
  | "INVALID_PARAMETER_LABEL"
  | "PRODUCTION_IMPLICIT_OVERRIDE";

export type OfflineProjectionCalibrationResolveResult =
  | {
      readonly ok: true;
      readonly value: ProjectionParameterArtifact;
      readonly label: OfflineProjectionCalibrationLabel;
      readonly isProductionDefault: boolean;
      readonly productionPromoted: false;
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: OfflineProjectionCalibrationResolveErrorCode;
        readonly message: string;
      };
    };

export function resolveOfflineProjectionCalibrationArtifact(input: {
  readonly calibrationLabel: string | undefined;
}): OfflineProjectionCalibrationResolveResult {
  const label = input.calibrationLabel?.trim();

  if (label === undefined || label.length === 0) {
    return Object.freeze({
      ok: false,
      error: Object.freeze({
        code: "PRODUCTION_IMPLICIT_OVERRIDE" as const,
        message:
          "Offline Projection calibration replay requires an explicit calibrationLabel.",
      }),
    });
  }

  if (label === "projection.v3.replay") {
    return Object.freeze({
      ok: true,
      value: MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT,
      label: "projection.v3.replay" as const,
      isProductionDefault: true,
      productionPromoted: false as const,
    });
  }

  if (label === PROJECTION_CALIBRATION_CANDIDATE1_VERSION_LABEL) {
    return Object.freeze({
      ok: true,
      value: PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT,
      label: PROJECTION_CALIBRATION_CANDIDATE1_VERSION_LABEL,
      isProductionDefault: false,
      productionPromoted: false as const,
    });
  }

  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code: "INVALID_PARAMETER_LABEL" as const,
      message: `Unsupported offline Projection calibrationLabel: ${label}`,
    }),
  });
}

export function getProductionProjectionParameterArtifact(): ProjectionParameterArtifact {
  return MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT;
}

export function getCalibrationCandidate1ProjectionParameterArtifact(): ProjectionParameterArtifact {
  return PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT;
}
