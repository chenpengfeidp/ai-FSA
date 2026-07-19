import { describe, expect, it } from "vitest";
import {
  applyCalibration,
  CalibrationApplicationError,
  CalibrationArtifactValidationError,
  createCalibrationArtifact,
  IDENTITY_CALIBRATION_ARTIFACT,
  IDENTITY_CALIBRATION_ARTIFACT_ID,
} from "../src/index.js";

describe("IDENTITY_CALIBRATION_ARTIFACT", () => {
  it("is a pinned uncalibrated baseline", () => {
    expect(IDENTITY_CALIBRATION_ARTIFACT.artifactId).toBe(
      IDENTITY_CALIBRATION_ARTIFACT_ID,
    );
    expect(IDENTITY_CALIBRATION_ARTIFACT.status).toBe("uncalibrated_baseline");
    expect(IDENTITY_CALIBRATION_ARTIFACT.qualified).toBe(false);
    expect(IDENTITY_CALIBRATION_ARTIFACT.map.type).toBe("identity");
    expect(Object.isFrozen(IDENTITY_CALIBRATION_ARTIFACT)).toBe(true);
  });
});

describe("createCalibrationArtifact", () => {
  it("rejects marking an uncalibrated baseline as qualified", () => {
    expect(() =>
      createCalibrationArtifact({
        artifactId: "calibration:bad",
        calibrationModelVersion: "calibration.v1.identity",
        map: { type: "identity" },
        sampleSize: 0,
        qualified: true,
        status: "uncalibrated_baseline",
        checksum: "x",
        limitations: [],
      }),
    ).toThrow(CalibrationArtifactValidationError);
  });
});

describe("applyCalibration", () => {
  it("leaves identity-mapped probabilities unchanged after renormalization", () => {
    const applied = applyCalibration(
      { pHome: 0.5, pDraw: 0.3, pAway: 0.2 },
      IDENTITY_CALIBRATION_ARTIFACT,
    );

    expect(applied.pHome).toBeCloseTo(0.5, 12);
    expect(applied.pDraw).toBeCloseTo(0.3, 12);
    expect(applied.pAway).toBeCloseTo(0.2, 12);
  });

  it("renormalizes non-unit triples under identity", () => {
    const applied = applyCalibration(
      { pHome: 1, pDraw: 1, pAway: 2 },
      IDENTITY_CALIBRATION_ARTIFACT,
    );

    expect(applied.pHome + applied.pDraw + applied.pAway).toBeCloseTo(1, 12);
    expect(applied.pAway).toBeCloseTo(0.5, 12);
  });

  it("rejects invalid probabilities", () => {
    expect(() =>
      applyCalibration(
        { pHome: Number.NaN, pDraw: 0.3, pAway: 0.2 },
        IDENTITY_CALIBRATION_ARTIFACT,
      ),
    ).toThrow(CalibrationApplicationError);
  });
});
