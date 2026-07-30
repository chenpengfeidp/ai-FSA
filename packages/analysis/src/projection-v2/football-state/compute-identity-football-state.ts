import type { FeatureBundle } from "@fas/feature";
import type { RuleResult } from "@fas/rule";
import {
  createFootballStateEnvelope,
  type FootballStateEnvelope,
  type StateDimensionValue,
} from "./football-state-envelope.js";

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
  return createFootballStateEnvelope({
    matchId: input.featureBundle.matchId,
    dimensions: Object.freeze({
      identity: IDENTITY_DIMENSION,
    }),
    compositeTags: Object.freeze([]),
    driverRuleNames: Object.freeze([]),
    driverFeatureNames: Object.freeze([]),
    limitations: Object.freeze([
      "Identity Football State: no situational dimensions activated in Projection V2 foundation.",
      "Probability outputs delegate to Projection V1 deterministic logic.",
    ]),
  });
}
