export type ProjectionReplayFootballStateLevel =
  | "absent"
  | "high"
  | "low"
  | "medium";

export interface ProjectionReplayFootballStateSnapshot {
  readonly dimensionId: string;
  readonly dimensionLabel: string;
  readonly level: ProjectionReplayFootballStateLevel;
}

export interface ProjectionReplayMatchScriptSnapshot {
  readonly scriptId: string;
  readonly label: string;
  readonly weight: number;
}

export interface ProjectionReplayMetadata {
  readonly projectionConfidence: number;
  readonly footballStateDimensions: readonly ProjectionReplayFootballStateSnapshot[];
  readonly activeMatchScripts: readonly ProjectionReplayMatchScriptSnapshot[];
}
