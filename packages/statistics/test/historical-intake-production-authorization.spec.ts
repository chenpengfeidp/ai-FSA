import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import {
  HISTORICAL_INTAKE_PRODUCTION_AUTHORIZATION_SCHEMA_VERSION,
  HistoricalIntakeAuthorizationPolicyError,
} from "../src/domain/historical-intake-production-authorization.js";
import { assertHistoricalIntakeProductionAuthorization } from "../src/evaluation/assert-historical-intake-production-authorization.js";
import { createHistoricalIntakeAuthorization } from "../src/evaluation/create-historical-intake-authorization.js";
import { PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY } from "../src/evaluation/historical-intake-production-authorization.v1.js";
import {
  createActualMatchResult,
  ingestHistoricalEvaluation,
  InMemoryEvaluationHistoryRepository,
  PREMATCH_SEAL_ALLOWED_USAGE_HISTORICAL_INTAKE,
  sha256CanonicalEvaluationJson,
  UNIT_TEST_CONSTRUCTED_SOURCE_AUTHORITY,
  type EvaluationHistoryRecord,
  type HistoricalPredictionSeal,
  type IngestHistoricalEvaluationInput,
  type SealedPredictionInput,
  type VerifiedRealWorldActual,
} from "../src/index.js";
import * as statisticsPublicApi from "../src/index.js";
import {
  constructedHistoricalIntakeAuthorizationPolicy,
  ingestHistoricalEvaluationForTest,
  UNIT_TEST_CONSTRUCTED_ADMISSION_REVIEW_ID,
} from "./helpers/ingest-historical-evaluation-for-test.js";

const KICKOFF = "2030-06-01T15:00:00.000Z";
const ANALYSIS_TIME = "2030-06-01T12:00:00.000Z";
const GENERATED_AT = "2030-06-01T12:05:00.000Z";
const OBSERVED_AT = "2030-06-01T17:00:00.000Z";
const INTAKE_RECORDED_AT = "2030-06-02T00:00:00.000Z";
const PACKAGE_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), "..");

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
    ]),
    goalRange: Object.freeze({ range01: 0.2, range23: 0.5, range4Plus: 0.3 }),
    predictionConfidence: 62,
    confidenceBand: "medium",
    scenarios: Object.freeze({
      mostLikely: Object.freeze({
        slot: "mostLikely" as const,
        winner: "away" as const,
        homeGoals: 1,
        awayGoals: 2,
        probability: 0.22,
      }),
      secondLikely: Object.freeze({
        slot: "secondLikely" as const,
        winner: "draw" as const,
        homeGoals: 1,
        awayGoals: 1,
        probability: 0.16,
      }),
      upset: Object.freeze({
        slot: "upset" as const,
        winner: "home" as const,
        homeGoals: 2,
        awayGoals: 1,
        probability: 0.1,
      }),
    }),
    rules: Object.freeze([
      Object.freeze({
        ruleName: "UNIT_TEST_AWAY_LEAN",
        status: "PASS" as const,
        channel: "away+" as const,
      }),
    ]),
    featureNames: Object.freeze(["homeTeam", "awayTeam", "kickoff"]),
    projectionModelVersion: "projection.unit-test.constructed",
    featureModelVersion: "feature.unit-test.constructed",
    ruleSetVersion: "rule.unit-test.constructed",
  });
}

