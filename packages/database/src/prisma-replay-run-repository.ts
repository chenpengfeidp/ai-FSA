import {
  ConflictReplayRunError,
  SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION,
  type ReplayRunRepository,
  type SealedCohortOfflineReplayRun,
} from "@fas/statistics";
import type { Prisma } from "../generated/prisma/client.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import { FAS_EVIDENCE_NAMESPACE, uuidV5 } from "./uuid-v5.js";

function replayRunRowId(replayRunId: string): string {
  return uuidV5(`replay-run:${replayRunId}`, FAS_EVIDENCE_NAMESPACE);
}

function sameRun(
  left: SealedCohortOfflineReplayRun,
  right: SealedCohortOfflineReplayRun,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function reviveRun(value: unknown): SealedCohortOfflineReplayRun {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid Replay Run JSON payload.");
  }

  const run = value as SealedCohortOfflineReplayRun;
  if (run.schemaVersion !== SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported Replay Run schemaVersion: ${String(run.schemaVersion)}`,
    );
  }

  return Object.freeze({
    ...run,
    results: Object.freeze([...(run.results ?? [])]),
    limitations: Object.freeze([...(run.limitations ?? [])]),
  });
}

export class PrismaReplayRunRepository implements ReplayRunRepository {
  readonly #client: PrismaClient;

  constructor(client: PrismaClient) {
    this.#client = client;
  }

  async save(
    run: SealedCohortOfflineReplayRun,
  ): Promise<SealedCohortOfflineReplayRun> {
    const existing = await this.#client.replayRunItem.findUnique({
      where: { replayRunId: run.replayRunId },
    });

    if (existing !== null) {
      const revived = reviveRun(existing.runJson);
      if (sameRun(revived, run)) {
        return revived;
      }
      throw new ConflictReplayRunError(run.replayRunId);
    }

    await this.#client.replayRunItem.create({
      data: {
        id: replayRunRowId(run.replayRunId),
        replayRunId: run.replayRunId,
        cohortId: run.cohortId,
        membershipDigestSha256: run.membershipDigestSha256,
        matchScriptCalibrationLabel: run.matchScriptCalibrationLabel,
        schemaVersion: run.schemaVersion,
        status: run.status,
        createdAt: new Date(run.createdAt),
        completedAt: new Date(run.completedAt),
        memberCount: run.memberCount,
        successCount: run.successCount,
        failureCount: run.failureCount,
        isProductionDefault: run.isProductionDefault,
        productionPromoted: run.productionPromoted,
        runJson: run as unknown as Prisma.InputJsonValue,
      },
    });

    const created = await this.findByReplayRunId(run.replayRunId);
    if (created === undefined) {
      throw new Error(`Failed to persist Replay Run "${run.replayRunId}".`);
    }

    return created;
  }

  async findByReplayRunId(
    replayRunId: string,
  ): Promise<SealedCohortOfflineReplayRun | undefined> {
    const row = await this.#client.replayRunItem.findUnique({
      where: { replayRunId },
    });
    if (row === null) {
      return undefined;
    }
    return reviveRun(row.runJson);
  }

  async findByCohortId(
    cohortId: string,
  ): Promise<readonly SealedCohortOfflineReplayRun[]> {
    const rows = await this.#client.replayRunItem.findMany({
      where: { cohortId },
      orderBy: { replayRunId: "asc" },
    });
    return Object.freeze(rows.map((row) => reviveRun(row.runJson)));
  }
}
