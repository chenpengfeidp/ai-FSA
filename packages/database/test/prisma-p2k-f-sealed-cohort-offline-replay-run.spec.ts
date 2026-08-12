import { afterAll, describe, expect, it } from "vitest";
import {
  ConflictReplayRunError,
  SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION,
  type SealedCohortOfflineReplayRun,
} from "@fas/statistics";

import { createFasDatabase, type FasDatabaseHandle } from "../src/index.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation";

async function tryConnect(): Promise<FasDatabaseHandle | undefined> {
  try {
    const database = createFasDatabase(databaseUrl);
    await database.lifecycle.ping();
    return database;
  } catch {
    return undefined;
  }
}

const connected = await tryConnect();

function requireConnected(): FasDatabaseHandle {
  if (connected === undefined) {
    throw new Error("PostgreSQL required for this suite.");
  }
  return connected;
}

function sampleRun(runId: string): SealedCohortOfflineReplayRun {
  return Object.freeze({
    replayRunId: runId,
    schemaVersion: SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION,
    cohortId: `cohort.for.${runId}`,
    membershipDigestSha256: "a".repeat(64),
    matchScriptCalibrationLabel: "r1b.candidate.a.baseline",
    isProductionDefault: true,
    productionPromoted: false as const,
    status: "completed",
    createdAt: "2026-08-12T17:00:00.000Z",
    completedAt: "2026-08-12T17:00:00.000Z",
    memberCount: 0,
    successCount: 0,
    failureCount: 0,
    results: Object.freeze([]),
    limitations: Object.freeze(["P2K-F persistence test"]),
  });
}

describe.skipIf(connected === undefined)(
  "P2K-F Prisma Sealed Cohort Offline Replay Run",
  () => {
    afterAll(async () => {
      if (connected !== undefined) {
        await connected.lifecycle.disconnect();
      }
    });

    it("persists Replay Run across process boundary and rejects conflicting overwrite", async () => {
      const database = requireConnected();
      const runId = `run.p2k.f.pg.${Date.now()}`;
      const run = sampleRun(runId);
      const saved = await database.replayRunRepository.save(run);
      expect(saved.replayRunId).toBe(runId);

      const reopened = createFasDatabase(databaseUrl);
      try {
        const loaded = await reopened.replayRunRepository.findByReplayRunId(runId);
        expect(loaded).toEqual(run);
        expect(
          await reopened.replayRunRepository.findByCohortId(run.cohortId),
        ).toEqual([run]);

        await expect(
          reopened.replayRunRepository.save({
            ...run,
            matchScriptCalibrationLabel: "r1b.candidate.c.sideAwareOpen",
            isProductionDefault: false,
          }),
        ).rejects.toBeInstanceOf(ConflictReplayRunError);
      } finally {
        await reopened.lifecycle.disconnect();
      }
    });
  },
);
