import type { FootballStateEnvelope } from "./football-state-envelope.js";
import {
  FOOTBALL_STATE_DIMENSION_LABELS,
  FOOTBALL_STATE_DIMENSION_IDS,
  type FootballStateDimensionId,
} from "./football-state-dimensions.js";
import type {
  StateDimensionBasis,
  StateDimensionLevel,
} from "./football-state-types.js";

export interface FootballStateDimensionReport {
  readonly id: FootballStateDimensionId;
  readonly label: string;
  readonly level: StateDimensionLevel;
  readonly score: number;
  readonly basis: StateDimensionBasis;
  readonly sourceRefs: readonly string[];
}

export interface FootballStateReportMetadata {
  readonly policyVersion: FootballStateEnvelope["policyVersion"];
  readonly checksum: string;
  readonly dimensions: readonly FootballStateDimensionReport[];
  readonly compositeTags: readonly string[];
  readonly driverFeatureNames: readonly string[];
  readonly limitations: readonly string[];
}

export function createFootballStateReportMetadata(
  envelope: FootballStateEnvelope,
): FootballStateReportMetadata {
  const dimensions = FOOTBALL_STATE_DIMENSION_IDS.map((id) =>
    Object.freeze({
      id,
      label: FOOTBALL_STATE_DIMENSION_LABELS[id],
      level: envelope.dimensions[id].level,
      score: envelope.dimensions[id].score,
      basis: envelope.dimensions[id].basis,
      sourceRefs: envelope.dimensions[id].sourceRefs,
    }),
  );

  return Object.freeze({
    policyVersion: envelope.policyVersion,
    checksum: envelope.checksum,
    dimensions: Object.freeze([...dimensions]),
    compositeTags: envelope.compositeTags,
    driverFeatureNames: envelope.driverFeatureNames,
    limitations: envelope.limitations,
  });
}
