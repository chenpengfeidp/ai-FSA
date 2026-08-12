import type { SealedCohortOfflineReplayRun } from "../domain/sealed-cohort-offline-replay-run.js";
import {
  ConflictReplayRunError,
  type ReplayRunRepository,
} from "./replay-run-repository.js";

function sameRun(
  left: SealedCohortOfflineReplayRun,
  right: SealedCohortOfflineReplayRun,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export class InMemoryReplayRunRepository implements ReplayRunRepository {
  readonly #byId = new Map<string, SealedCohortOfflineReplayRun>();

  async save(
    run: SealedCohortOfflineReplayRun,
  ): Promise<SealedCohortOfflineReplayRun> {
    const existing = this.#byId.get(run.replayRunId);
    if (existing !== undefined) {
      if (sameRun(existing, run)) {
        return existing;
      }
      throw new ConflictReplayRunError(run.replayRunId);
    }

    const frozen = Object.freeze({
      ...run,
      results: Object.freeze([...run.results]),
      limitations: Object.freeze([...run.limitations]),
    });
    this.#byId.set(run.replayRunId, frozen);
    return frozen;
  }

  async findByReplayRunId(
    replayRunId: string,
  ): Promise<SealedCohortOfflineReplayRun | undefined> {
    return this.#byId.get(replayRunId);
  }

  async findByCohortId(
    cohortId: string,
  ): Promise<readonly SealedCohortOfflineReplayRun[]> {
    return Object.freeze(
      [...this.#byId.values()]
        .filter((run) => run.cohortId === cohortId)
        .sort((left, right) =>
          left.replayRunId < right.replayRunId
            ? -1
            : left.replayRunId > right.replayRunId
              ? 1
              : 0,
        ),
    );
  }
}
