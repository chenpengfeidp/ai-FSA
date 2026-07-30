import type { FeatureBundle } from "@fas/feature";
import type { RuleResult } from "@fas/rule";
import {
  createFootballStateEnvelope,
  EMPTY_PROJECTION_INPUTS,
  FOOTBALL_STATE_POLICY_VERSION_IDENTITY,
  type FootballStateEnvelope,
} from "./football-state-envelope.js";
import type { StateDimensionValue } from "./football-state-types.js";

const IDENTITY_DIMENSION: StateDimensionValue = Object.freeze({
  level: "absent",
  score: 0,
  basis: "identity",
  sourceRefs: Object.freeze([]),
});

export function computeIdentityFootballState(input: {
  readonly featureBundle: FeatureBundle;
  readonly ruleResults: readonly RuleResult[];
}): FootballStateEnvelope {
  void input.ruleResults;

  return createFootballStateEnvelope({
    matchId: input.featureBundle.matchId,
    policyVersion: FOOTBALL_STATE_POLICY_VERSION_IDENTITY,
    dimensions: Object.freeze({
      attackState: IDENTITY_DIMENSION,
      defenseState: IDENTITY_DIMENSION,
      controlState: IDENTITY_DIMENSION,
      transitionState: IDENTITY_DIMENSION,
      pressureState: IDENTITY_DIMENSION,
      riskState: IDENTITY_DIMENSION,
    }),
    projectionInputs: EMPTY_PROJECTION_INPUTS,
    compositeTags: Object.freeze([]),
    driverRuleNames: Object.freeze([]),
    driverFeatureNames: Object.freeze([]),
    limitations: Object.freeze([
      "Identity Football State stub retained for legacy tests only.",
    ]),
  });
}
