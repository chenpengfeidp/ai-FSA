import { createMatchId } from "@fas/match";
import { createFootballStateEnvelope } from "../football-state/football-state-envelope.js";
import type { FootballStateEnvelope } from "../football-state/football-state-envelope.js";
import type {
  FootballStateProjectionInputs,
  StateDimensionLevel,
  StateDimensionValue,
} from "../football-state/football-state-types.js";
import { FOOTBALL_STATE_DIMENSION_IDS } from "../football-state/football-state-dimensions.js";
import { generateMatchScriptSet } from "./match-script-generator.js";
import type { MatchScriptParameterSet } from "./match-script-parameter-set.js";
import { buildLambdasV2 } from "../lambda/lambda-builder-v2.js";
import { FEATURE_ENRICHED_LAMBDA_PARAMETER_SET } from "../lambda/feature-enriched-lambda-weights.js";
import { buildScriptProbabilityMatrix } from "../probability-matrix/build-script-probability-matrix.js";
import { mergeProbabilityMatrices } from "../probability-matrix/merge-probability-matrices.js";

export const R1B_CALIBRATION_COHORT_ID = "r1b.synthetic.script_shapes.v1" as const;

export type R1BScenarioClass =
  | "weak_home_edge"
  | "strong_home_favorite"
  | "open_bilateral_attack"
  | "parity_balanced"
  | "away_favorite"
  | "low_event_shape";

export interface R1BCalibrationScenario {
  readonly scenarioId: string;
  readonly scenarioClass: R1BScenarioClass;
  readonly footballState: FootballStateEnvelope;
}

export interface R1BScriptLayerMetrics {
  readonly sampleSize: number;
  readonly controlActivationRate: number;
  readonly openMatchActivationRate: number;
  readonly balancedMeanWeight: number;
  readonly controlMeanWeight: number;
  readonly openMatchMeanWeight: number;
  readonly meanConcentration: number;
  readonly weakEdgeControlActivationRate: number;
  readonly weakEdgeControlMeanWeight: number;
  readonly openClassOpenMeanWeight: number;
  readonly favoriteClassUnderdogLambdaRatio: number;
  readonly openClassRange4PlusMass: number;
}

export interface R1BCandidateComparisonRow {
  readonly metric: string;
  readonly baseline: number | "NOT AVAILABLE";
  readonly candidate: number | "NOT AVAILABLE";
  readonly delta: number | "NOT AVAILABLE";
  readonly targetDirection: "down" | "up" | "stable" | "n/a";
  readonly pass: boolean | "NOT AVAILABLE";
}

function dim(level: StateDimensionLevel, score: number): StateDimensionValue {
  return Object.freeze({
    level,
    score,
    basis: "feature" as const,
    sourceRefs: Object.freeze(["synthetic"]),
  });
}

function projectionInputs(input: {
  readonly homeAttack: number;
  readonly awayAttack: number;
  readonly homeDefense: number;
  readonly awayDefense: number;
}): FootballStateProjectionInputs {
  return Object.freeze({
    homeAttackRating: input.homeAttack,
    awayAttackRating: input.awayAttack,
    homeDefenseRating: input.homeDefense,
    awayDefenseRating: input.awayDefense,
    homeMomentum: 0.1,
    awayMomentum: 0.05,
    homeAdvantage: 0.12,
    groupContributions: Object.freeze([]),
    absentOptionalFeatures: Object.freeze([]),
    blocked: false,
    missingFoundationFeatures: Object.freeze([]),
  });
}

function makeState(input: {
  readonly id: string;
  readonly attack: StateDimensionLevel;
  readonly defense: StateDimensionLevel;
  readonly control: StateDimensionLevel;
  readonly transition: StateDimensionLevel;
  readonly tags?: readonly string[];
  readonly homeAttack: number;
  readonly awayAttack: number;
  readonly homeDefense: number;
  readonly awayDefense: number;
}): FootballStateEnvelope {
  const dimensions = Object.freeze(
    Object.fromEntries(
      FOOTBALL_STATE_DIMENSION_IDS.map((dimensionId) => {
        switch (dimensionId) {
          case "attackState":
            return [dimensionId, dim(input.attack, 0.7)];
          case "defenseState":
            return [dimensionId, dim(input.defense, 0.5)];
          case "controlState":
            return [dimensionId, dim(input.control, 0.6)];
          case "transitionState":
            return [dimensionId, dim(input.transition, 0.55)];
          case "pressureState":
            return [dimensionId, dim("low", 0.2)];
          case "riskState":
            return [dimensionId, dim("low", 0.2)];
          default: {
            const exhaustive: never = dimensionId;
            return exhaustive;
          }
        }
      }),
    ) as FootballStateEnvelope["dimensions"],
  );

  return createFootballStateEnvelope({
    matchId: createMatchId(input.id),
    dimensions,
    projectionInputs: projectionInputs({
      homeAttack: input.homeAttack,
      awayAttack: input.awayAttack,
      homeDefense: input.homeDefense,
      awayDefense: input.awayDefense,
    }),
    compositeTags: Object.freeze([...(input.tags ?? [])]),
    driverRuleNames: Object.freeze([]),
    driverFeatureNames: Object.freeze(["synthetic"]),
    limitations: Object.freeze([
      "R1B synthetic Football State for Match Script calibration only.",
    ]),
  });
}

