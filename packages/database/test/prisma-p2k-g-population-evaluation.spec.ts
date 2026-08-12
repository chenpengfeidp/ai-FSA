import { afterAll, describe, expect, it } from "vitest";
import {
  ConflictPopulationEvaluationError,
  SEALED_COHORT_POPULATION_EVALUATION_SCHEMA_VERSION,
  type SealedCohortPopulationEvaluation,
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

function sampleEvaluation(
  evaluationRunId: string,
): SealedCohortPopulationEvaluation {
  const notAvailable = Object.freeze({
    availability: "not_available" as const,
    value: undefined,
    hitCount: undefined,
    sampleSize: 0,
    unavailableReason: "empty sample",
  });
  const row = Object.freeze({
    metricId: "winnerAccuracy",
    metricLabel: "Match Result Accuracy",
    baseline: notAvailable,
    candidate: notAvailable,
    delta: undefined,
  });

  return Object.freeze({
    evaluationRunId,
    schemaVersion: SEALED_COHORT_POPULATION_EVALUATION_SCHEMA_VERSION,
    cohortId: `cohort.for.${evaluationRunId}`,
    membershipDigestSha256: "a".repeat(64),
    baselineReplayRunId: `${evaluationRunId}.a`,
    candidateReplayRunId: `${evaluationRunId}.c`,
    baselineCalibrationLabel: "r1b.candidate.a.baseline",
    candidateCalibrationLabel: "r1b.candidate.c.sideAwareOpen",
    coverage: Object.freeze({
      totalSealedMembers: 0,
      eligibleReplayMembers: 0,
      successfulBaselineReplayCount: 0,
      successfulCandidateReplayCount: 0,
      pairedSuccessfulCount: 0,
      failedBaselineCount: 0,
      failedCandidateCount: 0,
      excludedCount: 0,
      finalEvaluationSampleSize: 0,
    }),
    comparisons: Object.freeze([row]),
    winnerBreakdown: Object.freeze({
      actualHome: row,
      actualDraw: row,
      actualAway: row,
    }),
    candidateCProductionPromoted: false,
    productionMatchScriptUnchanged: true,
    statisticalSignificanceSupported: false,
    createdAt: "2026-08-12T18:00:00.000Z",
    checksum: "b".repeat(64),
    limitations: Object.freeze(["P2K-G persistence test"]),
  });
}

describe.skipIf(connected === undefined)(
  "P2K-G Prisma Population Evaluation",
  () => {
    afterAll(async () => {
      if (connected !== undefined) {
        await connected.lifecycle.disconnect();
      }
    });

    it("persists Population Evaluation and rejects conflicting overwrite", async () => {
      const database = requireConnected();
      const evaluationRunId = `eval.p2k.g.pg.${Date.now()}`;
      const evaluation = sampleEvaluation(evaluationRunId);
      const saved = await database.populationEvaluationRepository.save(evaluation);
      expect(saved.evaluationRunId).toBe(evaluationRunId);

      const reopened = createFasDatabase(databaseUrl);
      try {
        const loaded =
          await reopened.populationEvaluationRepository.findByEvaluationRunId(
            evaluationRunId,
          );
        expect(loaded).toEqual(evaluation);
        expect(
          await reopened.populationEvaluationRepository.findByCohortId(
            evaluation.cohortId,
          ),
        ).toEqual([evaluation]);

        await expect(
          reopened.populationEvaluationRepository.save({
            ...evaluation,
            checksum: "c".repeat(64),
          }),
        ).rejects.toBeInstanceOf(ConflictPopulationEvaluationError);
      } finally {
        await reopened.lifecycle.disconnect();
      }
    });
  },
);
