/**
 * Review-only constructed Historical Intake Postgres round-trip.
 * Does not ingest Ipswich-Arsenal or any real fixture.
 * Cleans up all rows it writes.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../dist/generated/prisma/client.js";
import { PrismaEvaluationHistoryRepository } from "../dist/src/prisma-evaluation-history-repository.js";
import {
  createActualMatchResult,
  decodeEvaluationHistoryRecord,
  EVALUATION_HISTORY_HISTORICAL_INTAKE_SCHEMA_VERSION,
  EvaluationHistoryValidationError,
  ingestHistoricalEvaluation,
  PREMATCH_SEAL_ALLOWED_USAGE_HISTORICAL_INTAKE,
  sha256CanonicalEvaluationJson,
  UNIT_TEST_CONSTRUCTED_SOURCE_AUTHORITY,
  UnsupportedHistorySchemaVersionError,
} from "../../statistics/dist/index.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const envPath = join(REPO_ROOT, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://fas_local:change_me_local_only@127.0.0.1:5432/fas_local";

const REAL_MATCH = "lottery:csl:20260915:周二012";
const runId = `hi-review-${Date.now()}`;
const matchId = `unit-test:constructed:review:${runId}`;

function snapshot(id) {
  return Object.freeze({
    matchId: id,
    projectionChecksum: `proj:${id}`,
    projectionStatus: "completed_nonempty",
    pHome: 0.26,
    pDraw: 0.164,
    pAway: 0.576,
    topScorelines: Object.freeze([
      Object.freeze({ homeGoals: 3, awayGoals: 3, probability: 0.08 }),
    ]),
    goalRange: Object.freeze({ range01: 0.02, range23: 0.062, range4Plus: 0.918 }),
    predictionConfidence: 74,
    confidenceBand: "high",
    scenarios: Object.freeze({
      mostLikely: Object.freeze({
        slot: "mostLikely",
        winner: "draw",
        homeGoals: 3,
        awayGoals: 3,
        probability: 0.08,
      }),
      secondLikely: Object.freeze({
        slot: "secondLikely",
        winner: "away",
        homeGoals: 1,
        awayGoals: 2,
        probability: 0.07,
      }),
      upset: Object.freeze({
        slot: "upset",
        winner: "home",
        homeGoals: 2,
        awayGoals: 1,
        probability: 0.05,
      }),
    }),
    rules: Object.freeze([
      Object.freeze({
        ruleName: "UNIT_TEST_AWAY_LEAN",
        status: "PASS",
        channel: "away+",
      }),
    ]),
    featureNames: Object.freeze(["homeTeam", "awayTeam", "kickoff"]),
    projectionModelVersion: "projection.unit-test.constructed",
    featureModelVersion: "feature.unit-test.constructed",
    ruleSetVersion: "rule.unit-test.constructed",
  });
}

function makeSeal(id) {
  const predictionSnapshot = snapshot(id);
  return Object.freeze({
    originalSealId: `unit-test-seal:${id}`,
    originalSealKind: "sealed_projection",
    originalSealSource: UNIT_TEST_CONSTRUCTED_SOURCE_AUTHORITY,
    originalSealChecksum: sha256CanonicalEvaluationJson(predictionSnapshot),
    checksumAlgorithm: "sha256",
    checksumCanonicalization: "fas-json-canonical.v1",
    checksumScope: "/predictionSnapshot",
    checksumPayload: predictionSnapshot,
    matchId: id,
    homeTeam: "Home FC",
    awayTeam: "Away FC",
    competitionId: "comp-unit-test",
    competitionName: "Unit Test Competition",
    season: "2025/26",
    kickoff: "2030-06-01T15:00:00.000Z",
    generatedAt: "2030-06-01T12:05:00.000Z",
    analysisTime: "2030-06-01T12:00:00.000Z",
    analysisCutoff: "2030-06-01T12:00:00.000Z",
    predictionSnapshot,
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

function makeActual(s) {
  const actual = createActualMatchResult({
    matchId: s.matchId,
    homeGoals: 2,
    awayGoals: 4,
    winner: "away",
    totalGoals: 6,
    competitionId: s.competitionId,
    competitionName: s.competitionName,
    matchStatus: "FINISHED",
    providerId: "unit-test:constructed",
    providerSourceId: `${s.matchId}:result`,
    providerMethod: "unit-test-constructed",
    observedAt: "2030-06-01T17:00:00.000Z",
  });
  return Object.freeze({
    actual,
    evidence: Object.freeze({
      id: `evidence-unit-test-${s.matchId}-match-result`,
      type: "MATCH_RESULT",
      quality: "verified",
      providerId: "unit-test:constructed",
      sourceId: `${s.matchId}:result`,
      method: "unit-test-constructed",
      matchId: s.matchId,
    }),
    realWorldVerification: true,
    verificationClass: "real-world",
    homeTeam: s.homeTeam,
    awayTeam: s.awayTeam,
    competitionId: s.competitionId,
    competitionName: s.competitionName,
    season: s.season,
    kickoff: s.kickoff,
  });
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const results = {};

try {
  await prisma.$queryRaw`SELECT 1`;
  results.ping = "OK";

  const realBefore = await prisma.evaluationHistoryItem.findMany({
    where: { matchId: REAL_MATCH },
    select: { historyId: true },
  });
  results.realFixtureHistoryCountBefore = realBefore.length;

  const lotteryIntake = await prisma.evaluationHistoryItem.findMany({
    where: { historyId: { startsWith: "eval-history-hi:prematch-seal:lottery:" } },
    select: { historyId: true, matchId: true },
  });
  results.lotteryIntakeHistoryCount = lotteryIntake.length;

  const repo = new PrismaEvaluationHistoryRepository(prisma);
  const s = makeSeal(matchId);
  const command = {
    seal: s,
    actual: makeActual(s),
    intakeRecordedAt: "2030-06-02T00:00:00.000Z",
  };
  const first = await ingestHistoricalEvaluation({
    command,
    historyRepository: repo,
  });
  if (first.status !== "accepted") {
    throw new Error(`ingest ${first.status} ${first.code ?? ""}`);
  }
  results.ingest = "accepted";
  results.schemaVersion = first.history.schemaVersion;
  results.evaluatedAt = first.history.evaluation.evaluatedAt;
  results.predictionGeneratedAt =
    first.history.intakeIntegrity.predictionGeneratedAt;
  results.resultVerifiedAt = first.history.intakeIntegrity.resultVerifiedAt;
  results.intakeRecordedAt = first.history.intakeIntegrity.intakeRecordedAt;
  results.winnerHit = first.history.evaluation.metrics.winnerHit;
  results.scoreHit = first.history.evaluation.metrics.scoreHit;
  results.sourceAuthority = first.history.intakeIntegrity.originalSealSource;
  results.historyIdPrefix = first.history.historyId.slice(0, 24);

  await prisma.$disconnect();

  const prisma2 = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  const repo2 = new PrismaEvaluationHistoryRepository(prisma2);
  const reloaded = await repo2.findByHistoryId(first.history.historyId);
  results.reloadSchema = reloaded?.schemaVersion;
  results.reloadChecksumMatch = reloaded?.checksum === first.history.checksum;
  results.reloadHasIntegrity = Boolean(
    reloaded &&
      "intakeIntegrity" in reloaded &&
      reloaded.intakeIntegrity.originalSealId,
  );
  const queried = await repo2.query({ matchId });
  results.queryCount = queried.length;

  const retry = await ingestHistoricalEvaluation({
    command,
    historyRepository: repo2,
  });
  results.retryStatus = retry.status;
  results.retrySameId =
    retry.status === "accepted" &&
    retry.history.historyId === first.history.historyId;
  results.retryRowCount = (await repo2.query({ matchId })).length;

  const conflict = await ingestHistoricalEvaluation({
    command: {
      ...command,
      actual: {
        ...command.actual,
        actual: createActualMatchResult({
          ...command.actual.actual,
          homeGoals: 0,
          awayGoals: 1,
          winner: "away",
          totalGoals: 1,
        }),
      },
    },
    historyRepository: repo2,
  });
  results.conflictStatus = conflict.status;
  results.conflictCode = conflict.status === "rejected" ? conflict.code : null;
  results.conflictRowCount = (await repo2.query({ matchId })).length;

  const poisonId = `${first.history.historyId}:future`;
  const poisonMatch = `${matchId}:future`;
  await repo2.save({
    ...first.history,
    historyId: poisonId,
    matchId: poisonMatch,
    schemaVersion: "evaluation-history.future.x",
  });
  let unknownFind = "NOT_THROWN";
  try {
    await repo2.findByHistoryId(poisonId);
  } catch (error) {
    unknownFind =
      error instanceof UnsupportedHistorySchemaVersionError
        ? "UNSUPPORTED_HISTORY_SCHEMA_VERSION"
        : error.name;
  }
  results.unknownFind = unknownFind;
  let unknownQuery = "NOT_THROWN";
  try {
    await repo2.query({ matchId: poisonMatch });
  } catch (error) {
    unknownQuery =
      error instanceof UnsupportedHistorySchemaVersionError
        ? "UNSUPPORTED_HISTORY_SCHEMA_VERSION"
        : error.name;
  }
  results.unknownQuery = unknownQuery;

  await prisma2.evaluationHistoryItem.deleteMany({
    where: {
      OR: [
        { matchId },
        { matchId: poisonMatch },
        { historyId: first.history.historyId },
        { historyId: poisonId },
      ],
    },
  });

  results.realFixtureHistoryCountAfter = (
    await prisma2.evaluationHistoryItem.findMany({
      where: { matchId: REAL_MATCH },
      select: { historyId: true },
    })
  ).length;
  results.reviewRowsLeft = (
    await prisma2.evaluationHistoryItem.findMany({
      where: { matchId: { startsWith: "unit-test:constructed:review:" } },
      select: { historyId: true },
    })
  ).length;

  await prisma2.$disconnect();

  let missingIntegrity = "NOT_THROWN";
  try {
    decodeEvaluationHistoryRecord({
      schemaVersion: EVALUATION_HISTORY_HISTORICAL_INTAKE_SCHEMA_VERSION,
      historyId: "x",
    });
  } catch (error) {
    missingIntegrity =
      error instanceof EvaluationHistoryValidationError
        ? "EvaluationHistoryValidationError"
        : error.name;
  }
  results.missingIntakeIntegrity = missingIntegrity;

  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  console.error(
    "REVIEW_SCRIPT_FAIL",
    error instanceof Error ? error.message : error,
  );
  try {
    await prisma.evaluationHistoryItem.deleteMany({
      where: { matchId: { startsWith: "unit-test:constructed:review:" } },
    });
    await prisma.$disconnect();
  } catch {
    // ignore cleanup failure
  }
  process.exit(1);
}
