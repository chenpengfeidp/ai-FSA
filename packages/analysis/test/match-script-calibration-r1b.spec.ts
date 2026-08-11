import { describe, expect, it } from "vitest";
import {
  MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
  MATCH_SCRIPT_R1B_CANDIDATE_B_PARAMETER_SET,
  MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
} from "../src/projection-v2/match-script/match-script-calibration-candidates.js";
import {
  buildR1BSyntheticCalibrationCohort,
  compareR1BCandidates,
  computeR1BScriptLayerMetrics,
  evaluateR1BPromotionGate,
  R1B_CALIBRATION_COHORT_ID,
} from "../src/projection-v2/match-script/match-script-calibration-cohort.js";
import {
  R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE,
  resolveMatchScriptParameterSet,
} from "../src/projection-v2/match-script/match-script-calibration-governance.js";
import { GOVERNED_MATCH_SCRIPT_PARAMETER_SET } from "../src/projection-v2/match-script/match-script-governed-parameters.js";
import { generateMatchScriptSet } from "../src/projection-v2/match-script/match-script-generator.js";
import { scoreMatchScriptFromFootballState } from "../src/projection-v2/match-script/match-script-football-state-scoring.js";

describe("R1B Match Script calibration", () => {
  const cohort = buildR1BSyntheticCalibrationCohort();

  it("exposes a synthetic calibration cohort (not historical fixtures)", () => {
    expect(R1B_CALIBRATION_COHORT_ID).toBe("r1b.synthetic.script_shapes.v1");
    expect(cohort.length).toBeGreaterThanOrEqual(10);
    expect(
      cohort.some((row) =>
        /yokohama|kashima|sirius|aik|internacional|vasteras|kfum/i.test(
          row.scenarioId,
        ),
      ),
    ).toBe(false);
  });

  it("keeps Baseline A as the production default pin", () => {
    expect(GOVERNED_MATCH_SCRIPT_PARAMETER_SET).toBe(
      MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
    );
    expect(GOVERNED_MATCH_SCRIPT_PARAMETER_SET.calibrationLabel).toBe(
      "r1b.candidate.a.baseline",
    );
    expect(
      GOVERNED_MATCH_SCRIPT_PARAMETER_SET.catalog.find(
        (entry) => entry.scriptId === "home_control",
      )?.asymmetricBonuses[0]?.minimumRatingGap,
    ).toBe(0);
    expect(resolveMatchScriptParameterSet().calibrationLabel).toBe(
      "r1b.candidate.a.baseline",
    );
    expect(resolveMatchScriptParameterSet({}).calibrationLabel).toBe(
      "r1b.candidate.a.baseline",
    );
  });

  it("keeps Candidate C accessible but non-default and not silently promoted", () => {
    expect(MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET.calibrationLabel).toBe(
      "r1b.candidate.c.sideAwareOpen",
    );
    expect(MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET).not.toBe(
      GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
    );
    expect(
      resolveMatchScriptParameterSet({
        calibrationLabel: "r1b.candidate.c.sideAwareOpen",
      }),
    ).toBe(MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET);
    expect(
      R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE.candidateC.productionPromoted,
    ).toBe(false);
    expect(
      R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE.candidateC.populationValidated,
    ).toBe(false);
    expect(
      R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE.candidateC.structurallyValidated,
    ).toBe(true);
    expect(
      R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE.productionDefaultParameterSet,
    ).toBe(MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET);
  });

  it("resolves candidate selection deterministically", () => {
    const first = resolveMatchScriptParameterSet({
      calibrationLabel: "r1b.candidate.c.sideAwareOpen",
    });
    const second = resolveMatchScriptParameterSet({
      calibrationLabel: "r1b.candidate.c.sideAwareOpen",
    });
    expect(first).toBe(second);
    expect(first.calibrationLabel).toBe("r1b.candidate.c.sideAwareOpen");
    expect(
      resolveMatchScriptParameterSet({
        calibrationLabel: "unknown-label",
      }),
    ).toBe(GOVERNED_MATCH_SCRIPT_PARAMETER_SET);
  });

  it("blocks Control asymmetric bonus on weak rating gaps for candidate C", () => {
    const weak = cohort.find((row) => row.scenarioClass === "weak_home_edge");
    expect(weak).toBeDefined();
    if (weak === undefined) {
      return;
    }

    const homeControl = MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET.catalog.find(
      (entry) => entry.scriptId === "home_control",
    );
    const baselineHome = MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET.catalog.find(
      (entry) => entry.scriptId === "home_control",
    );
    expect(homeControl).toBeDefined();
    expect(baselineHome).toBeDefined();
    if (homeControl === undefined || baselineHome === undefined) {
      return;
    }

    const baselineScore = scoreMatchScriptFromFootballState({
      entry: baselineHome,
      footballState: weak.footballState,
    });
    const candidateScore = scoreMatchScriptFromFootballState({
      entry: homeControl,
      footballState: weak.footballState,
    });

    expect(baselineScore.score).toBeGreaterThan(candidateScore.score);
  });

  it("raises Open Match affinity on bilateral-attack class for candidate C", () => {
    const open = cohort.find((row) => row.scenarioClass === "open_bilateral_attack");
    expect(open).toBeDefined();
    if (open === undefined) {
      return;
    }

    const baseline = generateMatchScriptSet({
      footballState: open.footballState,
      parameters: MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
    });
    const candidate = generateMatchScriptSet({
      footballState: open.footballState,
      parameters: MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
    });
    const baselineOpen =
      baseline.scripts.find((script) => script.scriptId === "open_match")?.weight ??
      0;
    const candidateOpen =
      candidate.scripts.find((script) => script.scriptId === "open_match")?.weight ??
      0;

    expect(candidateOpen).toBeGreaterThan(baselineOpen);
  });

  it("compares A/B/C structurally without production-promoting Candidate C", () => {
    const metricsA = computeR1BScriptLayerMetrics(
      MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
      cohort,
    );
    const metricsB = computeR1BScriptLayerMetrics(
      MATCH_SCRIPT_R1B_CANDIDATE_B_PARAMETER_SET,
      cohort,
    );
    const metricsC = computeR1BScriptLayerMetrics(
      MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
      cohort,
    );

    expect(metricsA.sampleSize).toBe(cohort.length);
    expect(metricsC.weakEdgeControlMeanWeight).toBeLessThan(
      metricsA.weakEdgeControlMeanWeight,
    );
    expect(metricsC.openClassOpenMeanWeight).toBeGreaterThan(
      metricsA.openClassOpenMeanWeight,
    );
    expect(metricsC.favoriteClassUnderdogLambdaRatio).toBeGreaterThanOrEqual(
      metricsA.favoriteClassUnderdogLambdaRatio - 0.01,
    );

    const gateB = evaluateR1BPromotionGate({
      baseline: metricsA,
      candidate: metricsB,
    });
    const gateC = evaluateR1BPromotionGate({
      baseline: metricsA,
      candidate: metricsC,
    });
    const comparison = compareR1BCandidates({
      baseline: metricsA,
      candidate: metricsC,
    });

    expect(comparison.some((row) => row.baseline === "NOT AVAILABLE")).toBe(true);
    expect(gateC.structurallyEligible).toBe(true);
    expect(gateC.productionPromoted).toBe(false);
    expect(gateB.productionPromoted).toBe(false);
    expect(metricsC.openClassOpenMeanWeight).toBeGreaterThan(
      metricsB.openClassOpenMeanWeight,
    );
    expect(metricsC.weakEdgeControlMeanWeight).toBeLessThanOrEqual(
      metricsB.weakEdgeControlMeanWeight,
    );
    expect(GOVERNED_MATCH_SCRIPT_PARAMETER_SET.calibrationLabel).toBe(
      "r1b.candidate.a.baseline",
    );
  });

  it("keeps Balanced vs Open competition explainable and deterministic", () => {
    const open = cohort.find((row) => row.scenarioClass === "open_bilateral_attack");
    expect(open).toBeDefined();
    if (open === undefined) {
      return;
    }

    const first = generateMatchScriptSet({
      footballState: open.footballState,
      parameters: GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
    });
    const second = generateMatchScriptSet({
      footballState: open.footballState,
      parameters: GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
    });

    expect(first.checksum).toBe(second.checksum);
    expect(
      first.scripts.every((script) => script.activationReasons.length > 0),
    ).toBe(true);
  });

  it("preserves side-aware attack-vs-defense gate on Control scoring", () => {
    const strong = cohort.find(
      (row) => row.scenarioClass === "strong_home_favorite",
    );
    expect(strong).toBeDefined();
    if (strong === undefined) {
      return;
    }

    const homeControl = MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET.catalog.find(
      (entry) => entry.scriptId === "home_control",
    );
    expect(homeControl).toBeDefined();
    if (homeControl === undefined) {
      return;
    }

    const scored = scoreMatchScriptFromFootballState({
      entry: homeControl,
      footballState: strong.footballState,
    });
    expect(scored.footballStateRefs).toEqual(
      expect.arrayContaining(["projectionInputs", "defenseState"]),
    );
  });
});
