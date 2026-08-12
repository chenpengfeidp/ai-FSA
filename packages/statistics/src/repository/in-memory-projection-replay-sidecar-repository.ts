import type { SealedProjectionReplayContext } from "../replay/projection-replay-context.js";
import type { ProjectionReplaySidecar } from "../replay/projection-replay-context.js";
import type { ProjectionReplaySidecarRecord } from "../replay/projection-replay-sidecar-record.js";
import { PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION } from "../replay/projection-replay-sidecar-record.js";
import { computeProjectionReplaySidecarContentSha256 } from "../replay/sidecar-content-sha256.js";
import {
  ConflictProjectionReplaySidecarError,
  type ProjectionReplaySidecarRepository,
} from "./projection-replay-sidecar-repository.js";

export class InMemoryProjectionReplaySidecarRepository
  implements ProjectionReplaySidecarRepository
{
  readonly #byHistoryId = new Map<string, ProjectionReplaySidecarRecord>();
  readonly #byMatchId = new Map<string, SealedProjectionReplayContext>();

  async save(input: {
    readonly historyId: string;
    readonly matchId: string;
    readonly context: SealedProjectionReplayContext;
  }): Promise<void> {
    const contentSha256 = computeProjectionReplaySidecarContentSha256(input.context);
    const existing = this.#byHistoryId.get(input.historyId);

    if (existing !== undefined) {
      if (existing.contentSha256 === contentSha256) {
        return;
      }

      throw new ConflictProjectionReplaySidecarError(input.historyId);
    }

    const record = Object.freeze({
      historyId: input.historyId,
      matchId: input.matchId,
      schemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
      contentSha256,
      context: input.context,
    });

    this.#byHistoryId.set(input.historyId, record);
    this.#byMatchId.set(input.matchId, input.context);
  }

  /**
   * Test/support helper: store a record with explicit schema/hash (P2K-C).
   * Does not bypass conflict checks for differing content under the same historyId.
   */
  async saveRecord(record: ProjectionReplaySidecarRecord): Promise<void> {
    const existing = this.#byHistoryId.get(record.historyId);

    if (existing !== undefined) {
      if (
        existing.contentSha256 === record.contentSha256 &&
        existing.schemaVersion === record.schemaVersion
      ) {
        return;
      }

      throw new ConflictProjectionReplaySidecarError(record.historyId);
    }

    const frozen = Object.freeze({ ...record, context: record.context });
    this.#byHistoryId.set(record.historyId, frozen);
    this.#byMatchId.set(record.matchId, record.context);
  }

  async findByHistoryId(
    historyId: string,
  ): Promise<SealedProjectionReplayContext | undefined> {
    return this.#byHistoryId.get(historyId)?.context;
  }

  async findRecordByHistoryId(
    historyId: string,
  ): Promise<ProjectionReplaySidecarRecord | undefined> {
    return this.#byHistoryId.get(historyId);
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