/**
 * Synthetic Match Script shape cohort — not historical fixtures, not named
 * R1A showcase matches. Covers weak-edge / favorite / open / parity / away /
 * low-event classes for activation-rate comparison.
 */
export function buildR1BSyntheticCalibrationCohort(): readonly R1BCalibrationScenario[] {
  return Object.freeze([
    Object.freeze({
      scenarioId: "weak-home-edge-1",
      scenarioClass: "weak_home_edge",
      footballState: makeState({
        id: "r1b-weak-1",
        attack: "medium",
        defense: "medium",
        control: "medium",
        transition: "low",
        homeAttack: 54,
        awayAttack: 51,
        homeDefense: 52,
        awayDefense: 50,
      }),
    }),
    Object.freeze({
      scenarioId: "weak-home-edge-2",
      scenarioClass: "weak_home_edge",
      footballState: makeState({
        id: "r1b-weak-2",
        attack: "medium",
        defense: "medium",
        control: "medium",
        transition: "medium",
        homeAttack: 58,
        awayAttack: 55,
        homeDefense: 50,
        awayDefense: 53,
      }),
    }),
    Object.freeze({
      scenarioId: "strong-home-1",
      scenarioClass: "strong_home_favorite",
      footballState: makeState({
        id: "r1b-strong-home-1",
        attack: "high",
        defense: "medium",
        control: "high",
        transition: "medium",
        homeAttack: 72,
        awayAttack: 48,
        homeDefense: 60,
        awayDefense: 45,
      }),
    }),
    Object.freeze({
      scenarioId: "strong-home-2",
      scenarioClass: "strong_home_favorite",
      footballState: makeState({
        id: "r1b-strong-home-2",
        attack: "high",
        defense: "low",
        control: "medium",
        transition: "high",
        tags: ["TRANSITION_CHANNEL"],
        homeAttack: 68,
        awayAttack: 50,
        homeDefense: 55,
        awayDefense: 42,
      }),
    }),
    Object.freeze({
      scenarioId: "open-1",
      scenarioClass: "open_bilateral_attack",
      footballState: makeState({
        id: "r1b-open-1",
        attack: "high",
        defense: "low",
        control: "medium",
        transition: "high",
        tags: ["TRANSITION_CHANNEL"],
        homeAttack: 64,
        awayAttack: 62,
        homeDefense: 44,
        awayDefense: 46,
      }),
    }),
    Object.freeze({
      scenarioId: "open-2",
      scenarioClass: "open_bilateral_attack",
      footballState: makeState({
        id: "r1b-open-2",
        attack: "medium",
        defense: "medium",
        control: "medium",
        transition: "medium",
        homeAttack: 60,
        awayAttack: 58,
        homeDefense: 48,
        awayDefense: 49,
      }),
    }),
    Object.freeze({
      scenarioId: "parity-1",
      scenarioClass: "parity_balanced",
      footballState: makeState({
        id: "r1b-parity-1",
        attack: "medium",
        defense: "medium",
        control: "medium",
        transition: "low",
        homeAttack: 52,
        awayAttack: 52,
        homeDefense: 52,
        awayDefense: 52,
      }),
    }),
    Object.freeze({
      scenarioId: "parity-2",
      scenarioClass: "parity_balanced",
      footballState: makeState({
        id: "r1b-parity-2",
        attack: "low",
        defense: "medium",
        control: "low",
        transition: "low",
        homeAttack: 49,
        awayAttack: 50,
        homeDefense: 55,
        awayDefense: 54,
      }),
    }),
    Object.freeze({
      scenarioId: "away-fav-1",
      scenarioClass: "away_favorite",
      footballState: makeState({
        id: "r1b-away-1",
        attack: "high",
        defense: "medium",
        control: "high",
        transition: "medium",
        homeAttack: 46,
        awayAttack: 70,
        homeDefense: 44,
        awayDefense: 58,
      }),
    }),
    Object.freeze({
      scenarioId: "away-fav-2",
      scenarioClass: "away_favorite",
      footballState: makeState({
        id: "r1b-away-2",
        attack: "medium",
        defense: "medium",
        control: "medium",
        transition: "medium",
        homeAttack: 50,
        awayAttack: 66,
        homeDefense: 48,
        awayDefense: 55,
      }),
    }),
    Object.freeze({
      scenarioId: "low-event-1",
      scenarioClass: "low_event_shape",
      footballState: makeState({
        id: "r1b-low-1",
        attack: "low",
        defense: "high",
        control: "low",
        transition: "absent",
        tags: ["LOW_EVENT_SHAPE"],
        homeAttack: 42,
        awayAttack: 40,
        homeDefense: 68,
        awayDefense: 66,
      }),
    }),
    Object.freeze({
      scenarioId: "low-event-2",
      scenarioClass: "low_event_shape",
      footballState: makeState({
        id: "r1b-low-2",
        attack: "low",
        defense: "medium",
        control: "low",
        transition: "low",
        tags: ["LOW_EVENT_SHAPE"],
        homeAttack: 45,
        awayAttack: 44,
        homeDefense: 60,
        awayDefense: 58,
      }),
    }),
  ]);
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function computeR1BScriptLayerMetrics(
  parameters: MatchScriptParameterSet,
  cohort: readonly R1BCalibrationScenario[] = buildR1BSyntheticCalibrationCohort(),
): R1BScriptLayerMetrics {
  const controlActive: number[] = [];
  const openActive: number[] = [];
  const balancedWeights: number[] = [];
  const controlWeights: number[] = [];
  const openWeights: number[] = [];
  const concentrations: number[] = [];
  const weakEdgeControl: number[] = [];
  const weakEdgeControlWeights: number[] = [];
  const openClassOpenWeights: number[] = [];
  const underdogRatios: number[] = [];
  const openRange4: number[] = [];

  for (const scenario of cohort) {
    const scriptSet = generateMatchScriptSet({
      footballState: scenario.footballState,
      parameters,
    });
    const controlWeight = scriptSet.scripts
      .filter(
        (script) =>
          script.scriptId === "home_control" || script.scriptId === "away_control",
      )
      .reduce((sum, script) => sum + script.weight, 0);
    const openWeight =
      scriptSet.scripts.find((script) => script.scriptId === "open_match")?.weight ??
      0;
    const balancedWeight =
      scriptSet.scripts.find((script) => script.scriptId === "balanced")?.weight ??
      0;

    controlActive.push(controlWeight >= 0.1 ? 1 : 0);
    openActive.push(openWeight >= 0.1 ? 1 : 0);
    controlWeights.push(controlWeight);
    openWeights.push(openWeight);
    balancedWeights.push(balancedWeight);
    concentrations.push(scriptSet.concentration);

    if (scenario.scenarioClass === "weak_home_edge") {
      weakEdgeControl.push(controlWeight >= 0.1 ? 1 : 0);
      weakEdgeControlWeights.push(controlWeight);
    }

    if (scenario.scenarioClass === "open_bilateral_attack") {
      openClassOpenWeights.push(openWeight);
    }

    const lambdas = buildLambdasV2({
      footballState: scenario.footballState,
      parameters: FEATURE_ENRICHED_LAMBDA_PARAMETER_SET,
    });

    if (
      !lambdas.blocked &&
      (scenario.scenarioClass === "strong_home_favorite" ||
        scenario.scenarioClass === "away_favorite")
    ) {
      const merged = mergeProbabilityMatrices(
        scriptSet.scripts.map((script) =>
          Object.freeze({
            weight: script.weight,
            matrix: buildScriptProbabilityMatrix({
              baseLambdaHome: lambdas.lambdaHome,
              baseLambdaAway: lambdas.lambdaAway,
              modifiers: script.lambdaModifiers,
              parameters: FEATURE_ENRICHED_LAMBDA_PARAMETER_SET,
            }),
          }),
        ),
      );

      if (merged !== null) {
        const favoriteIsHome = scenario.scenarioClass === "strong_home_favorite";
        const underdogLambda = favoriteIsHome
          ? merged.lambdaAway
          : merged.lambdaHome;
        const favoriteLambda = favoriteIsHome
          ? merged.lambdaHome
          : merged.lambdaAway;
        underdogRatios.push(underdogLambda / Math.max(favoriteLambda, 1e-9));
      }
    }

    if (scenario.scenarioClass === "open_bilateral_attack" && !lambdas.blocked) {
      const merged = mergeProbabilityMatrices(
        scriptSet.scripts.map((script) =>
          Object.freeze({
            weight: script.weight,
            matrix: buildScriptProbabilityMatrix({
              baseLambdaHome: lambdas.lambdaHome,
              baseLambdaAway: lambdas.lambdaAway,
              modifiers: script.lambdaModifiers,
              parameters: FEATURE_ENRICHED_LAMBDA_PARAMETER_SET,
            }),
          }),
        ),
      );

      if (merged !== null) {
        openRange4.push(merged.goalRange.range4Plus);
      }
    }
  }

  return Object.freeze({
    sampleSize: cohort.length,
    controlActivationRate: round4(mean(controlActive)),
    openMatchActivationRate: round4(mean(openActive)),
    balancedMeanWeight: round4(mean(balancedWeights)),
    controlMeanWeight: round4(mean(controlWeights)),
    openMatchMeanWeight: round4(mean(openWeights)),
    meanConcentration: round4(mean(concentrations)),
    weakEdgeControlActivationRate: round4(mean(weakEdgeControl)),
    weakEdgeControlMeanWeight: round4(mean(weakEdgeControlWeights)),
    openClassOpenMeanWeight: round4(mean(openClassOpenWeights)),
    favoriteClassUnderdogLambdaRatio: round4(mean(underdogRatios)),
    openClassRange4PlusMass: round4(mean(openRange4)),
  });
}

function deltaPass(input: {
  readonly baseline: number;
  readonly candidate: number;
  readonly direction: "down" | "up" | "stable";
  readonly tolerance?: number;
}): boolean {
  const tolerance = input.tolerance ?? 0.01;
  const delta = input.candidate - input.baseline;

  if (input.direction === "down") {
    return delta <= tolerance;
  }

  if (input.direction === "up") {
    return delta >= -tolerance;
  }

  return Math.abs(delta) <= 0.05;
}

export function compareR1BCandidates(input: {
  readonly baseline: R1BScriptLayerMetrics;
  readonly candidate: R1BScriptLayerMetrics;
}): readonly R1BCandidateComparisonRow[] {
  const rows: R1BCandidateComparisonRow[] = [
    {
      metric: "Match Result accuracy",
      baseline: "NOT AVAILABLE",
      candidate: "NOT AVAILABLE",
      delta: "NOT AVAILABLE",
      targetDirection: "n/a",
      pass: "NOT AVAILABLE",
    },
    {
      metric: "Draw accuracy",
      baseline: "NOT AVAILABLE",
      candidate: "NOT AVAILABLE",
      delta: "NOT AVAILABLE",
      targetDirection: "n/a",
      pass: "NOT AVAILABLE",
    },
    {
      metric: "Exact Score accuracy",
      baseline: "NOT AVAILABLE",
      candidate: "NOT AVAILABLE",
      delta: "NOT AVAILABLE",
      targetDirection: "n/a",
      pass: "NOT AVAILABLE",
    },
    {
      metric: "Goal Range accuracy",
      baseline: "NOT AVAILABLE",
      candidate: "NOT AVAILABLE",
      delta: "NOT AVAILABLE",
      targetDirection: "n/a",
      pass: "NOT AVAILABLE",
    },
    {
      metric: "BTTS accuracy",
      baseline: "NOT AVAILABLE",
      candidate: "NOT AVAILABLE",
      delta: "NOT AVAILABLE",
      targetDirection: "n/a",
      pass: "NOT AVAILABLE",
    },
    {
      metric: "Over/Under accuracy",
      baseline: "NOT AVAILABLE",
      candidate: "NOT AVAILABLE",
      delta: "NOT AVAILABLE",
      targetDirection: "n/a",
      pass: "NOT AVAILABLE",
    },
    {
      metric: "Confidence calibration",
      baseline: "NOT AVAILABLE",
      candidate: "NOT AVAILABLE",
      delta: "NOT AVAILABLE",
      targetDirection: "n/a",
      pass: "NOT AVAILABLE",
    },
  ];

  const scriptMetrics: ReadonlyArray<{
    readonly key: keyof R1BScriptLayerMetrics;
    readonly label: string;
    readonly direction: "down" | "up" | "stable";
  }> = [
    {
      key: "controlActivationRate",
      label: "Control activation rate",
      direction: "down",
    },
    {
      key: "weakEdgeControlActivationRate",
      label: "Weak-edge Control activation",
      direction: "down",
    },
    {
      key: "weakEdgeControlMeanWeight",
      label: "Weak-edge Control mean weight",
      direction: "down",
    },
    {
      key: "openMatchActivationRate",
      label: "Open Match activation rate",
      direction: "up",
    },
    {
      key: "openClassOpenMeanWeight",
      label: "Open-class Open Match mean weight",
      direction: "up",
    },
    {
      key: "controlMeanWeight",
      label: "Control mean weight",
      direction: "down",
    },
    {
      key: "openMatchMeanWeight",
      label: "Open Match mean weight",
      direction: "up",
    },
    {
      key: "balancedMeanWeight",
      label: "Balanced mean weight",
      direction: "down",
    },
    {
      key: "meanConcentration",
      label: "Mean script concentration",
      direction: "down",
    },
    {
      key: "favoriteClassUnderdogLambdaRatio",
      label: "Favorite-class underdog λ ratio",
      direction: "up",
    },
    {
      key: "openClassRange4PlusMass",
      label: "Open-class range4Plus mass",
      direction: "up",
    },
  ];

  for (const metric of scriptMetrics) {
    const baselineValue = input.baseline[metric.key];
    const candidateValue = input.candidate[metric.key];

    if (typeof baselineValue !== "number" || typeof candidateValue !== "number") {
      continue;
    }

    rows.push(
      Object.freeze({
        metric: metric.label,
        baseline: baselineValue,
        candidate: candidateValue,
        delta: round4(candidateValue - baselineValue),
        targetDirection: metric.direction,
        pass: deltaPass({
          baseline: baselineValue,
          candidate: candidateValue,
          direction: metric.direction,
        }),
      }),
    );
  }

  return Object.freeze(rows);
}

/**
 * Synthetic SCRIPT-LAYER STRUCTURAL gate only.
 * Passing this gate does NOT authorize production promotion.
 * Population Validation (durable Evaluation History + P2H/P2I) is required
 * before any candidate may become GOVERNED_MATCH_SCRIPT_PARAMETER_SET.
 */
export function evaluateR1BPromotionGate(input: {
  readonly baseline: R1BScriptLayerMetrics;
  readonly candidate: R1BScriptLayerMetrics;
}): {
  readonly structurallyEligible: boolean;
  /** Always false — structural eligibility ≠ production promotion. */
  readonly productionPromoted: false;
  readonly reasons: readonly string[];
} {
  const comparison = compareR1BCandidates(input);
  const scriptRows = comparison.filter((row) => row.pass !== "NOT AVAILABLE");
  const failures = scriptRows.filter((row) => row.pass === false);
  const targetHits = scriptRows.filter(
    (row) =>
      row.pass === true &&
      (row.metric.includes("Control") ||
        row.metric.includes("Open") ||
        row.metric.includes("underdog")),
  );
  const reasons: string[] = [];

  if (
    !(
      input.candidate.weakEdgeControlMeanWeight <
      input.baseline.weakEdgeControlMeanWeight - 0.01
    )
  ) {
    reasons.push("Weak-edge Control mean weight did not improve.");
  }

  if (
    !(
      input.candidate.openClassOpenMeanWeight >
      input.baseline.openClassOpenMeanWeight + 0.01
    )
  ) {
    reasons.push("Open-class Open Match weight did not improve.");
  }

  if (
    input.candidate.favoriteClassUnderdogLambdaRatio <
    input.baseline.favoriteClassUnderdogLambdaRatio - 0.01
  ) {
    reasons.push("Underdog λ ratio regressed materially.");
  }

  if (failures.length > 3) {
    reasons.push(`Too many script-layer regressions (${failures.length}).`);
  }

  if (targetHits.length < 3) {
    reasons.push("Fewer than three target Match Script metrics improved.");
  }

  const structurallyEligible = reasons.length === 0;

  if (structurallyEligible) {
    reasons.push(
      "SCRIPT-LAYER STRUCTURAL METRICS improved on synthetic cohort (not Prediction Performance).",
    );
    reasons.push(
      "NOT population validated — durable Evaluation History unavailable; productionPromoted remains false.",
    );
  }

  return Object.freeze({
    structurallyEligible,
    productionPromoted: false,
    reasons: Object.freeze(reasons),
  });
}
