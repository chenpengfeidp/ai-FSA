import { afterAll, describe, expect, it } from "vitest";
import {
  buildEvaluationHistoryRecord,
  createActualMatchResult,
  createAndSealReplayCohort,
  createDefaultReplayCohortSpecification,
  evaluatePrediction,
  PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
  resolveSealedReplayCohort,
  SealedReplayCohortImmutableError,
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
  const matchId = `match-p2k-e-${runId}`;
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
    featureNames: Object.freeze(["attackRatingHome"]),
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
    matchStatus: "FINISHED",
    providerId: "football:p2k-e",
    providerSourceId: `${matchId}:result`,
    providerMethod: "test",
    observedAt: "2026-08-12T12:00:00.000Z",
  });

  const evaluation = evaluatePrediction({
    prediction,
    actual,
    evaluatedAt: "2026-08-12T12:00:00.000Z",
  });

  if (evaluation.status !== "scored") {
    throw new Error("expected scored evaluation");
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

function sampleContext(matchId: string): SealedProjectionReplayContext {
  return Object.freeze({
    matchId,
    featureModelVersion: "feature.v2.test",
    featureBundleChecksum: "fb-checksum",
    featureBundleStatus: "completed_nonempty",
    evidenceRefs: Object.freeze(["ev-1"]),
    features: Object.freeze([
      Object.freeze({ name: "attackRatingHome", value: 1.1 }),
    ]),
    rules: Object.freeze([
      Object.freeze({
        ruleId: "rule-1",
        ruleName: "HOME_ATTACK_EDGE",
        status: "PASS" as const,
        channel: "home+" as const,
        weight: 1,
        score: 0.3,
      }),
    ]),
    requiredEvidencePresentCount: 5,
    generatedAt: "2026-08-12T12:00:00.000Z",
    parameterArtifactId: "artifact-1",
    parameterVersionLabel: "projection.v3.replay",
    parameterArtifactChecksum: "param-1",
  });
}

describe.skipIf(connected === undefined)("P2K-E Prisma Sealed Replay Cohort", () => {
  afterAll(async () => {
    if (connected !== undefined) {
      await connected.lifecycle.disconnect();
    }
  });

  it("persists sealed cohort membership across process boundary", async () => {
    const database = requireConnected();
    const runId = `pg-${Date.now()}`;
    const recordedAt = new Date(
      Date.UTC(2026, 7, 12, 18, Number(String(runId).slice(-4)) % 60, 0, 0),
    ).toISOString();
    const base = scoredHistory(runId);
    const isolated = buildEvaluationHistoryRecord({
      predictionSnapshot: base.predictionSnapshot,
      actualResult: base.actualResult,
      evaluation: base.evaluation,
      homeTeam: base.homeTeam,
      awayTeam: base.awayTeam,
      matchDate: base.matchDate,
      recordedAt,
    });
    await database.evaluationHistoryRepository.save(isolated);
    await database.projectionReplaySidecarRepository.save({
      historyId: isolated.historyId,
      matchId: isolated.matchId,
      context: sampleContext(isolated.matchId),
    });

    const cohortId = `cohort.p2k.e.pg.${runId}`;
    const windowEnd = new Date(Date.parse(recordedAt) + 1000).toISOString();
    const created = await createAndSealReplayCohort({
      cohortId,
      specification: createDefaultReplayCohortSpecification({
        sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
        recordedAtFromInclusive: recordedAt,
        recordedAtToExclusive: windowEnd,
      }),
      historyRepository: database.evaluationHistoryRepository,
      sidecarRepository: database.projectionReplaySidecarRepository,
      cohortRepository: database.replayCohortRepository,
      clock: () => "2026-08-12T15:00:00.000Z",
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const reopened = createFasDatabase(databaseUrl);
    try {
      const resolved = await resolveSealedReplayCohort({
        cohortId,
        cohortRepository: reopened.replayCohortRepository,
      });
      expect(resolved?.status).toBe("SEALED");
      expect(resolved?.membershipDigestSha256).toBe(
        created.value.membershipDigestSha256,
      );
      expect(resolved?.members.map((member) => member.historyId)).toEqual([
        isolated.historyId,
      ]);

      await expect(
        reopened.replayCohortRepository.save({
          ...created.value,
          membershipDigestSha256: "1".repeat(64),
          members: Object.freeze([
            Object.freeze({
              historyId: "other-history",
              matchId: "other-match",
              position: 0,
            }),
          ]),
        }),
      ).rejects.toBeInstanceOf(SealedReplayCohortImmutableError);
    } finally {
      await reopened.lifecycle.disconnect();
    }
  });
});
