import { afterAll, describe, expect, it } from "vitest";
import {
  buildEvaluationHistoryRecord,
  createActualMatchResult,
  EVALUATION_HISTORY_HISTORICAL_INTAKE_SCHEMA_VERSION,
  EVALUATION_HISTORY_SCHEMA_VERSION,
  evaluatePrediction,
  ingestHistoricalEvaluation,
  PREMATCH_SEAL_ALLOWED_USAGE_HISTORICAL_INTAKE,
  sha256CanonicalEvaluationJson,
  UNIT_TEST_CONSTRUCTED_SOURCE_AUTHORITY,
  UnsupportedHistorySchemaVersionError,
  type EvaluationHistoryRecord,
  type HistoricalPredictionSeal,
  type SealedPredictionInput,
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

function predictionSnapshot(matchId: string): SealedPredictionInput {
  return Object.freeze({
    matchId,
    projectionChecksum: `proj:${matchId}`,
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
    featureNames: Object.freeze(["homeTeam", "awayTeam", "kickoff"]),
    projectionModelVersion: "projection.unit-test.constructed",
    featureModelVersion: "feature.unit-test.constructed",
    ruleSetVersion: "rule.unit-test.constructed",
  });
}

function a15History(runId: string): EvaluationHistoryRecord {
  const matchId = `match-hi-a15-${runId}`;
  const prediction = predictionSnapshot(matchId);
  const actual = createActualMatchResult({
    matchId,
    homeGoals: 1,
    awayGoals: 0,
    winner: "home",
    totalGoals: 1,
    matchStatus: "FINISHED",
    providerId: "football:demo",
    providerSourceId: `demo:${matchId}`,
    providerMethod: "recorded-snapshot",
    observedAt: "2026-08-12T12:00:00.000Z",
  });
  const evaluation = evaluatePrediction({
    prediction,
    actual,
    evaluatedAt: "2026-08-12T13:00:00.000Z",
  });

  return buildEvaluationHistoryRecord({
    predictionSnapshot: prediction,
    actualResult: actual,
    evaluation,
    homeTeam: "Home FC",
    awayTeam: "Away FC",
    matchDate: "2026-08-12T10:00:00.000Z",
    recordedAt: "2026-08-12T13:00:00.000Z",
  });
}

function constructedSeal(runId: string): HistoricalPredictionSeal {
  const matchId = `unit-test:constructed:prisma:${runId}`;
  const snapshot = predictionSnapshot(matchId);

  return Object.freeze({
    originalSealId: `unit-test-seal:${matchId}`,
    originalSealKind: "sealed_projection",
    originalSealSource: UNIT_TEST_CONSTRUCTED_SOURCE_AUTHORITY,
    originalSealChecksum: sha256CanonicalEvaluationJson(snapshot),
    checksumAlgorithm: "sha256",
    checksumCanonicalization: "fas-json-canonical.v1",
    checksumScope: "/predictionSnapshot",
    checksumPayload: snapshot,
    matchId,
    homeTeam: "Home FC",
    awayTeam: "Away FC",
    competitionId: "comp-unit-test",
    competitionName: "Unit Test Competition",
    season: "2025/26",
    kickoff: "2030-06-01T15:00:00.000Z",
    generatedAt: "2030-06-01T12:05:00.000Z",
    analysisTime: "2030-06-01T12:00:00.000Z",
    analysisCutoff: "2030-06-01T12:00:00.000Z",
    predictionSnapshot: snapshot,
    featureModelVersion: "feature.unit-test.constructed",
    ruleSetVersion: "rule.unit-test.constructed",
    projectionModelVersion: "projection.unit-test.constructed",
    historicalAuthenticity: true,
    synthetic: false,
    provenanceClass: "A",
    allowedUsage: Object.freeze([PREMATCH_SEAL_ALLOWED_USAGE_HISTORICAL_INTAKE]),
    sourceAuthority: UNIT_TEST_CONSTRUCTED_SOURCE_AUTHORITY,
  });
}

describe.skipIf(connected === undefined)(
  "Prisma Evaluation History historical-intake decoder",
  () => {
    const runId = `${Date.now()}`;

    afterAll(async () => {
      await connected?.lifecycle.disconnect();
    });

    it("T20/T23 round-trips a15 unchanged", async () => {
      const history = a15History(`${runId}-a15`);
      await requireConnected().evaluationHistoryRepository.save(history);
      const loaded =
        await requireConnected().evaluationHistoryRepository.findByHistoryId(
          history.historyId,
        );

      expect(loaded?.schemaVersion).toBe(EVALUATION_HISTORY_SCHEMA_VERSION);
      expect(loaded?.checksum).toBe(history.checksum);
      expect(
        loaded && "intakeIntegrity" in loaded ? loaded.intakeIntegrity : undefined,
      ).toBeUndefined();
    });

    it("T21/T23 round-trips historical-intake.v1 including intakeIntegrity", async () => {
      const seal = constructedSeal(`${runId}-hi`);
      const actual = createActualMatchResult({
        matchId: seal.matchId,
        homeGoals: 1,
        awayGoals: 0,
        winner: "home",
        totalGoals: 1,
        competitionId: seal.competitionId,
        competitionName: seal.competitionName,
        matchStatus: "FINISHED",
        providerId: "unit-test:constructed",
        providerSourceId: `${seal.matchId}:result`,
        providerMethod: "unit-test-constructed",
        observedAt: "2030-06-01T17:00:00.000Z",
      });
      const result = await ingestHistoricalEvaluation({
        command: {
          seal,
          actual: {
            actual,
            evidence: {
              id: `evidence-unit-test-${seal.matchId}-match-result`,
              type: "MATCH_RESULT",
              quality: "verified",
              providerId: "unit-test:constructed",
              sourceId: `${seal.matchId}:result`,
              method: "unit-test-constructed",
              matchId: seal.matchId,
            },
            realWorldVerification: true,
            verificationClass: "real-world",
            homeTeam: seal.homeTeam,
            awayTeam: seal.awayTeam,
            competitionId: seal.competitionId,
            competitionName: seal.competitionName,
            season: seal.season,
            kickoff: seal.kickoff,
          },
          intakeRecordedAt: "2030-06-02T00:00:00.000Z",
        },
        historyRepository: requireConnected().evaluationHistoryRepository,
      });

      expect(result.status).toBe("accepted");
      if (result.status !== "accepted") {
        return;
      }

      const reopened = createFasDatabase(databaseUrl);
      try {
        const loaded = await reopened.evaluationHistoryRepository.findByHistoryId(
          result.history.historyId,
        );
        expect(loaded?.schemaVersion).toBe(
          EVALUATION_HISTORY_HISTORICAL_INTAKE_SCHEMA_VERSION,
        );
        expect(loaded && "intakeIntegrity" in loaded).toBe(true);
        if (loaded && "intakeIntegrity" in loaded) {
          expect(loaded.intakeIntegrity.originalSealId).toBe(seal.originalSealId);
          expect(loaded.intakeIntegrity.calibrationEligible).toBe(false);
        }
      } finally {
        await reopened.lifecycle.disconnect();
      }
    });

    it("T22 fails closed on unsupported schema versions", async () => {
      const base = a15History(`${runId}-future`);
      const unsupported = {
        ...base,
        historyId: `${base.historyId}:future`,
        schemaVersion: "evaluation-history.future.x",
      } as EvaluationHistoryRecord;

      await requireConnected().evaluationHistoryRepository.save(unsupported);

      await expect(
        requireConnected().evaluationHistoryRepository.findByHistoryId(
          unsupported.historyId,
        ),
      ).rejects.toBeInstanceOf(UnsupportedHistorySchemaVersionError);

      await expect(
        requireConnected().evaluationHistoryRepository.query({
          matchId: unsupported.matchId,
        }),
      ).rejects.toBeInstanceOf(UnsupportedHistorySchemaVersionError);
    });
  },
);
