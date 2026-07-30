import type { EvaluationHistoryRecord } from "../domain/evaluation-history.js";
import type { EvaluationHistoryRepository } from "../repository/evaluation-history-repository.js";
import { computeProjectionReplayComparisonReport } from "./compute-projection-replay-comparison-report.js";
import type { ProjectionReplaySidecar } from "./projection-replay-context.js";
import type { ProjectionReplayPort } from "./projection-replay-port.js";
import { ReplayRunner } from "./replay-runner.js";

export interface RunProjectionReplayValidationInput {
  readonly repository: EvaluationHistoryRepository;
  readonly replayPort: ProjectionReplayPort;
  readonly replaySidecar?: ProjectionReplaySidecar;
  readonly computedAt: string;
  readonly query?: Parameters<EvaluationHistoryRepository["query"]>[0];
}

export async function runProjectionReplayValidation(
  input: RunProjectionReplayValidationInput,
) {
  const records = await input.repository.query(input.query ?? {});
  const runner = new ReplayRunner();
  const replayResult = runner.run({
    records,
    replayPort: input.replayPort,
    ...(input.replaySidecar === undefined
      ? {}
      : { replaySidecar: input.replaySidecar }),
    evaluatedAt: input.computedAt,
  });

  return Object.freeze({
    replayResult,
    comparisonReport: computeProjectionReplayComparisonReport({
      outcomes: replayResult.outcomes,
      sourceRecords: records,
      computedAt: input.computedAt,
    }),
  });
}

export type { EvaluationHistoryRecord };
