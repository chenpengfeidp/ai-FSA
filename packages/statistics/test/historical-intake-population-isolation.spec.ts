import { describe, expect, it } from "vitest";

import {
  buildEvaluationHistoryRecord,
  computeContributionReport,
  computePredictionCalibrationReport,
  computeValidationReport,
  createActualMatchResult,
  createDefaultReplayCohortSpecification,
  EVALUATION_HISTORY_HISTORICAL_INTAKE_SCHEMA_VERSION,
  EVALUATION_HISTORY_SCHEMA_VERSION,
  evaluatePrediction,
  ingestHistoricalEvaluation,
  InMemoryEvaluationHistoryRepository,
  PREMATCH_SEAL_ALLOWED_USAGE_HISTORICAL_INTAKE,
  selectReplayCohortMembers,
  sha256CanonicalEvaluationJson,
  UNIT_TEST_CONSTRUCTED_SOURCE_AUTHORITY,
  type HistoricalPredictionSeal,
  type SealedPredictionInput,
} from "../src/index.js";

const KICKOFF = "2030-06-01T15:00:00.000Z";
const ANALYSIS_TIME = "2030-06-01T12:00:00.000Z";
const GENERATED_AT = "2030-06-01T12:05:00.000Z";
const OBSERVED_AT = "2030-06-01T17:00:00.000Z";

function predictionSnapshot(matchId: string): SealedPredictionInput {
  return Object.freeze({
    matchId,
    projectionChecksum: `proj:${matchId}`,
    projectionStatus: "completed_nonempty",
    pHome: 0.5,
    pDraw: 0.3,
    pAway: 0.2,
    topScorelines: Object.freeze([
      Object.freeze({ homeGoals: 1, awayGoals: 0, probability: 0.12 }),
    ]),
    goalRange: Object.freeze({ range01: 0.3, range23: 0.45, range4Plus: 0.25 }),
    predictionConfidence: 70,
    confidenceBand: "high",
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
    featureNames: Object.freeze([
      "homeTeam",
      "awayTeam",
      "kickoff",
      "homeAdvantage",
      "attackRatingHome",
      "attackRatingAway",
      "defenseRatingHome",
      "defenseRatingAway",
      "momentumHome",
      "momentumAway",
      "recentFormHome",
      "recentFormAway",
    ]),
    projectionModelVersion: "projection.unit-test.constructed",
    featureModelVersion: "feature.unit-test.constructed",
    ruleSetVersion: "rule.unit-test.constructed",
  });
}

function constructedSeal(): HistoricalPredictionSeal {
  const matchId = "unit-test:constructed:isolation";
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
    kickoff: KICKOFF,
    generatedAt: GENERATED_AT,
    analysisTime: ANALYSIS_TIME,
    analysisCutoff: ANALYSIS_TIME,
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

function a15History() {
  const prediction = predictionSnapshot("match-a15-isolation");
  const actual = createActualMatchResult({
    matchId: prediction.matchId,
    homeGoals: 1,
    awayGoals: 0,
    winner: "home",
    totalGoals: 1,
    matchStatus: "FINISHED",
    providerId: "football:demo",
    providerSourceId: "demo:a15",
    providerMethod: "recorded-snapshot",
    observedAt: "2026-07-19T12:00:00.000Z",
  });
  const evaluation = evaluatePrediction({
    prediction,
    actual,
    evaluatedAt: "2026-07-19T13:00:00.000Z",
  });

  return buildEvaluationHistoryRecord({
    predictionSnapshot: prediction,
    actualResult: actual,
    evaluation,
    homeTeam: "Home FC",
    awayTeam: "Away FC",
    matchDate: "2026-07-19T10:30:00.000Z",
    recordedAt: "2026-07-19T13:00:00.000Z",
  });
}

describe("Historical intake population isolation (T26)", () => {
  it("keeps a15 live/demo path and excludes default-ineligible intake rows", async () => {
    const seal = constructedSeal();
    const actualResult = createActualMatchResult({
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
      observedAt: OBSERVED_AT,
    });
    const intakeResult = await ingestHistoricalEvaluation({
      command: {
        seal,
        actual: {
          actual: actualResult,
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
      historyRepository: new InMemoryEvaluationHistoryRepository(),
    });

    expect(intakeResult.status).toBe("accepted");
    if (intakeResult.status !== "accepted") {
      return;
    }

    expect(intakeResult.history.schemaVersion).toBe(
      EVALUATION_HISTORY_HISTORICAL_INTAKE_SCHEMA_VERSION,
    );
    expect(intakeResult.history.intakeIntegrity.calibrationEligible).toBe(false);

    const a15 = a15History();
    const mixed = Object.freeze([a15, intakeResult.history]);
    const computedAt = "2030-06-03T00:00:00.000Z";

    const calibration = computePredictionCalibrationReport({
      records: mixed,
      computedAt,
    });
    const validation = computeValidationReport({ records: mixed, computedAt });
    const contribution = computeContributionReport({ records: mixed, computedAt });
    const cohort = selectReplayCohortMembers({
      histories: mixed,
      sidecarsByHistoryId: new Map(),
      specification: createDefaultReplayCohortSpecification({
        sidecarSchemaVersion: "projection-replay-sidecar.p2k.b",
      }),
    });

    expect(calibration.sampleSize).toBe(1);
    expect(calibration.provenance.evaluationHistorySchemaVersions).toEqual([
      EVALUATION_HISTORY_SCHEMA_VERSION,
    ]);
    expect(validation.totalSampleSize).toBe(1);
    expect(validation.provenance.evaluationHistorySchemaVersions).toEqual([
      EVALUATION_HISTORY_SCHEMA_VERSION,
    ]);
    expect(contribution.totalSampleSize).toBe(1);
    expect(contribution.provenance.evaluationHistorySchemaVersions).toEqual([
      EVALUATION_HISTORY_SCHEMA_VERSION,
    ]);
    expect(cohort.members).toHaveLength(0);
    expect(cohort.rejectedHistoryIds).toContain(intakeResult.history.historyId);
  });
});
