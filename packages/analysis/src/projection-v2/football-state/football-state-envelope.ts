import { createMatchId, type MatchId } from "@fas/match";
import { stableChecksum } from "../../projection/stable-checksum.js";
import type { FootballStateDimensionId } from "./football-state-dimensions.js";
import type {
  FootballStateProjectionInputs,
  StateDimensionValue,
} from "./football-state-types.js";

export const FOOTBALL_STATE_POLICY_VERSION = "footballState.v1";
export const FOOTBALL_STATE_POLICY_VERSION_IDENTITY = "footballState.v1.identity";

export type {
  FootballStateProjectionInputs,
  StateDimensionBasis,
  StateDimensionLevel,
  StateDimensionValue,
} from "./football-state-types.js";
export { EMPTY_PROJECTION_INPUTS } from "./football-state-types.js";

export interface FootballStateEnvelope {
  readonly policyVersion:
    | typeof FOOTBALL_STATE_POLICY_VERSION
    | typeof FOOTBALL_STATE_POLICY_VERSION_IDENTITY;
  readonly matchId: MatchId;
  readonly dimensions: Readonly<
    Record<FootballStateDimensionId, StateDimensionValue>
  >;
  readonly projectionInputs: FootballStateProjectionInputs;
  readonly compositeTags: readonly string[];
  readonly driverRuleNames: readonly string[];
  readonly driverFeatureNames: readonly string[];
  readonly limitations: readonly string[];
  readonly checksum: string;
}

export interface CreateFootballStateEnvelopeInput {
  readonly matchId: MatchId;
  readonly dimensions: Readonly<
    Record<FootballStateDimensionId, StateDimensionValue>
  >;
  readonly projectionInputs: FootballStateProjectionInputs;
  readonly compositeTags: readonly string[];
  readonly driverRuleNames: readonly string[];
  readonly driverFeatureNames: readonly string[];
  readonly limitations: readonly string[];
  readonly policyVersion?:
    | typeof FOOTBALL_STATE_POLICY_VERSION
    | typeof FOOTBALL_STATE_POLICY_VERSION_IDENTITY;
}

export function createFootballStateEnvelope(
  input: CreateFootballStateEnvelopeInput,
): FootballStateEnvelope {
  const matchId = createMatchId(input.matchId);
  const policyVersion = input.policyVersion ?? FOOTBALL_STATE_POLICY_VERSION;
  const dimensions = Object.freeze({ ...input.dimensions });
  const checksum = stableChecksum(
    JSON.stringify({
      policyVersion,
      matchId,
      dimensions,
      projectionInputs: input.projectionInputs,
      compositeTags: input.compositeTags,
      driverRuleNames: input.driverRuleNames,
      driverFeatureNames: input.driverFeatureNames,
      limitations: input.limitations,
    }),
  );

  return Object.freeze({
    policyVersion,
    matchId,
    dimensions,
    projectionInputs: input.projectionInputs,
    compositeTags: Object.freeze([...input.compositeTags]),
    driverRuleNames: Object.freeze([...input.driverRuleNames]),
    driverFeatureNames: Object.freeze([...input.driverFeatureNames]),
    limitations: Object.freeze([...input.limitations]),
    checksum,
  });
}
