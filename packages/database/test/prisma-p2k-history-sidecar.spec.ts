import { afterAll, describe, expect, it } from "vitest";
import {
  buildEvaluationHistoryRecord,
  ConflictProjectionReplaySidecarError,
  createActualMatchResult,
  evaluatePrediction,
  type EvaluationHistoryRecord,
  type SealedProjectionReplayContext,
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

function scoredHistory(runId: string): EvaluationHistoryRecord {
  const matchId = `match-p2k-${runId}`;
  const prediction = Object.freeze({
    matchId,
    projectionChecksum: `proj-${runId}`,
    projectionStatus: "completed_nonempty" as const,
    pHome: 0.5,
    pDraw: 0.3,
    pAway: 0.2,
    topScorelines: Object.freeze([
      Object.freeze({ homeGoals: 1, awayGoals: 0, probability: 0.12 }),
    ]),
    goalRange: Object.freeze({
      range01: 0.3,
      range23: 0.45,
      range4Plus: 0.25,
    }),
    predictionConfidence: 70,
    confidenceBand: "high" as const,
    scenarios: Object.freeze({
      mostLikely: Object.freeze({
        slot: "mostLikely" as const,
        winner: "home" as const,
        homeGoals: 1,
        awayGoals: 0,
        probability: 0.5,
      }),
      secondLikely: Object.freeze({
        slot: "secondLikely" as const,
        winner: "draw" as const,
        homeGoals: 1,
        awayGoals: 1,
        probability: 0.3,
      }),
      upset: Object.freeze({
        slot: "upset" as const,
        winner: "away" as const,
        homeGoals: 0,
        awayGoals: 1,
        probability: 0.2,
      }),
    }),
    rules: Object.freeze([
      Object.freeze({
        ruleName: "HOME_ATTACK_EDGE",
        status: "PASS" as const,
        channel: "home+" as const,
      }),
    ]),
    featureNames: Object.freeze(["attackRatingHome", "attackRatingAway"]),
    projectionModelVersion: "projection.v2.test",
    featureModelVersion: "feature.v2.test",
    ruleSetVersion: "rule.mvp.test",
  });

  const actual = createActualMatchResult({
    matchId,
    homeGoals: 1,
    awayGoals: 0,
    winner: "home",
    totalGoals: 1,
    competitionId: "292",
    competitionName: "K League 1",
    matchStatus: "FINISHED",
    providerId: "football:p2k",
    providerSourceId: `p2k:${runId}:result`,
    providerMethod: "test-fixture",
    observedAt: "2026-08-12T12:00:00.000Z",
  });

  const evaluation = evaluatePrediction({
    prediction,
    actual,
    evaluatedAt: "2026-08-12T12:00:00.000Z",
  });

  if (evaluation.status !== "scored") {
    throw new Error("Expected scored evaluation for P2K fixture.");
  }

  return buildEvaluationHistoryRecord({
    predictionSnapshot: prediction,
    actualResult: actual,
    evaluation,
    homeTeam: "Home FC",
    awayTeam: "Away FC",
    matchDate: "2026-08-12T10:00:00.000Z",
    recordedAt: "2026-08-12T12:00:00.000Z",
  });
}

function sampleContext(
  matchId: string,
  overrides: Partial<SealedProjectionReplayContext> = {},
): SealedProjectionReplayContext {
  return Object.freeze({
    matchId,
    featureModelVersion: "feature.v2.test",
    featureBundleChecksum: "fb-checksum-p2k",
    featureBundleStatus: "completed_nonempty",
    evidenceRefs: Object.freeze(["ev-p2k-1"]),
    features: Object.freeze([
      Object.freeze({ name: "attackRatingHome", value: 1.1 }),
    ]),
    rules: Object.freeze([
      Object.freeze({
        ruleId: "rule-p2k",
        ruleName: "HOME_ATTACK_EDGE",
        status: "PASS" as const,
        channel: "home+" as const,
        weight: 1,
        score: 0.3,
      }),
    ]),
    requiredEvidencePresentCount: 5,
    generatedAt: "2026-08-12T12:00:00.000Z",
    parameterArtifactId: "artifact-p2k",
    parameterVersionLabel: "v2.active",
    parameterArtifactChecksum: "param-p2k",
    ...overrides,
  });
}

describe.skipIf(connected === undefined)(
  "P2K-A/B PostgreSQL History + Sidecar durability",
  () => {
    const runId = `${Date.now()}`;

    afterAll(async () => {
      await connected?.lifecycle.disconnect();
    });

    it("round-trips Evaluation History across repository recreation", async () => {
      const history = scoredHistory(`${runId}-hist`);
      await requireConnected().evaluationHistoryRepository.save(history);

      const reopened = createFasDatabase(databaseUrl);
      try {
        const loaded = await reopened.evaluationHistoryRepository.findByHistoryId(
          history.historyId,
        );
        expect(loaded?.historyId).toBe(history.historyId);
        expect(loaded?.predictionSnapshot).toEqual(history.predictionSnapshot);
        expect(loaded?.checksum).toBe(history.checksum);
      } finally {
        await reopened.lifecycle.disconnect();
      }
    });

    it("round-trips Projection Replay Sidecar across repository recreation", async () => {
      const history = scoredHistory(`${runId}-side`);
      await requireConnected().evaluationHistoryRepository.save(history);
      const context = sampleContext(history.matchId);

      await requireConnected().projectionReplaySidecarRepository.save({
        historyId: history.historyId,
        matchId: history.matchId,
        context,
      });

      const reopened = createFasDatabase(databaseUrl);
      try {
        const loaded =
          await reopened.projectionReplaySidecarRepository.findByHistoryId(
            history.historyId,
          );
        expect(loaded).toEqual(context);
      } finally {
        await reopened.lifecycle.disconnect();
      }
    });

    it("survives process-boundary recreation for History + Sidecar together", async () => {
      const history = scoredHistory(`${runId}-both`);
      const context = sampleContext(history.matchId);

      await requireConnected().evaluationHistoryRepository.save(history);
      await requireConnected().projectionReplaySidecarRepository.save({
        historyId: history.historyId,
        matchId: history.matchId,
        context,
      });

      const processB = createFasDatabase(databaseUrl);
      try {
        const loadedHistory =
          await processB.evaluationHistoryRepository.findByHistoryId(
            history.historyId,
          );
        const loadedSidecar =
          await processB.projectionReplaySidecarRepository.findByHistoryId(
            history.historyId,
          );

        expect(loadedHistory?.historyId).toBe(history.historyId);
        expect(loadedHistory?.predictionSnapshot.projectionChecksum).toBe(
          history.predictionSnapshot.projectionChecksum,
        );
        expect(loadedSidecar).toEqual(context);
      } finally {
        await processB.lifecycle.disconnect();
      }
    });

    it("is idempotent for identical sidecar content hash", async () => {
      const history = scoredHistory(`${runId}-idem`);
      const context = sampleContext(history.matchId);
      await requireConnected().evaluationHistoryRepository.save(history);

      await requireConnected().projectionReplaySidecarRepository.save({
        historyId: history.historyId,
        matchId: history.matchId,
        context,
      });
      await expect(
        requireConnected().projectionReplaySidecarRepository.save({
          historyId: history.historyId,
          matchId: history.matchId,
          context,
        }),
      ).resolves.toBeUndefined();
    });

    it("rejects conflicting sidecar content for the same historyId", async () => {
      const history = scoredHistory(`${runId}-conflict`);
      await requireConnected().evaluationHistoryRepository.save(history);
      await requireConnected().projectionReplaySidecarRepository.save({
        historyId: history.historyId,
        matchId: history.matchId,
        context: sampleContext(history.matchId),
      });

      await expect(
        requireConnected().projectionReplaySidecarRepository.save({
          historyId: history.historyId,
          matchId: history.matchId,
          context: sampleContext(history.matchId, {
            featureBundleChecksum: "changed",
          }),
        }),
      ).rejects.toBeInstanceOf(ConflictProjectionReplaySidecarError);
    });

    it("keeps legacy History readable without a Sidecar (not V2 replay-complete)", async () => {
      const history = scoredHistory(`${runId}-legacy`);
      await requireConnected().evaluationHistoryRepository.save(history);

      const sidecar =
        await requireConnected().projectionReplaySidecarRepository.findByHistoryId(
          history.historyId,
        );
      const loaded =
        await requireConnected().evaluationHistoryRepository.findByHistoryId(
          history.historyId,
        );

      expect(loaded?.historyId).toBe(history.historyId);
      expect(sidecar).toBeUndefined();
    });
  },
);

describe("P2K PostgreSQL availability", () => {
  it("reports when live PostgreSQL integration tests are blocked", () => {
    if (connected === undefined) {
      console.warn(
        [
          "BLOCKED: P2K PostgreSQL History/Sidecar integration tests skipped.",
          "Start validation Postgres and run migrations:",
          `  DATABASE_URL=${databaseUrl}`,
          "  pnpm --filter @fas/database prisma:migrate",
          "  pnpm --filter @fas/database test",
        ].join("\n"),
      );
    }

    expect(true).toBe(true);
  });
});
