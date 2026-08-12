import type { SealedCohortOfflineReplayRun } from "../domain/sealed-cohort-offline-replay-run.js";

export interface ReplayRunRepository {
  save(run: SealedCohortOfflineReplayRun): Promise<SealedCohortOfflineReplayRun>;
  findByReplayRunId(
    replayRunId: string,
  ): Promise<SealedCohortOfflineReplayRun | undefined>;
  findByCohortId(cohortId: string): Promise<readonly SealedCohortOfflineReplayRun[]>;
}

export class ConflictReplayRunError extends Error {
  constructor(replayRunId: string) {
    super(`Replay Run "${replayRunId}" already exists with different content.`);
    this.name = "ConflictReplayRunError";
  }
}
