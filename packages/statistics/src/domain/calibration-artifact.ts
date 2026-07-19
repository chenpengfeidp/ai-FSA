export const IDENTITY_CALIBRATION_ARTIFACT_ID = "calibration:identity:v1";
export const CALIBRATION_MODEL_VERSION_IDENTITY = "calibration.v1.identity";

export type CalibrationArtifactStatus =
  | "computed_candidate"
  | "uncalibrated_baseline";

export type CalibrationMap = Readonly<{
  type: "identity";
}>;

export interface CalibrationArtifact {
  readonly artifactId: string;
  readonly calibrationModelVersion: string;
  readonly map: CalibrationMap;
  readonly sampleSize: number;
  readonly qualified: boolean;
  readonly status: CalibrationArtifactStatus;
  readonly checksum: string;
  readonly limitations: readonly string[];
}

export interface CreateCalibrationArtifactInput {
  readonly artifactId: string;
  readonly calibrationModelVersion: string;
  readonly map: CalibrationMap;
  readonly sampleSize: number;
  readonly qualified: boolean;
  readonly status: CalibrationArtifactStatus;
  readonly checksum: string;
  readonly limitations: readonly string[];
}

export class CalibrationArtifactValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalibrationArtifactValidationError";
  }
}

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new CalibrationArtifactValidationError(`${field} must not be empty.`);
  }

  return normalized;
}

export function createCalibrationArtifact(
  input: CreateCalibrationArtifactInput,
): CalibrationArtifact {
  if (input.map.type !== "identity") {
    throw new CalibrationArtifactValidationError(
      "Only identity calibration maps are supported in this slice.",
    );
  }

  if (
    !Number.isInteger(input.sampleSize) ||
    input.sampleSize < 0 ||
    !Number.isFinite(input.sampleSize)
  ) {
    throw new CalibrationArtifactValidationError(
      "sampleSize must be a non-negative integer.",
    );
  }

  if (input.status === "uncalibrated_baseline" && input.qualified) {
    throw new CalibrationArtifactValidationError(
      "uncalibrated_baseline artifacts cannot be marked qualified.",
    );
  }

  return Object.freeze({
    artifactId: requireNonEmpty(input.artifactId, "artifactId"),
    calibrationModelVersion: requireNonEmpty(
      input.calibrationModelVersion,
      "calibrationModelVersion",
    ),
    map: Object.freeze({ type: "identity" as const }),
    sampleSize: input.sampleSize,
    qualified: input.qualified,
    status: input.status,
    checksum: requireNonEmpty(input.checksum, "checksum"),
    limitations: Object.freeze([...input.limitations]),
  });
}

/**
 * Pinned uncalibrated baseline. Analysis consumes this exact artifact reference;
 * Statistics does not train or refresh maps during a match run.
 */
export const IDENTITY_CALIBRATION_ARTIFACT: CalibrationArtifact =
  createCalibrationArtifact({
    artifactId: IDENTITY_CALIBRATION_ARTIFACT_ID,
    calibrationModelVersion: CALIBRATION_MODEL_VERSION_IDENTITY,
    map: { type: "identity" },
    sampleSize: 0,
    qualified: false,
    status: "uncalibrated_baseline",
    checksum: "calibration-identity-v1-checksum",
    limitations: Object.freeze([
      "Identity calibration baseline: probabilities are unchanged.",
      "Not derived from a reviewed historical population.",
      "Not Evaluation-qualified for release claims.",
    ]),
  });
