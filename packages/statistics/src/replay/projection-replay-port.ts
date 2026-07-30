import type { EvaluationHistoryRecord } from "../domain/evaluation-history.js";
import type { SealedPredictionInput } from "../domain/prediction-evaluation.js";
import type { SealedProjectionReplayContext } from "./projection-replay-context.js";

export type ProjectionReplayVersion = "v1" | "v2";

export interface ProjectionReplayPortInput {
  readonly record: EvaluationHistoryRecord;
  readonly replayContext?: SealedProjectionReplayContext;
}

export interface ProjectionReplayPortResult {
  readonly version: ProjectionReplayVersion;
  readonly prediction: SealedPredictionInput;
}

export interface ProjectionReplayPortSkip {
  readonly version: ProjectionReplayVersion;
  readonly reason: string;
}

export type ProjectionReplayPortOutcome =
  | ProjectionReplayPortResult
  | ProjectionReplayPortSkip;

export interface ProjectionReplayPort {
  replayV1(input: ProjectionReplayPortInput): ProjectionReplayPortOutcome;
  replayV2(input: ProjectionReplayPortInput): ProjectionReplayPortOutcome;
}

export function isProjectionReplayResult(
  outcome: ProjectionReplayPortOutcome,
): outcome is ProjectionReplayPortResult {
  return "prediction" in outcome;
}
