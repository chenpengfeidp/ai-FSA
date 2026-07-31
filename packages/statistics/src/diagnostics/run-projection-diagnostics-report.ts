import type { EvaluationHistoryRepository } from "../repository/evaluation-history-repository.js";
import type { ProjectionReplaySidecarRepository } from "../repository/projection-replay-sidecar-repository.js";
import { computeProjectionDiagnosticsReport } from "./compute-projection-diagnostics-report.js";
import type { ProjectionReplayPort } from "../replay/projection-replay-port.js";
import { ReplayRunner } from "../replay/replay-runner.js";

export interface RunProjectionDiagnosticsReportInput {
  readonly repository: EvaluationHistoryRepository;
  readonly sidecarRepository: ProjectionReplaySidecarRepository;
  readonly replayPort: ProjectionReplayPort;
  readonly computedAt: string;
  readonly query?: Parameters<EvaluationHistoryRepository["query"]>[0];
}

export async function runProjectionDiagnosticsReport(
  input: RunProjectionDiagnosticsReportInput,
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
  const report = computeProjectionDiagnosticsReport({
    replayResult,
    sourceRecords: records,
    computedAt: input.computedAt,
  });

  return Object.freeze({
    replayResult,
    report,
  });
}
