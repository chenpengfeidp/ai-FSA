import type { MatchScriptParameterSet } from "./match-script-parameter-set.js";
import { MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET } from "./match-script-calibration-candidates.js";

/**
 * Production default Match Script tables.
 *
 * R1B governance correction: Candidate C passed the synthetic structural gate
 * but is NOT population-validated (durable Evaluation History unavailable).
 * Therefore production default remains Baseline A.
 *
 * Candidate C remains available as `MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET`
 * / `R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE` — NON-DEFAULT.
 */
export const GOVERNED_MATCH_SCRIPT_PARAMETER_SET =
  MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET satisfies MatchScriptParameterSet;

export type GovernedMatchScriptParameterSet =
  typeof GOVERNED_MATCH_SCRIPT_PARAMETER_SET;
