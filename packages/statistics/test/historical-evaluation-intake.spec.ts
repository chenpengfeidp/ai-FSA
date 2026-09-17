import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  buildEvaluationHistoryRecord,
  createActualMatchResult,
  decodeEvaluationHistoryRecord,
  EVALUATION_HISTORY_HISTORICAL_INTAKE_SCHEMA_VERSION,
  EVALUATION_HISTORY_SCHEMA_VERSION,
  evaluatePrediction,
  ingestHistoricalEvaluation,
  InMemoryEvaluationHistoryRepository,
  InMemoryProjectionReplaySidecarRepository,
  parseEvaluationJsonRejectingDuplicateKeys,
  PREMATCH_SEAL_ALLOWED_USAGE_HISTORICAL_INTAKE,
  sha256CanonicalEvaluationJson,
  UNIT_TEST_CONSTRUCTED_SOURCE_AUTHORITY,
  UnsupportedHistorySchemaVersionError,
  type HistoricalEvaluationIntakeCommand,
  type HistoricalPredictionSeal,
  type SealedPredictionInput,
  type SealedProjectionReplayContext,
  type VerifiedRealWorldActual,
} from "../src/index.js";

const FIXTURE_DIRECTORY = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "controlled-prematch-conformance-v1",
);

const KICKOFF = "2030-06-01T15:00:00.000Z";
const ANALYSIS_TIME = "2030-06-01T12:00:00.000Z";
const GENERATED_AT = "2030-06-01T12:05:00.000Z";
const OBSERVED_AT = "2030-06-01T17:00:00.000Z";
const INTAKE_RECORDED_AT = "2030-06-02T00:00:00.000Z";

