import type { EvaluationHistoryRecord } from "../domain/evaluation-history.js";
import type { EvaluationHistoryRepository } from "../repository/evaluation-history-repository.js";
import type { ProjectionReplaySidecarRepository } from "../repository/projection-replay-sidecar-repository.js";
import {
  assessProjectionReplayEligibility,
  type ProjectionReplayEligibilityAssessment,
  type ProjectionReplayEligibilityReason,
} from "./assess-projection-replay-eligibility.js";
import { classifySidecarBackfill } from "./classify-sidecar-backfill.js";
import { computeProjectionReplaySidecarContentSha256 } from "./sidecar-content-sha256.js";

export interface ProjectionReplayEligibilitySummary {
  readonly totalHistoryRecords: number;
  readonly replayCompleteRecords: number;
  readonly replayIncompleteRecords: number;
  readonly outcomeEvaluableRecords: number;
  readonly replayEligibleRecords: number;
  readonly missingSidecarRecords: number;
  readonly unsupportedSchemaRecords: number;
  readonly integrityFailureRecords: number;
  readonly assessments: readonly ProjectionReplayEligibilityAssessment[];
}

function countReason(
  assessments: readonly ProjectionReplayEligibilityAssessment[],
  reason: ProjectionReplayEligibilityReason,
): number {
  return assessments.filter((item) => item.reasons.includes(reason)).length;
}

/**
 * Load History population + Sidecars and summarize P2K-C eligibility.
 * Read-only — never fabricates Sidecars or regenerates Evidence.
 */
export async function summarizeProjectionReplayEligibility(input: {
  readonly historyRepository: EvaluationHistoryRepository;
  readonly sidecarRepository: ProjectionReplaySidecarRepository;
}): Promise<ProjectionReplayEligibilitySummary> {
  const histories = await input.historyRepository.query({});
  const assessments: ProjectionReplayEligibilityAssessment[] = [];

  for (const history of histories) {
    const sidecar = await input.sidecarRepository.findRecordByHistoryId(
      history.historyId,
    );
    assessments.push(
      assessProjectionReplayEligibility({
        history,
        sidecar,
        hashContext: computeProjectionReplaySidecarContentSha256,
      }),
    );
  }

  const frozen = Object.freeze(assessments);

  return Object.freeze({
    totalHistoryRecords: frozen.length,
    replayCompleteRecords: frozen.filter((item) => item.replayComplete).length,
    replayIncompleteRecords: frozen.filter((item) => !item.replayComplete).length,
    outcomeEvaluableRecords: frozen.filter((item) => item.outcomeEvaluable).length,
    replayEligibleRecords: frozen.filter((item) => item.replayEligible).length,
    missingSidecarRecords: countReason(frozen, "MISSING_SIDECAR"),
    unsupportedSchemaRecords: countReason(frozen, "UNSUPPORTED_SIDECAR_SCHEMA"),
    integrityFailureRecords: countReason(frozen, "INVALID_SIDECAR_HASH"),
    assessments: frozen,
  });
}

/**
 * Assess one History id using repositories (read-only).
 */
export async function assessHistoryProjectionReplayEligibility(input: {
  readonly history: EvaluationHistoryRecord;
  readonly sidecarRepository: ProjectionReplaySidecarRepository;
}): Promise<{
  readonly eligibility: ProjectionReplayEligibilityAssessment;
  readonly backfill: ReturnType<typeof classifySidecarBackfill>;
}> {
  const sidecar = await input.sidecarRepository.findRecordByHistoryId(
    input.history.historyId,
  );
  const eligibility = assessProjectionReplayEligibility({
    history: input.history,
    sidecar,
    hashContext: computeProjectionReplaySidecarContentSha256,
  });
  const backfill = classifySidecarBackfill({
    history: input.history,
    sidecar,
    eligibility,
  });

  return Object.freeze({ eligibility, backfill });
}
