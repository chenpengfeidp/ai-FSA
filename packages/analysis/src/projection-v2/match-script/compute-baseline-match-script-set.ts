import type { FootballStateEnvelope } from "../football-state/football-state-envelope.js";
import {
  BASELINE_MATCH_SCRIPT_ID,
  createMatchScriptSet,
  type MatchScriptSet,
} from "./match-script-set.js";

export function computeBaselineMatchScriptSet(input: {
  readonly footballState: FootballStateEnvelope;
}): MatchScriptSet {
  return createMatchScriptSet({
    matchId: input.footballState.matchId,
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
        activationReasons: Object.freeze([
          "Pinned baseline script for Projection V2 foundation; delegates probability to V1 logic.",
        ]),
        footballStateRefs: Object.freeze(["identity"]),
        activatingRules: Object.freeze([]),
        strengtheningFeatures: Object.freeze([]),
        lambdaModifiers: Object.freeze({
          homeMultiplier: 1,
          awayMultiplier: 1,
          drawBias: 0,
        }),
        limitations: Object.freeze([
          "Identity script modifiers only; no Football State weighting applied.",
        ]),
      }),
    ]),
  });
}