function predictionSnapshot(matchId: string): SealedPredictionInput {
  return Object.freeze({
    matchId,
    projectionChecksum: `proj:${matchId}`,
    projectionStatus: "completed_nonempty",
    pHome: 0.26,
    pDraw: 0.164,
    pAway: 0.576,
    topScorelines: Object.freeze([
      Object.freeze({ homeGoals: 3, awayGoals: 3, probability: 0.08 }),
      Object.freeze({ homeGoals: 2, awayGoals: 4, probability: 0.046 }),
    ]),
    goalRange: Object.freeze({
      range01: 0.02,
      range23: 0.062,
      range4Plus: 0.918,
    }),
    predictionConfidence: 74,
    confidenceBand: "high",
    scenarios: Object.freeze({
      mostLikely: Object.freeze({
        slot: "mostLikely" as const,
        winner: "draw" as const,
        homeGoals: 3,
        awayGoals: 3,
        probability: 0.08,
      }),
      secondLikely: Object.freeze({
        slot: "secondLikely" as const,
        winner: "away" as const,
        homeGoals: 1,
        awayGoals: 2,
        probability: 0.07,
      }),
      upset: Object.freeze({
        slot: "upset" as const,
        winner: "home" as const,
        homeGoals: 2,
        awayGoals: 1,
        probability: 0.05,
      }),
    }),
    rules: Object.freeze([
      Object.freeze({
        ruleName: "UNIT_TEST_AWAY_LEAN",
        status: "PASS" as const,
        channel: "away+" as const,
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

function constructedSeal(
  overrides: Partial<HistoricalPredictionSeal> = {},
): HistoricalPredictionSeal {
  const matchId = overrides.matchId ?? "unit-test:constructed:match-1";
  const snapshot = overrides.predictionSnapshot ?? predictionSnapshot(matchId);
  const checksumPayload = overrides.checksumPayload ?? snapshot;
  const originalSealChecksum =
    overrides.originalSealChecksum ?? sha256CanonicalEvaluationJson(checksumPayload);

  return Object.freeze({
    originalSealId: overrides.originalSealId ?? `unit-test-seal:${matchId}`,
    originalSealKind: "sealed_projection",
    originalSealSource:
      overrides.originalSealSource ?? UNIT_TEST_CONSTRUCTED_SOURCE_AUTHORITY,
    originalSealChecksum,
    checksumAlgorithm: overrides.checksumAlgorithm ?? "sha256",
    checksumCanonicalization:
      overrides.checksumCanonicalization ?? "fas-json-canonical.v1",
    checksumScope: overrides.checksumScope ?? "/predictionSnapshot",
    checksumPayload,
    matchId,
    homeTeam: overrides.homeTeam ?? "Home FC",
    awayTeam: overrides.awayTeam ?? "Away FC",
    competitionId: overrides.competitionId ?? "comp-unit-test",
    competitionName: overrides.competitionName ?? "Unit Test Competition",
    season: overrides.season ?? "2025/26",
    kickoff: overrides.kickoff ?? KICKOFF,
    generatedAt: overrides.generatedAt ?? GENERATED_AT,
    analysisTime: overrides.analysisTime ?? ANALYSIS_TIME,
    analysisCutoff: overrides.analysisCutoff ?? ANALYSIS_TIME,
    predictionSnapshot: snapshot,
    featureModelVersion:
      overrides.featureModelVersion ?? "feature.unit-test.constructed",
    ruleSetVersion: overrides.ruleSetVersion ?? "rule.unit-test.constructed",
    projectionModelVersion:
      overrides.projectionModelVersion ?? "projection.unit-test.constructed",
    historicalAuthenticity: overrides.historicalAuthenticity ?? true,
    synthetic: overrides.synthetic ?? false,
    provenanceClass: overrides.provenanceClass ?? "A",
    allowedUsage:
      overrides.allowedUsage ??
      Object.freeze([PREMATCH_SEAL_ALLOWED_USAGE_HISTORICAL_INTAKE]),
    sourceAuthority:
      overrides.sourceAuthority ?? UNIT_TEST_CONSTRUCTED_SOURCE_AUTHORITY,
    ...(overrides.reconstructed === undefined
      ? {}
      : { reconstructed: overrides.reconstructed }),
    ...(overrides.generatedByCurrentAnalysisPipeline === undefined
      ? {}
      : {
          generatedByCurrentAnalysisPipeline:
            overrides.generatedByCurrentAnalysisPipeline,
        }),
    ...(overrides.observations === undefined
      ? {}
      : { observations: overrides.observations }),
    ...(overrides.projectionPolicyPin === undefined
      ? {}
      : { projectionPolicyPin: overrides.projectionPolicyPin }),
  });
}

function constructedActual(
  seal: HistoricalPredictionSeal,
  overrides: Partial<VerifiedRealWorldActual> & {
    readonly homeGoals?: number;
    readonly awayGoals?: number;
    readonly observedAt?: string;
    readonly matchStatus?: "FINISHED";
  } = {},
): VerifiedRealWorldActual {
  const homeGoals = overrides.homeGoals ?? 2;
  const awayGoals = overrides.awayGoals ?? 4;
  const winner =
    homeGoals > awayGoals ? "home" : homeGoals < awayGoals ? "away" : "draw";
  const actual = createActualMatchResult({
    matchId: seal.matchId,
    homeGoals,
    awayGoals,
    winner,
    totalGoals: homeGoals + awayGoals,
    competitionId: seal.competitionId,
    competitionName: seal.competitionName,
    matchStatus: "FINISHED",
    providerId: "unit-test:constructed",
    providerSourceId: `${seal.matchId}:result`,
    providerMethod: "unit-test-constructed",
    observedAt: overrides.observedAt ?? OBSERVED_AT,
  });

  return Object.freeze({
    actual,
    evidence: Object.freeze({
      id: `evidence-unit-test-${seal.matchId}-match-result`,
      type: "MATCH_RESULT",
      quality: "verified",
      providerId: "unit-test:constructed",
      sourceId: `${seal.matchId}:result`,
      method: "unit-test-constructed",
      matchId: seal.matchId,
      collectedAt: overrides.observedAt ?? OBSERVED_AT,
    }),
    realWorldVerification: overrides.realWorldVerification ?? true,
    verificationClass: overrides.verificationClass ?? "real-world",
    homeTeam: overrides.homeTeam ?? seal.homeTeam,
    awayTeam: overrides.awayTeam ?? seal.awayTeam,
    competitionId: overrides.competitionId ?? seal.competitionId,
    competitionName: overrides.competitionName ?? seal.competitionName,
    season: overrides.season ?? seal.season,
    kickoff: overrides.kickoff ?? seal.kickoff,
  });
}

function commandFrom(
  seal: HistoricalPredictionSeal = constructedSeal(),
  actual: VerifiedRealWorldActual = constructedActual(seal),
): HistoricalEvaluationIntakeCommand {
  return Object.freeze({
    seal,
    actual,
    intakeRecordedAt: INTAKE_RECORDED_AT,
  });
}

function sampleSidecar(matchId: string): SealedProjectionReplayContext {
  return Object.freeze({
    matchId,
    featureModelVersion: "feature.unit-test.constructed",
    featureBundleChecksum: "fb-unit-test",
    featureBundleStatus: "completed_nonempty",
    evidenceRefs: Object.freeze(["ev-unit-1"]),
    features: Object.freeze([
      Object.freeze({ name: "attackRatingHome", value: 1.1 }),
    ]),
    rules: Object.freeze([
      Object.freeze({
        ruleId: "rule-unit",
        ruleName: "UNIT_TEST_AWAY_LEAN",
        status: "PASS" as const,
        channel: "away+" as const,
        weight: 1,
        score: 0.3,
      }),
    ]),
    requiredEvidencePresentCount: 5,
    generatedAt: GENERATED_AT,
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

describe("Historical Evaluation Intake (bounded A1 library)", () => {
  it("T01 accepts a constructed Class A double and writes historical-intake History", async () => {
    const historyRepository = new InMemoryEvaluationHistoryRepository();
    const result = await ingestHistoricalEvaluation({
      command: commandFrom(),
      historyRepository,
    });

    expect(result.status).toBe("accepted");
    if (result.status !== "accepted") {
      return;
    }

    expect(result.history.schemaVersion).toBe(
      EVALUATION_HISTORY_HISTORICAL_INTAKE_SCHEMA_VERSION,
    );
    expect(result.history.evaluation.status).toBe("scored");
    expect(result.history.evaluation.evaluatedAt).toBe(GENERATED_AT);
    expect(result.history.evaluation.metrics?.winnerHit).toBe(true);
    expect(result.history.evaluation.metrics?.scoreHit).toBe(false);
    expect(result.history.intakeIntegrity.calibrationEligible).toBe(false);
    expect(result.history.intakeIntegrity.validationEligible).toBe(false);
    expect(result.history.intakeIntegrity.contributionEligible).toBe(false);
    expect(result.history.intakeIntegrity.replayCohortEligible).toBe(false);
    expect(result.history.intakeIntegrity.replayComplete).toBe(false);
    expect(result.history.intakeIntegrity.replayEligible).toBe(false);
    expect(result.history.intakeIntegrity.replayReasons).toContain(
      "MISSING_SIDECAR",
    );
    expect(result.history.intakeIntegrity.originalSealId).toContain(
      "unit-test-seal:",
    );
    expect(result.history.intakeIntegrity.resultEvidenceId).toContain(
      "match-result",
    );
    expect(result.sidecarSaved).toBe(false);
  });

  it("T02 rejects an invalid seal checksum", async () => {
    const historyRepository = new InMemoryEvaluationHistoryRepository();
    const result = await ingestHistoricalEvaluation({
      command: commandFrom(
        constructedSeal({ originalSealChecksum: "0".repeat(64) }),
      ),
      historyRepository,
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "INVALID_SEAL_CHECKSUM",
    });
    expect(await historyRepository.query({})).toEqual([]);
  });

  it("T03 rejects an unsupported checksum algorithm", async () => {
    const result = await ingestHistoricalEvaluation({
      command: commandFrom(constructedSeal({ checksumAlgorithm: "md5" })),
      historyRepository: new InMemoryEvaluationHistoryRepository(),
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "UNSUPPORTED_CHECKSUM_ALGORITHM",
    });
  });

  it("T04 rejects unsupported canonicalization", async () => {
    const result = await ingestHistoricalEvaluation({
      command: commandFrom(
        constructedSeal({ checksumCanonicalization: "json.stringify" }),
      ),
      historyRepository: new InMemoryEvaluationHistoryRepository(),
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "UNSUPPORTED_CANONICALIZATION",
    });
  });

  it("T05 rejects fixture identity mismatch", async () => {
    const seal = constructedSeal();
    const actual = constructedActual(seal);
    const mismatched = Object.freeze({
      ...actual,
      actual: createActualMatchResult({
        ...actual.actual,
        matchId: "other-match",
      }),
      evidence: Object.freeze({ ...actual.evidence, matchId: "other-match" }),
    });
    const result = await ingestHistoricalEvaluation({
      command: commandFrom(seal, mismatched),
      historyRepository: new InMemoryEvaluationHistoryRepository(),
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "FIXTURE_IDENTITY_MISMATCH",
    });
  });

  it("T06 rejects home/away orientation mismatch", async () => {
    const seal = constructedSeal();
    const result = await ingestHistoricalEvaluation({
      command: commandFrom(
        seal,
        constructedActual(seal, {
          homeTeam: seal.awayTeam,
          awayTeam: seal.homeTeam,
        }),
      ),
      historyRepository: new InMemoryEvaluationHistoryRepository(),
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "HOME_AWAY_ORIENTATION_MISMATCH",
    });
  });

  it("T07 rejects generatedAt at or after kickoff", async () => {
    const result = await ingestHistoricalEvaluation({
      command: commandFrom(constructedSeal({ generatedAt: KICKOFF })),
      historyRepository: new InMemoryEvaluationHistoryRepository(),
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "GENERATED_AT_NOT_PRE_MATCH",
    });
  });

  it("T08 rejects analysisTime at or after kickoff", async () => {
    const result = await ingestHistoricalEvaluation({
      command: commandFrom(
        constructedSeal({
          analysisTime: KICKOFF,
          analysisCutoff: KICKOFF,
        }),
      ),
      historyRepository: new InMemoryEvaluationHistoryRepository(),
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "ANALYSIS_TIME_NOT_PRE_MATCH",
    });
  });

  it("T09 rejects invalid analysisCutoff", async () => {
    const result = await ingestHistoricalEvaluation({
      command: commandFrom(
        constructedSeal({ analysisCutoff: "2030-06-01T12:30:00.000Z" }),
      ),
      historyRepository: new InMemoryEvaluationHistoryRepository(),
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "INVALID_ANALYSIS_CUTOFF",
    });
  });

  it("T10 rejects post-match leakage on the seal", async () => {
    const result = await ingestHistoricalEvaluation({
      command: commandFrom(
        constructedSeal({
          observations: Object.freeze([
            Object.freeze({ type: "ODDS", collectedAt: KICKOFF }),
          ]),
        }),
      ),
      historyRepository: new InMemoryEvaluationHistoryRepository(),
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "POST_MATCH_LEAKAGE",
    });
  });

  it("T11 rejects Actual that is not FINISHED", async () => {
    const seal = constructedSeal();
    const finished = constructedActual(seal);
    const result = await ingestHistoricalEvaluation({
      command: commandFrom(seal, {
        ...finished,
        actual: {
          ...finished.actual,
          matchStatus: "LIVE" as unknown as "FINISHED",
        },
      }),
      historyRepository: new InMemoryEvaluationHistoryRepository(),
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "ACTUAL_NOT_FINISHED",
    });
  });

  it("T12 rejects Actual that is not real-world verified", async () => {
    const seal = constructedSeal();
    const result = await ingestHistoricalEvaluation({
      command: commandFrom(
        seal,
        constructedActual(seal, {
          realWorldVerification: false,
          verificationClass: "controlled-fixture-only",
        }),
      ),
      historyRepository: new InMemoryEvaluationHistoryRepository(),
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "ACTUAL_NOT_REAL_WORLD_VERIFIED",
    });
  });

  it("T13 rejects Actual fixture mismatch", async () => {
    const seal = constructedSeal();
    const result = await ingestHistoricalEvaluation({
      command: commandFrom(seal, constructedActual(seal, { season: "2019/20" })),
      historyRepository: new InMemoryEvaluationHistoryRepository(),
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "ACTUAL_FIXTURE_MISMATCH",
    });
  });

  it("T14 rejects Actual observed at or before kickoff", async () => {
    const seal = constructedSeal();
    const result = await ingestHistoricalEvaluation({
      command: commandFrom(seal, constructedActual(seal, { observedAt: KICKOFF })),
      historyRepository: new InMemoryEvaluationHistoryRepository(),
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "ACTUAL_OBSERVED_NOT_AFTER_KICKOFF",
    });
  });

  it("T15 rejects Class B controlled fixture files as production intake", async () => {
    const predictionSeal = JSON.parse(
      readFileSync(join(FIXTURE_DIRECTORY, "prediction-seal.json"), "utf8"),
    ) as {
      sealPayload: {
        classification: {
          synthetic: boolean;
          historicalAuthenticity: boolean;
          provenanceClass: string;
          allowedUsage: string;
        };
        fixtureIdentity: {
          matchId: string;
          homeTeam: string;
          awayTeam: string;
          competitionId: string;
          competitionName: string;
          season: string;
          kickoff: string;
        };
        temporal: {
          analysisTime: string;
          analysisCutoff: string;
          generatedAt: string;
        };
        lineage: {
          featureModelVersion: string;
          ruleSetVersion: string;
          projectionModelVersion: string;
        };
        prediction: SealedPredictionInput;
      };
    };
    const verifiedActual = JSON.parse(
      readFileSync(join(FIXTURE_DIRECTORY, "verified-actual.json"), "utf8"),
    ) as {
      actualPayload: {
        verification: {
          verificationClass: string;
          realWorldVerification: boolean;
        };
        evidence: {
          id: string;
          type: string;
          quality: string;
          providerId: string;
          sourceId: string;
          provenance: { method: string };
          matchId: string;
          payload: {
            homeGoals: number;
            awayGoals: number;
            winner: "home" | "draw" | "away";
            totalGoals: number;
            observedAt: string;
          };
        };
      };
    };

    const payload = predictionSeal.sealPayload;
    const historyRepository = new InMemoryEvaluationHistoryRepository();
    const result = await ingestHistoricalEvaluation({
      command: {
        seal: constructedSeal({
          matchId: payload.fixtureIdentity.matchId,
          predictionSnapshot: payload.prediction,
          homeTeam: payload.fixtureIdentity.homeTeam,
          awayTeam: payload.fixtureIdentity.awayTeam,
          competitionId: payload.fixtureIdentity.competitionId,
          competitionName: payload.fixtureIdentity.competitionName,
          season: payload.fixtureIdentity.season,
          kickoff: payload.fixtureIdentity.kickoff,
          analysisTime: payload.temporal.analysisTime,
          analysisCutoff: payload.temporal.analysisCutoff,
          generatedAt: payload.temporal.generatedAt,
          featureModelVersion: payload.lineage.featureModelVersion,
          ruleSetVersion: payload.lineage.ruleSetVersion,
          projectionModelVersion: payload.lineage.projectionModelVersion,
          synthetic: payload.classification.synthetic,
          historicalAuthenticity: payload.classification.historicalAuthenticity,
          provenanceClass: payload.classification.provenanceClass,
          allowedUsage: Object.freeze([payload.classification.allowedUsage]),
        }),
        actual: constructedActual(constructedSeal(), {
          realWorldVerification:
            verifiedActual.actualPayload.verification.realWorldVerification,
          verificationClass:
            verifiedActual.actualPayload.verification.verificationClass,
        }),
        intakeRecordedAt: INTAKE_RECORDED_AT,
      },
      historyRepository,
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "SYNTHETIC_FIXTURE_REJECTED",
    });
    expect(await historyRepository.query({})).toHaveLength(0);
  });

  it("T16 rejects retrospective reconstruction", async () => {
    const result = await ingestHistoricalEvaluation({
      command: commandFrom(constructedSeal({ reconstructed: true })),
      historyRepository: new InMemoryEvaluationHistoryRepository(),
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "RETROSPECTIVE_RECONSTRUCTION",
    });
  });

  it("T17 is idempotent for an exact retry", async () => {
    const historyRepository = new InMemoryEvaluationHistoryRepository();
    const first = await ingestHistoricalEvaluation({
      command: commandFrom(),
      historyRepository,
    });
    const second = await ingestHistoricalEvaluation({
      command: commandFrom(),
      historyRepository,
    });

    expect(first.status).toBe("accepted");
    expect(second.status).toBe("accepted");
    if (first.status !== "accepted" || second.status !== "accepted") {
      return;
    }

    expect(second.history.historyId).toBe(first.history.historyId);
    expect(second.history.checksum).toBe(first.history.checksum);
    expect(await historyRepository.query({})).toHaveLength(1);
  });

  it("T18 stores two History rows for the same match with different seals", async () => {
    const historyRepository = new InMemoryEvaluationHistoryRepository();
    const firstSeal = constructedSeal({ originalSealId: "unit-test-seal:a" });
    const secondSeal = constructedSeal({ originalSealId: "unit-test-seal:b" });
    const first = await ingestHistoricalEvaluation({
      command: commandFrom(firstSeal),
      historyRepository,
    });
    const second = await ingestHistoricalEvaluation({
      command: commandFrom(secondSeal),
      historyRepository,
    });

    expect(first.status).toBe("accepted");
    expect(second.status).toBe("accepted");
    expect(await historyRepository.findByMatch(firstSeal.matchId)).toHaveLength(2);
  });

  it("T19 rejects a conflicting Actual for the same seal", async () => {
    const historyRepository = new InMemoryEvaluationHistoryRepository();
    const seal = constructedSeal();
    const first = await ingestHistoricalEvaluation({
      command: commandFrom(
        seal,
        constructedActual(seal, { homeGoals: 2, awayGoals: 4 }),
      ),
      historyRepository,
    });
    const second = await ingestHistoricalEvaluation({
      command: commandFrom(
        seal,
        constructedActual(seal, { homeGoals: 0, awayGoals: 1 }),
      ),
      historyRepository,
    });

    expect(first.status).toBe("accepted");
    expect(second).toMatchObject({
      status: "rejected",
      code: "CONFLICTING_ACTUAL",
    });
    expect(await historyRepository.query({})).toHaveLength(1);
  });

  it("T20 round-trips legacy a15 without implying intake verification", () => {
    const record = a15History();
    const revived = decodeEvaluationHistoryRecord(
      JSON.parse(JSON.stringify(record)),
    );

    expect(record.schemaVersion).toBe(EVALUATION_HISTORY_SCHEMA_VERSION);
    expect(revived?.schemaVersion).toBe(EVALUATION_HISTORY_SCHEMA_VERSION);
    expect(revived).toEqual(record);
    expect(
      revived && "intakeIntegrity" in revived ? revived.intakeIntegrity : undefined,
    ).toBeUndefined();
  });

  it("T21 restores historical-intake.v1 including intakeIntegrity", async () => {
    const result = await ingestHistoricalEvaluation({
      command: commandFrom(),
      historyRepository: new InMemoryEvaluationHistoryRepository(),
    });
    expect(result.status).toBe("accepted");
    if (result.status !== "accepted") {
      return;
    }

    const revived = decodeEvaluationHistoryRecord(
      JSON.parse(JSON.stringify(result.history)),
    );
    expect(revived?.schemaVersion).toBe(
      EVALUATION_HISTORY_HISTORICAL_INTAKE_SCHEMA_VERSION,
    );
    expect(revived).toEqual(result.history);
  });

  it("T22 fails closed on an unsupported History schema version", () => {
    expect(() =>
      decodeEvaluationHistoryRecord({
        schemaVersion: "evaluation-history.future.x",
        historyId: "x",
      }),
    ).toThrow(UnsupportedHistorySchemaVersionError);
  });

  it("T24 allows outcome History without fabricating a sidecar", async () => {
    const result = await ingestHistoricalEvaluation({
      command: commandFrom(),
      historyRepository: new InMemoryEvaluationHistoryRepository(),
    });
    expect(result.status).toBe("accepted");
    if (result.status !== "accepted") {
      return;
    }

    expect(result.sidecarSaved).toBe(false);
    expect(result.history.intakeIntegrity.replayReasons).toContain(
      "MISSING_SIDECAR",
    );
  });

  it("T25 does not persist an invalid sidecar and still writes History", async () => {
    const historyRepository = new InMemoryEvaluationHistoryRepository();
    const sidecarRepository = new InMemoryProjectionReplaySidecarRepository();
    const seal = constructedSeal();
    const result = await ingestHistoricalEvaluation({
      command: {
        ...commandFrom(seal),
        replaySidecar: {
          context: sampleSidecar("other-match"),
          contentSha256: "deadbeef",
        },
      },
      historyRepository,
      sidecarRepository,
    });

    expect(result.status).toBe("accepted");
    if (result.status !== "accepted") {
      return;
    }

    expect(result.sidecarSaved).toBe(false);
    expect(result.sidecarFailureCode).toBe("INVALID_REPLAY_PROVENANCE");
    expect(result.history.intakeIntegrity.replayEligible).toBe(false);
    expect(
      await sidecarRepository.findByHistoryId(result.history.historyId),
    ).toBeUndefined();
  });

  it("rejects duplicate JSON keys at the production ingest parser boundary", () => {
    expect(() => parseEvaluationJsonRejectingDuplicateKeys('{"a":1,"a":2}')).toThrow(
      /Duplicate JSON key/,
    );
  });

  it("does not redefine scoreHit as top-K coverage", async () => {
    const result = await ingestHistoricalEvaluation({
      command: commandFrom(),
      historyRepository: new InMemoryEvaluationHistoryRepository(),
    });
    expect(result.status).toBe("accepted");
    if (result.status !== "accepted") {
      return;
    }

    expect(result.history.predictionSnapshot.topScorelines[1]).toMatchObject({
      homeGoals: 2,
      awayGoals: 4,
    });
    expect(result.history.actualResult).toMatchObject({
      homeGoals: 2,
      awayGoals: 4,
    });
    expect(result.history.evaluation.metrics?.scoreHit).toBe(false);
  });
});
