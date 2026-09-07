import { describe, expect, it } from "vitest";
import {
  authenticatePrematchPredictionSeal,
  capturePrematchPredictionSeal,
  canonicalizeJson,
  computeContentSha256,
  computeOriginalSealId,
  computeSealIdentityHash,
  createPrematchPredictionSeal,
  InMemoryPrematchPredictionSealRepository,
  parseJsonRejectingDuplicateKeys,
  PrematchPredictionSealError,
  PREMATCH_PREDICTION_SEAL_SCHEMA_VERSION,
  PREMATCH_SEAL_SOURCE_AUTHORITY,
  SealIdentityConflictError,
  sha256CanonicalJson,
  type CapturePrematchPredictionSealInput,
  type PrematchFixtureIdentity,
  type PrematchPredictionSeal,
  type PrematchPredictionSealRepository,
  type SealedPredictionInput,
} from "../src/index.js";

const RULE_SET_VERSION = "rule.mvp.m1b.manager";

const FIXTURE: PrematchFixtureIdentity = Object.freeze({
  matchId: "match-seal-1",
  homeTeam: "Liverpool",
  awayTeam: "Chelsea",
  competitionId: "39",
  competitionName: "Premier League",
  season: "2026",
  kickoff: "2026-10-01T19:30:00Z",
});

function snapshot(matchId = FIXTURE.matchId): SealedPredictionInput {
  return Object.freeze({
    matchId,
    projectionChecksum: "proj-seal-1",
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
        slot: "mostLikely",
        winner: "home",
        homeGoals: 1,
        awayGoals: 0,
        probability: 0.5,
      }),
      secondLikely: Object.freeze({
        slot: "secondLikely",
        winner: "draw",
        homeGoals: 1,
        awayGoals: 1,
        probability: 0.3,
      }),
      upset: Object.freeze({
        slot: "upset",
        winner: "away",
        homeGoals: 0,
        awayGoals: 1,
        probability: 0.2,
      }),
    }),
    rules: Object.freeze([
      Object.freeze({
        ruleName: "HOME_ATTACK_EDGE",
        status: "PASS",
        channel: "home+",
      }),
    ]),
    featureNames: Object.freeze(["attackRatingHome"]),
    projectionModelVersion: "projection.v2.unifiedMatrix",
    featureModelVersion: "feature.v2.test",
    ruleSetVersion: RULE_SET_VERSION,
  });
}

function captureInput(
  overrides: Partial<CapturePrematchPredictionSealInput> = {},
): CapturePrematchPredictionSealInput {
  return {
    fixture: FIXTURE,
    evidenceSet: Object.freeze([
      Object.freeze({ type: "MATCH_INFO", collectedAt: "2026-09-30T12:00:00Z" }),
    ]),
    predictionSnapshot: snapshot(),
    featureModelVersion: "feature.v2.test",
    ruleSetVersion: RULE_SET_VERSION,
    projectionModelVersion: "projection.v2.unifiedMatrix",
    projectionPolicyPin: "v2",
    analysisTime: "2026-09-30T12:00:00Z",
    analysisCutoff: "2026-09-30T12:00:00Z",
    sealedAt: "2026-09-30T12:00:01Z",
    ...overrides,
  };
}

function expectCode(error: unknown, code: string): void {
  expect(error).toBeInstanceOf(PrematchPredictionSealError);
  expect((error as PrematchPredictionSealError).code).toBe(code);
}

class FailingPrematchSealRepository implements PrematchPredictionSealRepository {
  async save(): Promise<PrematchPredictionSeal> {
    throw new Error("postgres unavailable");
  }

  async findByOriginalSealId(): Promise<undefined> {
    return undefined;
  }

  async findByMatch(): Promise<readonly PrematchPredictionSeal[]> {
    return Object.freeze([]);
  }
}

