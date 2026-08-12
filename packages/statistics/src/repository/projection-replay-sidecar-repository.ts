import type { SealedProjectionReplayContext } from "../replay/projection-replay-context.js";
import type { ProjectionReplaySidecar } from "../replay/projection-replay-context.js";
import type { ProjectionReplaySidecarRecord } from "../replay/projection-replay-sidecar-record.js";

export { PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION } from "../replay/projection-replay-sidecar-record.js";

export interface ProjectionReplaySidecarRepository {
  save(input: {
    readonly historyId: string;
    readonly matchId: string;
    readonly context: SealedProjectionReplayContext;
  }): Promise<void>;
  findByHistoryId(
    historyId: string,
  ): Promise<SealedProjectionReplayContext | undefined>;
  /** P2K-C — metadata + context for eligibility / integrity. */
  findRecordByHistoryId(
    historyId: string,
  ): Promise<ProjectionReplaySidecarRecord | undefined>;
  buildSidecarMap(): Promise<ProjectionReplaySidecar>;
}

export class ConflictProjectionReplaySidecarError extends Error {
  constructor(historyId: string) {
    super(
      `Projection Replay Sidecar for history "${historyId}" already exists with different content.`,
    );
    this.name = "ConflictProjectionReplaySidecarError";
  }
}
