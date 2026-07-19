import {
  IDENTITY_CALIBRATION_ARTIFACT,
  type CalibrationArtifact,
} from "../domain/calibration-artifact.js";
import { POPULATION_DEMO_CALIBRATION_ARTIFACT } from "./compute-frequency-ratio-calibration.js";

export type CalibrationArtifactMode = "identity" | "population_demo_v1";

export function resolvePinnedCalibrationArtifact(
  mode: CalibrationArtifactMode,
): CalibrationArtifact {
  switch (mode) {
    case "identity":
      return IDENTITY_CALIBRATION_ARTIFACT;
    case "population_demo_v1":
      return POPULATION_DEMO_CALIBRATION_ARTIFACT;
    default: {
      const exhaustive: never = mode;
      throw new Error(
        `Unsupported calibration artifact mode: ${String(exhaustive)}`,
      );
    }
  }
}