describe("PRE_MATCH prediction seal capture", () => {
  it("T01 captures a valid PRE_MATCH seal with both hashes", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();
    const seal = await capturePrematchPredictionSeal(captureInput(), repository);

    expect(seal.schemaVersion).toBe(PREMATCH_PREDICTION_SEAL_SCHEMA_VERSION);
    expect(seal.sealIdentity.synthetic).toBe(false);
    expect(seal.sealIdentity.historicalAuthenticity).toBe(true);
    expect(seal.sealIdentity.provenanceClass).toBe("A");
    expect(seal.sealIdentity.allowedUsage).toContain("historical_evaluation_intake");
    expect(seal.sealIdentity.sourceAuthority).toBe(PREMATCH_SEAL_SOURCE_AUTHORITY);
    expect(seal.originalSealId).toBe(
      computeOriginalSealId(
        seal.sealIdentity.matchId,
        computeSealIdentityHash(seal.sealIdentity),
      ),
    );
    expect(seal.contentSha256).toBe(
      computeContentSha256(
        seal.schemaVersion,
        seal.originalSealId,
        seal.sealedAt,
        seal.sealIdentity,
      ),
    );
    expect(canonicalizeJson(seal.sealIdentity)).not.toContain("sealedAt");
    authenticatePrematchPredictionSeal(seal);
  });

  it("T02 exact retry keeps the first sealedAt and contentSha256", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();
    const first = await capturePrematchPredictionSeal(captureInput(), repository);
    const second = await capturePrematchPredictionSeal(
      captureInput({ sealedAt: "2026-09-30T12:00:09Z" }),
      repository,
    );

    expect(second.originalSealId).toBe(first.originalSealId);
    expect(second.sealedAt).toBe(first.sealedAt);
    expect(second.contentSha256).toBe(first.contentSha256);
  });

  it("T03 identity conflict fails closed", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();
    const first = await capturePrematchPredictionSeal(captureInput(), repository);
    const tampered: PrematchPredictionSeal = Object.freeze({
      ...first,
      sealIdentity: Object.freeze({
        ...first.sealIdentity,
        homeTeam: "Different",
      }),
    });

    await expect(repository.save(tampered)).rejects.toBeInstanceOf(
      SealIdentityConflictError,
    );
  });

  it("T04 allows a second legitimate seal for the same match", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();
    const first = await capturePrematchPredictionSeal(captureInput(), repository);
    const second = await capturePrematchPredictionSeal(
      captureInput({
        analysisTime: "2026-09-30T18:00:00Z",
        analysisCutoff: "2026-09-30T18:00:00Z",
        sealedAt: "2026-09-30T18:00:01Z",
      }),
      repository,
    );

    expect(second.originalSealId).not.toBe(first.originalSealId);
    await expect(repository.findByMatch(FIXTURE.matchId)).resolves.toHaveLength(2);
  });

  it("T05 rejects sealedAt == kickoff", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(
        captureInput({ sealedAt: FIXTURE.kickoff }),
        repository,
      ),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "SEAL_NOT_PRE_MATCH");
      return true;
    });
  });

  it("T06 rejects sealedAt > kickoff", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(
        captureInput({ sealedAt: "2026-10-01T20:00:00Z" }),
        repository,
      ),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "SEAL_NOT_PRE_MATCH");
      return true;
    });
  });

  it("T07 rejects analysisTime >= kickoff", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(
        captureInput({
          analysisTime: FIXTURE.kickoff,
          analysisCutoff: FIXTURE.kickoff,
          sealedAt: "2026-10-01T19:30:00.001Z",
        }),
        repository,
      ),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "SEAL_NOT_PRE_MATCH");
      return true;
    });
  });

  it("T08 rejects cutoff != analysisTime", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(
        captureInput({ analysisCutoff: "2026-09-30T11:00:00Z" }),
        repository,
      ),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "INVALID_ANALYSIS_CUTOFF");
      return true;
    });
  });

  it("T09 rejects MATCH_RESULT evidence", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(
        captureInput({
          evidenceSet: Object.freeze([
            Object.freeze({
              type: "MATCH_INFO",
              collectedAt: "2026-09-30T12:00:00Z",
            }),
            Object.freeze({
              type: "MATCH_RESULT",
              collectedAt: "2026-09-30T12:00:00Z",
            }),
          ]),
        }),
        repository,
      ),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "POST_MATCH_EVIDENCE");
      return true;
    });
  });

  it("T10 rejects matchId mismatch", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(
        captureInput({
          expectedFixture: { ...FIXTURE, matchId: "other-match" },
        }),
        repository,
      ),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "FIXTURE_IDENTITY_MISMATCH");
      return true;
    });
  });

  it("T11 rejects home/away swap", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(
        captureInput({
          expectedFixture: {
            ...FIXTURE,
            homeTeam: FIXTURE.awayTeam,
            awayTeam: FIXTURE.homeTeam,
          },
        }),
        repository,
      ),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "HOME_AWAY_ORIENTATION_MISMATCH");
      return true;
    });
  });

  it("T12 rejects competition/season mismatch", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(
        captureInput({
          expectedFixture: { ...FIXTURE, season: "2025" },
        }),
        repository,
      ),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "FIXTURE_IDENTITY_MISMATCH");
      return true;
    });
  });

  it("T13 rejects unsupported schema version", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(
        captureInput({ schemaVersion: "prematch-prediction-seal.v0" }),
        repository,
      ),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "UNSUPPORTED_SEAL_SCHEMA_VERSION");
      return true;
    });
  });

  it("T14 rejects unsupported checksum algorithm", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(
        captureInput({ checksumAlgorithm: "fnv" }),
        repository,
      ),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "UNSUPPORTED_CHECKSUM_ALGORITHM");
      return true;
    });
  });

  it("T15 rejects unsupported canonicalization", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(
        captureInput({ canonicalization: "json.sort.v0" }),
        repository,
      ),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "UNSUPPORTED_CANONICALIZATION");
      return true;
    });
  });

  it("T16 detects contentSha256 tamper", () => {
    const seal = createPrematchPredictionSeal(captureInput());
    const tampered = Object.freeze({
      ...seal,
      contentSha256: "a".repeat(64),
    });

    expect(() => authenticatePrematchPredictionSeal(tampered)).toThrow(
      PrematchPredictionSealError,
    );
  });

  it("T17 rejects missing model version", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(
        captureInput({ featureModelVersion: "" }),
        repository,
      ),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "MISSING_MODEL_VERSION");
      return true;
    });
  });

  it("T18 rejects untrusted sourceAuthority", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(
        captureInput({ sourceAuthority: "browser.localStorage" }),
        repository,
      ),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "UNTRUSTED_SOURCE_AUTHORITY");
      return true;
    });
  });

  it("T19 rejects Class B / synthetic fixtures", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(captureInput({ synthetic: true }), repository),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "SYNTHETIC_FIXTURE_REJECTED");
      return true;
    });
  });

  it("T20 rejects demo population classification", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(
        captureInput({ sourceAuthority: "demo.population" }),
        repository,
      ),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "UNTRUSTED_SOURCE_AUTHORITY");
      return true;
    });
  });

  it("T21 rejects replay output as original seal", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(captureInput({ replay: true }), repository),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "REPLAY_NOT_ORIGINAL_SEAL");
      return true;
    });
  });

  it("T22 rejects reconstruction / backdating", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(
        captureInput({ reconstructed: true }),
        repository,
      ),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "RETROSPECTIVE_RECONSTRUCTION");
      return true;
    });
  });

  it("T23 rejects Actual input", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(
        captureInput({ actual: { homeGoals: 1, awayGoals: 0 } }),
        repository,
      ),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "ACTUAL_FORBIDDEN");
      return true;
    });
  });

  it("T27 rescheduled kickoff creates a new seal and preserves the old one", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();
    const first = await capturePrematchPredictionSeal(captureInput(), repository);
    const rescheduled = await capturePrematchPredictionSeal(
      captureInput({
        fixture: { ...FIXTURE, kickoff: "2026-10-08T19:30:00Z" },
        analysisTime: "2026-10-07T12:00:00Z",
        analysisCutoff: "2026-10-07T12:00:00Z",
        sealedAt: "2026-10-07T12:00:01Z",
      }),
      repository,
    );

    expect(rescheduled.originalSealId).not.toBe(first.originalSealId);
    expect(first.sealIdentity.kickoff).toBe("2026-10-01T19:30:00Z");
    const stored = await repository.findByOriginalSealId(first.originalSealId);
    expect(stored?.sealIdentity.kickoff).toBe("2026-10-01T19:30:00Z");
  });

  it("T28 repository has no update path", () => {
    const repository = new InMemoryPrematchPredictionSealRepository();
    expect("update" in repository).toBe(false);
    expect(typeof repository.save).toBe("function");
  });

  it("T29 mutated kickoff changes contentSha256 and fails authentication", () => {
    const seal = createPrematchPredictionSeal(captureInput());
    const mutated = Object.freeze({
      ...seal,
      sealIdentity: Object.freeze({
        ...seal.sealIdentity,
        kickoff: "2026-10-08T19:30:00Z",
      }),
    });

    expect(mutated.contentSha256).not.toBe(
      computeContentSha256(
        mutated.schemaVersion,
        mutated.originalSealId,
        mutated.sealedAt,
        mutated.sealIdentity,
      ),
    );
    expect(() => authenticatePrematchPredictionSeal(mutated)).toThrow(
      PrematchPredictionSealError,
    );
  });

  it("T30 later intake can read the seal without AnalyzeMatch", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();
    const saved = await capturePrematchPredictionSeal(captureInput(), repository);
    const loaded = await repository.findByOriginalSealId(saved.originalSealId);

    expect(loaded).toEqual(saved);
    expect(loaded?.sealIdentity.predictionSnapshot.pHome).toBe(0.5);
  });

  it("T31 rejects Evidence after cutoff", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();

    await expect(
      capturePrematchPredictionSeal(
        captureInput({
          evidenceSet: Object.freeze([
            Object.freeze({
              type: "TEAM_FORM",
              collectedAt: "2026-09-30T13:00:00Z",
            }),
          ]),
        }),
        repository,
      ),
    ).rejects.toSatisfy((error) => {
      expectCode(error, "EVIDENCE_AFTER_CUTOFF");
      return true;
    });
  });

  it("T32 postgres write failure produces no Class A record", async () => {
    const repository = new FailingPrematchSealRepository();

    await expect(
      capturePrematchPredictionSeal(captureInput(), repository),
    ).rejects.toThrow("postgres unavailable");
    await expect(repository.findByMatch(FIXTURE.matchId)).resolves.toEqual([]);
  });

  it("T33 records ruleSetVersion from @fas/rule", async () => {
    const repository = new InMemoryPrematchPredictionSealRepository();
    const seal = await capturePrematchPredictionSeal(captureInput(), repository);

    expect(seal.sealIdentity.ruleSetVersion).toBe(RULE_SET_VERSION);
    expect(seal.sealIdentity.predictionSnapshot.ruleSetVersion).toBe(
      RULE_SET_VERSION,
    );
  });

  it("rejects duplicate JSON keys at parse/ingest", () => {
    expect(() => parseJsonRejectingDuplicateKeys('{"a":1,"a":2}')).toThrow(
      /Duplicate JSON key/,
    );
  });

  it("SHA-256 of identity excludes sealedAt", () => {
    const seal = createPrematchPredictionSeal(captureInput());
    const identityHash = sha256CanonicalJson(seal.sealIdentity);
    expect(seal.originalSealId.endsWith(identityHash)).toBe(true);
    expect(JSON.stringify(seal.sealIdentity)).not.toContain("sealedAt");
  });
});
