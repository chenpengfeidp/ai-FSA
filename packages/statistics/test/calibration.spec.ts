import { describe, expect, it } from "vitest";
import {
  applyCalibration,
  CalibrationApplicationError,
  CalibrationArtifactValidationError,
  CalibrationPopulationError,
  computeFrequencyRatioCalibrationArtifact,
  createCalibrationArtifact,
  IDENTITY_CALIBRATION_ARTIFACT,
  IDENTITY_CALIBRATION_ARTIFACT_ID,
  loadDemoPopulationRows,
  POPULATION_DEMO_CALIBRATION_ARTIFACT,
  POPULATION_DEMO_CALIBRATION_ARTIFACT_ID,
  resolvePinnedCalibrationArtifact,
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

describe("POPULATION_DEMO_CALIBRATION_ARTIFACT", () => {
  it("is a deterministic computed_candidate frequency-ratio map", () => {
    const rebuilt = computeFrequencyRatioCalibrationArtifact(
      loadDemoPopulationRows(),
    );

    expect(POPULATION_DEMO_CALIBRATION_ARTIFACT.artifactId).toBe(
      POPULATION_DEMO_CALIBRATION_ARTIFACT_ID,
    );
    expect(POPULATION_DEMO_CALIBRATION_ARTIFACT.status).toBe("computed_candidate");
    expect(POPULATION_DEMO_CALIBRATION_ARTIFACT.qualified).toBe(false);
    expect(POPULATION_DEMO_CALIBRATION_ARTIFACT.map.type).toBe(
      "frequency_ratio_1x2",
    );
    expect(POPULATION_DEMO_CALIBRATION_ARTIFACT.checksum).toBe(rebuilt.checksum);
    expect(POPULATION_DEMO_CALIBRATION_ARTIFACT.sampleSize).toBe(
      loadDemoPopulationRows().length,
    );
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

describe("computeFrequencyRatioCalibrationArtifact", () => {
  it("rejects undersized populations", () => {
    expect(() =>
      computeFrequencyRatioCalibrationArtifact([
        { pHome: 0.5, pDraw: 0.3, pAway: 0.2, outcome: "home" },
      ]),
    ).toThrow(CalibrationPopulationError);
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

  it("applies frequency-ratio multipliers then renormalizes", () => {
    const artifact = createCalibrationArtifact({
      artifactId: "calibration:test-ratio",
      calibrationModelVersion: "calibration.v1.frequency_ratio_1x2",
      map: {
        type: "frequency_ratio_1x2",
        homeMultiplier: 2,
        drawMultiplier: 1,
        awayMultiplier: 1,
      },
      sampleSize: 20,
      qualified: false,
      status: "computed_candidate",
      checksum: "test",
      limitations: [],
    });
    const applied = applyCalibration(
      { pHome: 0.5, pDraw: 0.3, pAway: 0.2 },
      artifact,
    );

    expect(applied.pHome).toBeCloseTo(1 / 1.5, 12);
    expect(applied.pDraw).toBeCloseTo(0.3 / 1.5, 12);
    expect(applied.pAway).toBeCloseTo(0.2 / 1.5, 12);
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

describe("resolvePinnedCalibrationArtifact", () => {
  it("resolves configured modes", () => {
    expect(resolvePinnedCalibrationArtifact("identity")).toBe(
      IDENTITY_CALIBRATION_ARTIFACT,
    );
    expect(resolvePinnedCalibrationArtifact("population_demo_v1")).toBe(
      POPULATION_DEMO_CALIBRATION_ARTIFACT,
    );
  });
});
