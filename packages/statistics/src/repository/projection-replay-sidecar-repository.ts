import type { SealedProjectionReplayContext } from "../replay/projection-replay-context.js";
import type { ProjectionReplaySidecar } from "../replay/projection-replay-context.js";

export interface ProjectionReplaySidecarRepository {
  save(input: {
    readonly historyId: string;
    readonly matchId: string;
    readonly context: SealedProjectionReplayContext;
  }): Promise<void>;
  buildSidecarMap(): Promise<ProjectionReplaySidecar>;
}
