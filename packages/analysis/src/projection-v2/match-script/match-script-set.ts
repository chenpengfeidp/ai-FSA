import { createMatchId, type MatchId } from "@fas/match";
import { stableChecksum } from "../../projection/stable-checksum.js";
import type { MatchScriptId } from "./match-script-ids.js";
import type { MatchScriptLambdaModifiers } from "./match-script-parameter-set.js";

export const MATCH_SCRIPT_POLICY_VERSION = "matchScript.v1";

/** @deprecated P2D baseline id — retained for historical tests only. */
export const BASELINE_MATCH_SCRIPT_ID = "baseline_v1_compat" as const;

export interface MatchScript {
  readonly scriptId: MatchScriptId | typeof BASELINE_MATCH_SCRIPT_ID;
  readonly label: string;
  readonly weight: number;
  readonly activationReason: string;
  readonly activatingRules: readonly string[];
  readonly strengtheningFeatures: readonly string[];
  readonly lambdaModifiers: MatchScriptLambdaModifiers;
  readonly limitations: readonly string[];
}

export interface MatchScriptSet {
  readonly policyVersion: typeof MATCH_SCRIPT_POLICY_VERSION;
  readonly matchId: MatchId;
  readonly scripts: readonly MatchScript[];
  readonly concentration: number;
  readonly singleScriptFallback: boolean;
  readonly footballStateChecksum: string;
  readonly limitations: readonly string[];
  readonly checksum: string;
}

export interface CreateMatchScriptSetInput {
  readonly matchId: MatchId;
  readonly scripts: readonly MatchScript[];
  readonly footballStateChecksum: string;
  readonly limitations: readonly string[];
  readonly singleScriptFallback?: boolean;
}

function normalizeWeights(scripts: readonly MatchScript[]): readonly MatchScript[] {
  const total = scripts.reduce((sum, script) => sum + script.weight, 0);

  if (total <= 0) {
    return scripts;
  }

  return Object.freeze(
    scripts.map((script) =>
      Object.freeze({
        ...script,
        weight: script.weight / total,
      }),
    ),
  );
}

export function createMatchScriptSet(
  input: CreateMatchScriptSetInput,
): MatchScriptSet {
  const matchId = createMatchId(input.matchId);
  const scripts = normalizeWeights(input.scripts);
  const concentration = scripts.reduce(
    (max, script) => Math.max(max, script.weight),
    0,
  );
  const checksum = stableChecksum(
    JSON.stringify({
      policyVersion: MATCH_SCRIPT_POLICY_VERSION,
      matchId,
      scripts,
      footballStateChecksum: input.footballStateChecksum,
      limitations: input.limitations,
      singleScriptFallback: input.singleScriptFallback ?? false,
    }),
  );

  return Object.freeze({
    policyVersion: MATCH_SCRIPT_POLICY_VERSION,
    matchId,
    scripts,
    concentration,
    singleScriptFallback: input.singleScriptFallback ?? false,
    footballStateChecksum: input.footballStateChecksum,
    limitations: Object.freeze([...input.limitations]),
    checksum,
  });
}
