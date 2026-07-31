import type { SealedProjectionReplayContext } from "../replay/projection-replay-context.js";
import type { ProjectionReplaySidecar } from "../replay/projection-replay-context.js";
import type { ProjectionReplaySidecarRepository } from "./projection-replay-sidecar-repository.js";

export class InMemoryProjectionReplaySidecarRepository
  implements ProjectionReplaySidecarRepository
{
  readonly #byHistoryId = new Map<string, SealedProjectionReplayContext>();
  readonly #byMatchId = new Map<string, SealedProjectionReplayContext>();

  async save(input: {
    readonly historyId: string;
    readonly matchId: string;
    readonly context: SealedProjectionReplayContext;
  }): Promise<void> {
    this.#byHistoryId.set(input.historyId, input.context);
    this.#byMatchId.set(input.matchId, input.context);
  }

  async buildSidecarMap(): Promise<ProjectionReplaySidecar> {
    const sidecar: Record<string, SealedProjectionReplayContext> = {};

    for (const [historyId, context] of this.#byHistoryId.entries()) {
      sidecar[historyId] = context;
    }

    for (const [matchId, context] of this.#byMatchId.entries()) {
      sidecar[matchId] = context;
    }

    return Object.freeze(sidecar);
  }
}
