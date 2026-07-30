import type { EvaluationHistoryRecord } from "../domain/evaluation-history.js";
import type { SealedPredictionInput } from "../domain/prediction-evaluation.js";
import {
  isProjectionReplayResult,
  type ProjectionReplayPort,
  type ProjectionReplayPortInput,
} from "./projection-replay-port.js";
import type { ProjectionReplaySidecar } from "./projection-replay-context.js";
import {
  computeProjectionReplayMetrics,
  type ProjectionReplayMetrics,
} from "./projection-replay-metrics.js";

export interface ProjectionReplayRecordOutcome {
  readonly historyId: string;
  readonly matchId: string;
  readonly v1Prediction: SealedPredictionInput;
  readonly v2Prediction: SealedPredictionInput | null;
  readonly v2ReplayStatus: "completed" | "skipped";
  readonly v2SkipReason?: string;
  readonly v1Metrics: ProjectionReplayMetrics;
  readonly v2Metrics: ProjectionReplayMetrics | null;
}

export interface ReplayRunnerInput {
  readonly records: readonly EvaluationHistoryRecord[];
  readonly replayPort: ProjectionReplayPort;
  readonly replaySidecar?: ProjectionReplaySidecar;
  readonly evaluatedAt: string;
}

export interface ReplayRunnerResult {
  readonly outcomes: readonly ProjectionReplayRecordOutcome[];
  readonly replayedAt: string;
}

function resolveReplayContext(
  record: EvaluationHistoryRecord,
  sidecar: ProjectionReplaySidecar | undefined,
): ProjectionReplayPortInput["replayContext"] {
  return sidecar?.[record.historyId] ?? sidecar?.[record.matchId];
}

export class ReplayRunner {
  run(input: ReplayRunnerInput): ReplayRunnerResult {
    const outcomes: ProjectionReplayRecordOutcome[] = [];

    for (const record of input.records) {
      const replayContext = resolveReplayContext(record, input.replaySidecar);
      const portInput: ProjectionReplayPortInput =
        replayContext === undefined ? { record } : { record, replayContext };
      const v1Outcome = input.replayPort.replayV1(portInput);

      if (!isProjectionReplayResult(v1Outcome)) {
        continue;
      }

      const v1Metrics = computeProjectionReplayMetrics({
        prediction: v1Outcome.prediction,
        actual: record.actualResult,
        evaluatedAt: input.evaluatedAt,
      });
      const v2Outcome = input.replayPort.replayV2(portInput);

      if (!isProjectionReplayResult(v2Outcome)) {
        outcomes.push(
          Object.freeze({
            historyId: record.historyId,
            matchId: record.matchId,
            v1Prediction: v1Outcome.prediction,
            v2Prediction: null,
            v2ReplayStatus: "skipped",
            v2SkipReason: v2Outcome.reason,
            v1Metrics,
            v2Metrics: null,
          }),
        );
        continue;
      }

      const v2Metrics = computeProjectionReplayMetrics({
        prediction: v2Outcome.prediction,
        actual: record.actualResult,
        evaluatedAt: input.evaluatedAt,
      });

      outcomes.push(
        Object.freeze({
          historyId: record.historyId,
          matchId: record.matchId,
          v1Prediction: v1Outcome.prediction,
          v2Prediction: v2Outcome.prediction,
          v2ReplayStatus: "completed",
          v1Metrics,
          v2Metrics,
        }),
      );
    }

    return Object.freeze({
      outcomes: Object.freeze(outcomes),
      replayedAt: input.evaluatedAt,
    });
  }
}
