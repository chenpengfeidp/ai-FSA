import {
  MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
  MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
} from "./match-script-calibration-candidates.js";
import { GOVERNED_MATCH_SCRIPT_PARAMETER_SET } from "./match-script-governed-parameters.js";
import type { MatchScriptParameterSet } from "./match-script-parameter-set.js";
import { R1B_CALIBRATION_COHORT_ID } from "./match-script-calibration-cohort.js";

/**
 * R1B calibration governance statuses.
 *
 * Structural Validation ≠ Population Validation.
 * Only population validation (durable Evaluation History + P2H/P2I) may promote
 * a candidate to production default.
 */
export type R1BCalibrationGovernanceStatus =
  | "production_default"
  | "structurally_validated_candidate"
  | "rejected";

export interface R1BMatchScriptCalibrationGovernance {
  readonly modelVersion: "matchScriptCalibrationGovernance.v1.r1b";
  readonly productionDefaultCalibrationLabel: string;
  readonly productionDefaultParameterSet: MatchScriptParameterSet;
  readonly candidateC: {
    readonly calibrationLabel: "r1b.candidate.c.sideAwareOpen";
    readonly parameterSet: MatchScriptParameterSet;
    readonly status: "structurally_validated_candidate";
    readonly structurallyValidated: true;
    readonly syntheticCohortValidated: true;
    readonly syntheticCohortId: typeof R1B_CALIBRATION_COHORT_ID;
    readonly populationValidated: false;
    readonly productionPromoted: false;
    readonly eligibleForFutureReplayComparison: true;
    readonly promotionPrerequisite: "durable_evaluation_history_plus_p2h_p2i";
    readonly limitations: readonly string[];
  };
  readonly limitations: readonly string[];
}

/**
 * Immutable governance record for R1B Match Script calibration.
 * Not a generic configuration framework — Match Script parameter sets remain
 * the source of truth; this record only documents promotion eligibility.
 */
export const R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE: R1BMatchScriptCalibrationGovernance =
  Object.freeze({
    modelVersion: "matchScriptCalibrationGovernance.v1.r1b",
    productionDefaultCalibrationLabel:
      MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET.calibrationLabel ??
      "r1b.candidate.a.baseline",
    productionDefaultParameterSet: GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
    candidateC: Object.freeze({
      calibrationLabel: "r1b.candidate.c.sideAwareOpen" as const,
      parameterSet: MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
      status: "structurally_validated_candidate" as const,
      structurallyValidated: true as const,
      syntheticCohortValidated: true as const,
      syntheticCohortId: R1B_CALIBRATION_COHORT_ID,
      populationValidated: false as const,
      productionPromoted: false as const,
      eligibleForFutureReplayComparison: true as const,
      promotionPrerequisite: "durable_evaluation_history_plus_p2h_p2i" as const,
      limitations: Object.freeze([
        "Passed synthetic script-shape structural gate only (r1b.synthetic.script_shapes.v1).",
        "NOT population validated — durable Evaluation History was unavailable.",
        "NOT the production default — GOVERNED_MATCH_SCRIPT_PARAMETER_SET remains Baseline A.",
        "Eligible for future A/B replay once durable History + P2H/P2I cohort exists.",
        "Must not become production default without explicit population promotion.",
      ]),
    }),
    limitations: Object.freeze([
      "Structural Validation measures script activation / weight / underdog-λ ratio on synthetic shapes.",
      "Structural Validation is NOT Prediction Performance (Winner / Score / BTTS / O-U / confidence).",
      "Population Validation requires durable Evaluation History and is a separate promotion gate.",
    ]),
  });

export function getProductionMatchScriptParameterSet(): MatchScriptParameterSet {
  return GOVERNED_MATCH_SCRIPT_PARAMETER_SET;
}

export function getR1BCandidateCMatchScriptParameterSet(): MatchScriptParameterSet {
  return MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET;
}

/**
 * Resolves Match Script parameters for analysis. Production path always returns
 * Baseline A unless an explicit non-default candidate pin is requested.
 */
export function resolveMatchScriptParameterSet(input?: {
  readonly calibrationLabel?: string;
}): MatchScriptParameterSet {
  const label = input?.calibrationLabel?.trim();

  if (label === undefined || label.length === 0) {
    return GOVERNED_MATCH_SCRIPT_PARAMETER_SET;
  }

  if (
    label === MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET.calibrationLabel ||
    label === "r1b.candidate.a.baseline"
  ) {
    return MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET;
  }

  if (
    label === MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET.calibrationLabel ||
    label === "r1b.candidate.c.sideAwareOpen"
  ) {
    return MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET;
  }

  return GOVERNED_MATCH_SCRIPT_PARAMETER_SET;
}

/**
 * Offline-only Match Script calibration labels accepted by P2K-D replay.
 * Explicit selection only — never inferred from arbitrary strings.
 */
export const OFFLINE_MATCH_SCRIPT_CALIBRATION_LABELS = Object.freeze([
  "r1b.candidate.a.baseline",
  "r1b.candidate.c.sideAwareOpen",
] as const);

export type OfflineMatchScriptCalibrationLabel =
  (typeof OFFLINE_MATCH_SCRIPT_CALIBRATION_LABELS)[number];

export type OfflineMatchScriptParameterResolveErrorCode =
  | "INVALID_PARAMETER_LABEL"
  | "PRODUCTION_IMPLICIT_OVERRIDE";

export type OfflineMatchScriptParameterResolveResult =
  | {
      readonly ok: true;
      readonly value: MatchScriptParameterSet;
      readonly label: OfflineMatchScriptCalibrationLabel;
      readonly isProductionDefault: boolean;
      readonly productionPromoted: false;
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: OfflineMatchScriptParameterResolveErrorCode;
        readonly message: string;
      };
    };

/**
 * Strict offline resolver for P2K-D A/B replay.
 *
 * Unlike {@link resolveMatchScriptParameterSet}, this fails closed on empty
 * or unknown labels and never silently falls back to Baseline A.
 * Candidate C remains NON-DEFAULT and is never implied as production.
 */
export function resolveOfflineMatchScriptParameterSet(input: {
  readonly calibrationLabel: string | undefined;
}): OfflineMatchScriptParameterResolveResult {
  const label = input.calibrationLabel?.trim();

  if (label === undefined || label.length === 0) {
    return Object.freeze({
      ok: false,
      error: Object.freeze({
        code: "PRODUCTION_IMPLICIT_OVERRIDE" as const,
        message:
          "Offline Match Script replay requires an explicit calibrationLabel; production Baseline A must not be inferred.",
      }),
    });
  }

  if (
    label === MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET.calibrationLabel ||
    label === "r1b.candidate.a.baseline"
  ) {
    return Object.freeze({
      ok: true,
      value: MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
      label: "r1b.candidate.a.baseline" as const,
      isProductionDefault: true,
      productionPromoted: false as const,
    });
  }

  if (
    label === MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET.calibrationLabel ||
    label === "r1b.candidate.c.sideAwareOpen"
  ) {
    return Object.freeze({
      ok: true,
      value: MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
      label: "r1b.candidate.c.sideAwareOpen" as const,
      isProductionDefault: false,
      productionPromoted: false as const,
    });
  }

  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code: "INVALID_PARAMETER_LABEL" as const,
      message: `Unsupported offline Match Script calibrationLabel: ${label}`,
    }),
  });
}
