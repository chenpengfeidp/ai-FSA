import { createMatchId, type MatchId } from "@fas/match";
import { stableChecksum } from "../../projection/stable-checksum.js";

export const FOOTBALL_STATE_POLICY_VERSION = "footballState.v1.identity";

export type StateDimensionLevel = "absent" | "low" | "medium" | "high";

export interface StateDimensionValue {
  readonly level: StateDimensionLevel;
  readonly score: number;
  readonly basis: "identity";
  readonly sourceRefs: readonly string[];
}

export interface FootballStateEnvelope {
  readonly policyVersion: typeof FOOTBALL_STATE_POLICY_VERSION;
  readonly matchId: MatchId;
  readonly dimensions: Readonly<Record<string, StateDimensionValue>>;
  readonly compositeTags: readonly string[];
  readonly driverRuleNames: readonly string[];
  readonly driverFeatureNames: readonly string[];
  readonly limitations: readonly string[];
  readonly checksum: string;
}

export interface CreateFootballStateEnvelopeInput {
  readonly matchId: MatchId;
  readonly dimensions: Readonly<Record<string, StateDimensionValue>>;
  readonly compositeTags: readonly string[];
  readonly driverRuleNames: readonly string[];
  readonly driverFeatureNames: readonly string[];
  readonly limitations: readonly string[];
}

export function createFootballStateEnvelope(
  input: CreateFootballStateEnvelopeInput,
): FootballStateEnvelope {
  const matchId = createMatchId(input.matchId);
  const dimensions = Object.freeze({ ...input.dimensions });
  const checksum = stableChecksum(
    JSON.stringify({
      policyVersion: FOOTBALL_STATE_POLICY_VERSION,
      matchId,
      dimensions,
      compositeTags: input.compositeTags,
      driverRuleNames: input.driverRuleNames,
      driverFeatureNames: input.driverFeatureNames,
      limitations: input.limitations,
    }),
  );

  return Object.freeze({
    policyVersion: FOOTBALL_STATE_POLICY_VERSION,
    matchId,
    dimensions,
    compositeTags: Object.freeze([...input.compositeTags]),
    driverRuleNames: Object.freeze([...input.driverRuleNames]),
    driverFeatureNames: Object.freeze([...input.driverFeatureNames]),
    limitations: Object.freeze([...input.limitations]),
    checksum,
  });
}