function constructedSeal(
  overrides: Partial<HistoricalPredictionSeal> = {},
): HistoricalPredictionSeal {
  const matchId = overrides.matchId ?? "unit-test:constructed:auth-1";
  const snapshot = overrides.predictionSnapshot ?? predictionSnapshot(matchId);
  const checksumPayload = overrides.checksumPayload ?? snapshot;
  const originalSealChecksum =
    overrides.originalSealChecksum ?? sha256CanonicalEvaluationJson(checksumPayload);

  return Object.freeze({
    originalSealId: overrides.originalSealId ?? `unit-test-seal:${matchId}`,
    originalSealKind: "sealed_projection",
    originalSealSource: UNIT_TEST_CONSTRUCTED_SOURCE_AUTHORITY,
    originalSealChecksum,
    checksumAlgorithm: "sha256",
    checksumCanonicalization: "fas-json-canonical.v1",
    checksumScope: "/predictionSnapshot",
    checksumPayload,
    matchId,
    homeTeam: overrides.homeTeam ?? "Home FC",
    awayTeam: overrides.awayTeam ?? "Away FC",
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

function constructedActual(
  seal: HistoricalPredictionSeal,
  evidenceId?: string,
): VerifiedRealWorldActual {
  const actual = createActualMatchResult({
    matchId: seal.matchId,
    homeGoals: 2,
    awayGoals: 4,
    winner: "away",
    totalGoals: 6,
    competitionId: seal.competitionId,
    competitionName: seal.competitionName,
    matchStatus: "FINISHED",
    providerId: "unit-test:constructed",
    providerSourceId: `${seal.matchId}:result`,
    providerMethod: "unit-test-constructed",
    observedAt: OBSERVED_AT,
  });

  return Object.freeze({
    actual,
    evidence: Object.freeze({
      id: evidenceId ?? `evidence-unit-test-${seal.matchId}-match-result`,
      type: "MATCH_RESULT",
      quality: "verified",
      providerId: "unit-test:constructed",
      sourceId: `${seal.matchId}:result`,
      method: "unit-test-constructed",
      matchId: seal.matchId,
    }),
    realWorldVerification: true,
    verificationClass: "real-world",
    homeTeam: seal.homeTeam,
    awayTeam: seal.awayTeam,
    competitionId: seal.competitionId,
    competitionName: seal.competitionName,
    season: seal.season,
    kickoff: seal.kickoff,
  });
}

function commandOf(
  seal: HistoricalPredictionSeal,
  actual: VerifiedRealWorldActual,
): IngestHistoricalEvaluationInput["command"] {
  return Object.freeze({
    seal,
    actual,
    intakeRecordedAt: INTAKE_RECORDED_AT,
  });
}

function spyRepository(): InMemoryEvaluationHistoryRepository & {
  saveCalls: number;
} {
  const inner = new InMemoryEvaluationHistoryRepository();
  const wrapped = {
    saveCalls: 0,
    async save(record: EvaluationHistoryRecord) {
      wrapped.saveCalls += 1;
      return inner.save(record);
    },
    findByHistoryId: inner.findByHistoryId.bind(inner),
    findByMatch: inner.findByMatch.bind(inner),
    findByCompetition: inner.findByCompetition.bind(inner),
    findBySeason: inner.findBySeason.bind(inner),
    findByDateRange: inner.findByDateRange.bind(inner),
    query: inner.query.bind(inner),
  };
  return wrapped;
}

describe("Artifact-scoped production Historical Intake authorization", () => {
  it("ships the production registry as global true and exactly one authorized pair (Ipswich-Arsenal)", () => {
    expect(
      PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY.globalProductionHistoricalIntakeEnabled,
    ).toBe(true);
    expect(
      PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY.authorizedPairs,
    ).toHaveLength(1);
    expect(
      PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY.authorizedPairs[0],
    ).toEqual({
      originalSealId:
        "prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9",
      originalSealChecksum:
        "ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e",
      resultEvidenceId:
        "evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result",
      admissionReviewId:
        "HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW_IPSWICH_ARSENAL_2026-09-18",
    });
    expect(PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY.schemaVersion).toBe(
      HISTORICAL_INTAKE_PRODUCTION_AUTHORIZATION_SCHEMA_VERSION,
    );
  });

  it("passes authorization assertion for the exact Ipswich triple against production policy", () => {
    const productionAuth = createHistoricalIntakeAuthorization(
      PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY,
    );
    const ipswichSeal = constructedSeal({
      originalSealId:
        "prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9",
      originalSealChecksum:
        "ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e",
      matchId: "lottery:csl:20260915:周二012",
    });
    const ipswichActual = constructedActual(
      ipswichSeal,
      "evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result",
    );

    expect(() =>
      assertHistoricalIntakeProductionAuthorization(
        productionAuth,
        ipswichSeal,
        ipswichActual,
      ),
    ).not.toThrow();
  });

  it("rejects an unlisted second valid Class A pair against production policy", () => {
    const productionAuth = createHistoricalIntakeAuthorization(
      PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY,
    );
    const unlistedSeal = constructedSeal({
      originalSealId:
        "prematch-seal:lottery:csl:20260915:周二010:d63058f4a13d7e8b9c201e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b",
      originalSealChecksum: "a".repeat(64),
      matchId: "lottery:csl:20260915:周二010",
    });
    const unlistedActual = constructedActual(
      unlistedSeal,
      "evidence-liverpool-match-result",
    );

    expect(() =>
      assertHistoricalIntakeProductionAuthorization(
        productionAuth,
        unlistedSeal,
        unlistedActual,
      ),
    ).toThrowError(
      expect.objectContaining({
        code: "ARTIFACT_NOT_PRODUCTION_AUTHORIZED",
      }),
    );
  });

  it("rejects when resultEvidenceId differs from the authorized triple", () => {
    const productionAuth = createHistoricalIntakeAuthorization(
      PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY,
    );
    const ipswichSeal = constructedSeal({
      originalSealId:
        "prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9",
      originalSealChecksum:
        "ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e",
      matchId: "lottery:csl:20260915:周二012",
    });
    const wrongActual = constructedActual(
      ipswichSeal,
      "evidence-wrong-match-result",
    );

    expect(() =>
      assertHistoricalIntakeProductionAuthorization(
        productionAuth,
        ipswichSeal,
        wrongActual,
      ),
    ).toThrowError(
      expect.objectContaining({
        code: "ARTIFACT_NOT_PRODUCTION_AUTHORIZED",
      }),
    );
  });

  it("rejects when originalSealChecksum differs from the authorized triple", () => {
    const productionAuth = createHistoricalIntakeAuthorization(
      PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY,
    );
    const wrongChecksumSeal = constructedSeal({
      originalSealId:
        "prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9",
      originalSealChecksum: "f".repeat(64),
      matchId: "lottery:csl:20260915:周二012",
    });
    const ipswichActual = constructedActual(
      wrongChecksumSeal,
      "evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result",
    );

    expect(() =>
      assertHistoricalIntakeProductionAuthorization(
        productionAuth,
        wrongChecksumSeal,
        ipswichActual,
      ),
    ).toThrowError(
      expect.objectContaining({
        code: "ARTIFACT_NOT_PRODUCTION_AUTHORIZED",
      }),
    );
  });

  it("rejects when originalSealId differs from the authorized triple", () => {
    const productionAuth = createHistoricalIntakeAuthorization(
      PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY,
    );
    const wrongIdSeal = constructedSeal({
      originalSealId: "prematch-seal:lottery:csl:20260915:周二012:different-id",
      originalSealChecksum:
        "ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e",
      matchId: "lottery:csl:20260915:周二012",
    });
    const ipswichActual = constructedActual(
      wrongIdSeal,
      "evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result",
    );

    expect(() =>
      assertHistoricalIntakeProductionAuthorization(
        productionAuth,
        wrongIdSeal,
        ipswichActual,
      ),
    ).toThrowError(
      expect.objectContaining({
        code: "ARTIFACT_NOT_PRODUCTION_AUTHORIZED",
      }),
    );
  });

  it("rejects partial or prefix matching against the authorized triple", () => {
    const productionAuth = createHistoricalIntakeAuthorization(
      PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY,
    );
    const prefixSeal = constructedSeal({
      originalSealId: "prematch-seal:lottery:csl:20260915:周二012",
      originalSealChecksum:
        "ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e",
      matchId: "lottery:csl:20260915:周二012",
    });
    const ipswichActual = constructedActual(
      prefixSeal,
      "evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result",
    );

    expect(() =>
      assertHistoricalIntakeProductionAuthorization(
        productionAuth,
        prefixSeal,
        ipswichActual,
      ),
    ).toThrowError(
      expect.objectContaining({
        code: "ARTIFACT_NOT_PRODUCTION_AUTHORIZED",
      }),
    );
  });

  it("rejects public ingest of an unlisted Class A pair with ARTIFACT_NOT_PRODUCTION_AUTHORIZED", async () => {
    const historyRepository = spyRepository();
    const seal = constructedSeal();
    const actual = constructedActual(seal);
    const result = await ingestHistoricalEvaluation({
      command: commandOf(seal, actual),
      historyRepository,
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "ARTIFACT_NOT_PRODUCTION_AUTHORIZED",
    });
    expect(historyRepository.saveCalls).toBe(0);
    expect(await historyRepository.query({})).toEqual([]);
  });

  it("does not call evaluatePrediction or save on unauthorized public ingest", async () => {
    const historyRepository = spyRepository();
    const evaluatePredictionFn = vi.fn(() => {
      throw new Error("evaluatePrediction must not run");
    });
    const seal = constructedSeal();
    const actual = constructedActual(seal);
    const result = await ingestHistoricalEvaluationForTest({
      command: commandOf(seal, actual),
      historyRepository,
      authorizationPolicy: constructedHistoricalIntakeAuthorizationPolicy(
        [{ seal, actual }],
        false,
      ),
      evaluatePredictionFn,
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "PRODUCTION_INTAKE_NOT_AUTHORIZED",
    });
    expect(evaluatePredictionFn).not.toHaveBeenCalled();
    expect(historyRepository.saveCalls).toBe(0);
  });

  it("rejects when global is true but the pair is missing", async () => {
    const historyRepository = spyRepository();
    const evaluatePredictionFn = vi.fn();
    const seal = constructedSeal();
    const actual = constructedActual(seal);
    const result = await ingestHistoricalEvaluationForTest({
      command: commandOf(seal, actual),
      historyRepository,
      authorizationPolicy: constructedHistoricalIntakeAuthorizationPolicy([], true),
      evaluatePredictionFn,
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "ARTIFACT_NOT_PRODUCTION_AUTHORIZED",
    });
    expect(evaluatePredictionFn).not.toHaveBeenCalled();
    expect(historyRepository.saveCalls).toBe(0);
  });

  it("rejects an authorized seal with the wrong resultEvidenceId", async () => {
    const historyRepository = spyRepository();
    const evaluatePredictionFn = vi.fn();
    const seal = constructedSeal();
    const authorizedActual = constructedActual(
      seal,
      "evidence-unit-test-authorized",
    );
    const presentedActual = constructedActual(seal, "evidence-unit-test-other");
    const result = await ingestHistoricalEvaluationForTest({
      command: commandOf(seal, presentedActual),
      historyRepository,
      authorizationPolicy: constructedHistoricalIntakeAuthorizationPolicy([
        { seal, actual: authorizedActual },
      ]),
      evaluatePredictionFn,
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "ARTIFACT_NOT_PRODUCTION_AUTHORIZED",
    });
    expect(evaluatePredictionFn).not.toHaveBeenCalled();
    expect(historyRepository.saveCalls).toBe(0);
  });

  it("rejects an authorized seal id with a wrong originalSealChecksum", async () => {
    const historyRepository = spyRepository();
    const evaluatePredictionFn = vi.fn();
    const authorizedSeal = constructedSeal();
    const presentedSnapshot = Object.freeze({
      ...predictionSnapshot(authorizedSeal.matchId),
      pHome: 0.4,
      pDraw: 0.3,
      pAway: 0.3,
    });
    const presentedSeal = constructedSeal({
      originalSealId: authorizedSeal.originalSealId,
      matchId: authorizedSeal.matchId,
      predictionSnapshot: presentedSnapshot,
      checksumPayload: presentedSnapshot,
    });
    const actual = constructedActual(authorizedSeal);
    const result = await ingestHistoricalEvaluationForTest({
      command: commandOf(presentedSeal, actual),
      historyRepository,
      authorizationPolicy: constructedHistoricalIntakeAuthorizationPolicy([
        { seal: authorizedSeal, actual },
      ]),
      evaluatePredictionFn,
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "ARTIFACT_NOT_PRODUCTION_AUTHORIZED",
    });
    expect(evaluatePredictionFn).not.toHaveBeenCalled();
    expect(historyRepository.saveCalls).toBe(0);
  });

  it("rejects a wrong originalSealId", async () => {
    const historyRepository = spyRepository();
    const evaluatePredictionFn = vi.fn();
    const authorizedSeal = constructedSeal({
      originalSealId: "unit-test-seal:authorized",
    });
    const presentedSeal = constructedSeal({
      originalSealId: "unit-test-seal:other",
    });
    const actual = constructedActual(presentedSeal);
    const result = await ingestHistoricalEvaluationForTest({
      command: commandOf(presentedSeal, actual),
      historyRepository,
      authorizationPolicy: constructedHistoricalIntakeAuthorizationPolicy([
        { seal: authorizedSeal, actual: constructedActual(authorizedSeal) },
      ]),
      evaluatePredictionFn,
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "ARTIFACT_NOT_PRODUCTION_AUTHORIZED",
    });
    expect(evaluatePredictionFn).not.toHaveBeenCalled();
    expect(historyRepository.saveCalls).toBe(0);
  });

  it("accepts the exact constructed authorized triple on the test-only path", async () => {
    const historyRepository = spyRepository();
    const seal = constructedSeal();
    const actual = constructedActual(seal);
    const result = await ingestHistoricalEvaluationForTest({
      command: commandOf(seal, actual),
      historyRepository,
      authorizationPolicy: constructedHistoricalIntakeAuthorizationPolicy([
        { seal, actual },
      ]),
    });

    expect(result.status).toBe("accepted");
    if (result.status !== "accepted") {
      return;
    }

    expect(historyRepository.saveCalls).toBe(1);
    expect(result.history.intakeIntegrity.calibrationEligible).toBe(false);
    expect(result.history.intakeIntegrity.validationEligible).toBe(false);
    expect(result.history.intakeIntegrity.contributionEligible).toBe(false);
    expect(result.history.intakeIntegrity.replayCohortEligible).toBe(false);
    expect(result.history.intakeIntegrity.admissionReviewId).toBeUndefined();
    expect(result.history.intakeIntegrity.originalSealId).toBe(seal.originalSealId);
    expect(result.history.intakeIntegrity.resultEvidenceId).toBe(actual.evidence.id);
  });

  it("rejects a second otherwise-valid Class A pair that is not in the registry", async () => {
    const historyRepository = spyRepository();
    const evaluatePredictionFn = vi.fn();
    const authorizedSeal = constructedSeal({
      originalSealId: "unit-test-seal:listed",
      matchId: "unit-test:constructed:listed",
    });
    const unlistedSeal = constructedSeal({
      originalSealId: "unit-test-seal:unlisted",
      matchId: "unit-test:constructed:unlisted",
    });
    const unlistedActual = constructedActual(unlistedSeal);
    const result = await ingestHistoricalEvaluationForTest({
      command: commandOf(unlistedSeal, unlistedActual),
      historyRepository,
      authorizationPolicy: constructedHistoricalIntakeAuthorizationPolicy([
        { seal: authorizedSeal, actual: constructedActual(authorizedSeal) },
      ]),
      evaluatePredictionFn,
    });

    expect(result).toMatchObject({
      status: "rejected",
      code: "ARTIFACT_NOT_PRODUCTION_AUTHORIZED",
    });
    expect(evaluatePredictionFn).not.toHaveBeenCalled();
    expect(historyRepository.saveCalls).toBe(0);
  });

  it("fails closed on a malformed authorization registry entry", () => {
    expect(() =>
      createHistoricalIntakeAuthorization({
        schemaVersion: HISTORICAL_INTAKE_PRODUCTION_AUTHORIZATION_SCHEMA_VERSION,
        globalProductionHistoricalIntakeEnabled: true,
        authorizedPairs: [
          {
            originalSealId: "unit-test-seal:x",
            originalSealChecksum: "not-a-sha256",
            resultEvidenceId: "evidence-x",
            admissionReviewId: UNIT_TEST_CONSTRUCTED_ADMISSION_REVIEW_ID,
          },
        ],
      }),
    ).toThrow(HistoricalIntakeAuthorizationPolicyError);

    expect(() =>
      createHistoricalIntakeAuthorization({
        schemaVersion: HISTORICAL_INTAKE_PRODUCTION_AUTHORIZATION_SCHEMA_VERSION,
        globalProductionHistoricalIntakeEnabled: true,
        authorizedPairs: [
          {
            originalSealId: "unit-test-seal:*",
            originalSealChecksum: "a".repeat(64),
            resultEvidenceId: "evidence-x",
            admissionReviewId: UNIT_TEST_CONSTRUCTED_ADMISSION_REVIEW_ID,
          },
        ],
      }),
    ).toThrow(/wildcard/);

    expect(() =>
      createHistoricalIntakeAuthorization({
        schemaVersion: HISTORICAL_INTAKE_PRODUCTION_AUTHORIZATION_SCHEMA_VERSION,
        globalProductionHistoricalIntakeEnabled: true,
        authorizedPairs: [
          {
            originalSealId: "unit-test-seal:x",
            originalSealChecksum: "a".repeat(64),
            resultEvidenceId: "evidence-x",
            admissionReviewId: "",
          },
        ],
      }),
    ).toThrow(HistoricalIntakeAuthorizationPolicyError);
  });

  it("fails closed on a duplicate originalSealId registry entry", () => {
    const pair = {
      originalSealId: "unit-test-seal:dup",
      originalSealChecksum: "a".repeat(64),
      resultEvidenceId: "evidence-a",
      admissionReviewId: UNIT_TEST_CONSTRUCTED_ADMISSION_REVIEW_ID,
    };

    expect(() =>
      createHistoricalIntakeAuthorization({
        schemaVersion: HISTORICAL_INTAKE_PRODUCTION_AUTHORIZATION_SCHEMA_VERSION,
        globalProductionHistoricalIntakeEnabled: true,
        authorizedPairs: [pair, { ...pair, resultEvidenceId: "evidence-b" }],
      }),
    ).toThrow(/duplicates originalSealId/);
  });

  it("does not expose the test-only helper on the supported public package API", () => {
    expect(statisticsPublicApi).not.toHaveProperty(
      "ingestHistoricalEvaluationForTest",
    );
    expect(statisticsPublicApi).not.toHaveProperty(
      "ingestHistoricalEvaluationWithAuthorization",
    );
    expect(statisticsPublicApi).not.toHaveProperty(
      "createHistoricalIntakeAuthorization",
    );
    expect(statisticsPublicApi).toHaveProperty("ingestHistoricalEvaluation");

    const packageJson = JSON.parse(
      readFileSync(join(PACKAGE_DIRECTORY, "package.json"), "utf8"),
    ) as { exports: Record<string, unknown> };
    expect(Object.keys(packageJson.exports)).toEqual(["."]);
  });
});
