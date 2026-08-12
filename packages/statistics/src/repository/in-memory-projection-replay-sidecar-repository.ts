import type { SealedProjectionReplayContext } from "../replay/projection-replay-context.js";
import type { ProjectionReplaySidecar } from "../replay/projection-replay-context.js";
import {
  ConflictProjectionReplaySidecarError,
  type ProjectionReplaySidecarRepository,
} from "./projection-replay-sidecar-repository.js";

function contextFingerprint(context: SealedProjectionReplayContext): string {
  return JSON.stringify(context);
}

export class InMemoryProjectionReplaySidecarRepository
  implements ProjectionReplaySidecarRepository
{
  readonly #byHistoryId = new Map<
    string,
    Readonly<{
      context: SealedProjectionReplayContext;
      fingerprint: string;
      matchId: string;
    }>
  >();
  readonly #byMatchId = new Map<string, SealedProjectionReplayContext>();

  async save(input: {
    readonly historyId: string;
    readonly matchId: string;
    readonly context: SealedProjectionReplayContext;
  }): Promise<void> {
    const fingerprint = contextFingerprint(input.context);
    const existing = this.#byHistoryId.get(input.historyId);

    if (existing !== undefined) {
      if (existing.fingerprint === fingerprint) {
        return;
      }

      throw new ConflictProjectionReplaySidecarError(input.historyId);
    }

    this.#byHistoryId.set(input.historyId, {
      context: input.context,
      fingerprint,
      matchId: input.matchId,
    });
    this.#byMatchId.set(input.matchId, input.context);
  }

  async findByHistoryId(
    historyId: string,
  ): Promise<SealedProjectionReplayContext | undefined> {
    return this.#byHistoryId.get(historyId)?.context;
  }

  async buildSidecarMap(): Promise<ProjectionReplaySidecar> {
    const sidecar: Record<string, SealedProjectionReplayContext> = {};

    for (const [historyId, entry] of this.#byHistoryId.entries()) {
      sidecar[historyId] = entry.context;
    }

    for (const [matchId, context] of this.#byMatchId.entries()) {
      sidecar[matchId] = context;
    }

    return Object.freeze(sidecar);
  }
}
