import type { SealedProjectionReplayContext } from "../replay/projection-replay-context.js";
import type { ProjectionReplaySidecar } from "../replay/projection-replay-context.js";

export const PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION =
  "projection-replay-sidecar.p2k.b" as const;

export interface ProjectionReplaySidecarRepository {
  save(input: {
    readonly historyId: string;
    readonly matchId: string;
    readonly context: SealedProjectionReplayContext;
  }): Promise<void>;
  findByHistoryId(
    historyId: string,
  ): Promise<SealedProjectionReplayContext | undefined>;
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
