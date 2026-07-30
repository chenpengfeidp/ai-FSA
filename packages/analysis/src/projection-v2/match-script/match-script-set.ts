import { createMatchId, type MatchId } from "@fas/match";
import { stableChecksum } from "../../projection/stable-checksum.js";

export const MATCH_SCRIPT_POLICY_VERSION = "matchScript.v1.baseline";

export const BASELINE_MATCH_SCRIPT_ID = "baseline_v1_compat";

export interface MatchScript {
  readonly scriptId: typeof BASELINE_MATCH_SCRIPT_ID;
  readonly label: string;
  readonly weight: number;
  readonly activationReason: string;
  readonly activatingRules: readonly string[];
  readonly strengtheningFeatures: readonly string[];
  readonly limitations: readonly string[];
}

export interface MatchScriptSet {
  readonly policyVersion: typeof MATCH_SCRIPT_POLICY_VERSION;
  readonly matchId: MatchId;
  readonly scripts: readonly [MatchScript];
  readonly concentration: number;
  readonly singleScriptFallback: true;
  readonly footballStateChecksum: string;
  readonly limitations: readonly string[];
  readonly checksum: string;
}

export interface CreateMatchScriptSetInput {
  readonly matchId: MatchId;
  readonly script: MatchScript;
  readonly footballStateChecksum: string;
  readonly limitations: readonly string[];
}

export function createMatchScriptSet(
  input: CreateMatchScriptSetInput,
): MatchScriptSet {
  const matchId = createMatchId(input.matchId);
  const scripts = Object.freeze([input.script] as const);
  const checksum = stableChecksum(
    JSON.stringify({
      policyVersion: MATCH_SCRIPT_POLICY_VERSION,
      matchId,
      scripts,
      footballStateChecksum: input.footballStateChecksum,
      limitations: input.limitations,
    }),
  );

  return Object.freeze({
    policyVersion: MATCH_SCRIPT_POLICY_VERSION,
    matchId,
    scripts,
    concentration: input.script.weight,
    singleScriptFallback: true as const,
    footballStateChecksum: input.footballStateChecksum,
    limitations: Object.freeze([...input.limitations]),
    checksum,
  });
}
