import type { FeatureBundle } from "@fas/feature";
import type { RuleResult } from "@fas/rule";
import type { FootballStateEnvelope } from "../football-state/football-state-envelope.js";
import {
  BASELINE_MATCH_SCRIPT_ID,
  createMatchScriptSet,
  type MatchScriptSet,
} from "./match-script-set.js";

export function computeBaselineMatchScriptSet(input: {
  readonly featureBundle: FeatureBundle;
  readonly ruleResults: readonly RuleResult[];
  readonly footballState: FootballStateEnvelope;
}): MatchScriptSet {
  return createMatchScriptSet({
    matchId: input.featureBundle.matchId,
    footballStateChecksum: input.footballState.checksum,
    singleScriptFallback: true,
    limitations: Object.freeze([
      "Baseline Match Script set: single baseline_v1_compat script with weight 1.",
      "No multi-script mixture in Projection V2 foundation.",
    ]),
    scripts: Object.freeze([
      Object.freeze({
        scriptId: BASELINE_MATCH_SCRIPT_ID,
        label: "Baseline V1 compatible",
        weight: 1,
        activationReason:
          "Pinned baseline script for Projection V2 foundation; delegates probability to V1 logic.",
        activatingRules: Object.freeze([]),
        strengtheningFeatures: Object.freeze([]),
        lambdaModifiers: Object.freeze({
          homeMultiplier: 1,
          awayMultiplier: 1,
          drawBias: 0,
        }),
        limitations: Object.freeze([
          "Identity script modifiers only; no Feature or Rule weighting applied.",
        ]),
      }),
    ]),
  });
}
