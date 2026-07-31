import type { EvaluationHistoryRecord } from "../domain/evaluation-history.js";
import type { EvaluationHistoryRepository } from "../repository/evaluation-history-repository.js";
import type { ProjectionReplaySidecarRepository } from "../repository/projection-replay-sidecar-repository.js";
import { computeProjectionReplayReport } from "./compute-projection-replay-report.js";
import type { ProjectionReplayPort } from "./projection-replay-port.js";
import { ReplayRunner } from "./replay-runner.js";

export interface RunProjectionReplayReportInput {
  readonly repository: EvaluationHistoryRepository;
  readonly sidecarRepository: ProjectionReplaySidecarRepository;
  readonly replayPort: ProjectionReplayPort;
  readonly computedAt: string;
  readonly query?: Parameters<EvaluationHistoryRepository["query"]>[0];
}

export async function runProjectionReplayReport(
  input: RunProjectionReplayReportInput,
) {
  const records = await input.repository.query(input.query ?? {});
  const replaySidecar = await input.sidecarRepository.buildSidecarMap();
  const runner = new ReplayRunner();
  const replayResult = runner.run({
    records,
    replayPort: input.replayPort,
    replaySidecar,
    evaluatedAt: input.computedAt,
  });
  const report = computeProjectionReplayReport({
    replayResult,
    sourceRecords: records,
    computedAt: input.computedAt,
  });

  return Object.freeze({
    replayResult,
    report,
  });
}

export type { EvaluationHistoryRecord };
