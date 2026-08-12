import { describe, expect, it } from "vitest";
import {
  assessProjectionReplayEligibility,
  buildEvaluationHistoryRecord,
  buildReplayCohort,
  computeProjectionReplaySidecarContentSha256,
  computeReplayCohortMembershipDigestSha256,
  createActualMatchResult,
  createAndSealReplayCohort,
  createDefaultReplayCohortSpecification,
  createEvaluationHistoryRecord,
  evaluatePrediction,
  InMemoryEvaluationHistoryRepository,
  InMemoryProjectionReplaySidecarRepository,
  InMemoryReplayCohortRepository,
  PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
  REPLAY_ELIGIBILITY_CONTRACT_VERSION,
  resolveSealedReplayCohort,
  selectReplayCohortMembers,
  SealedReplayCohortImmutableError,
  type EvaluationHistoryRecord,
  type ProjectionReplaySidecarRecord,
  type SealedProjectionReplayContext,
} from "../src/index.js";

function scoredHistory(
  matchId: string,
  overrides?: {
    readonly winner?: "away" | "draw" | "home";
    readonly homeGoals?: number;
    readonly awayGoals?: number;
    readonly recordedAt?: string;
  },
): EvaluationHistoryRecord {
  const winner = overrides?.winner ?? "home";
  const homeGoals = overrides?.homeGoals ?? 1;
  const awayGoals = overrides?.awayGoals ?? 0;
  const prediction = Object.freeze({
    matchId,
    projectionChecksum: `proj-${matchId}`,
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
    homeGoals,
    awayGoals,
    winner,
    totalGoals: homeGoals + awayGoals,
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
    recordedAt: overrides?.recordedAt ?? "2026-08-12T12:00:00.000Z",
  });
}

function sampleContext(
  matchId: string,
  overrides: Partial<SealedProjectionReplayContext> = {},
): SealedProjectionReplayContext {
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
    ...overrides,
  });
}

function sidecarRecord(
  history: EvaluationHistoryRecord,
  context: SealedProjectionReplayContext,
  overrides: Partial<ProjectionReplaySidecarRecord> = {},
): ProjectionReplaySidecarRecord {
  return Object.freeze({
    historyId: history.historyId,
    matchId: history.matchId,
    schemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
    contentSha256: computeProjectionReplaySidecarContentSha256(context),
    context,
    ...overrides,
  });
}

function specification() {
  return createDefaultReplayCohortSpecification({
    sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
  });
}

function sidecarMap(
  entries: Array<{
    history: EvaluationHistoryRecord;
    sidecar?: ProjectionReplaySidecarRecord;
  }>,
): Map<string, ProjectionReplaySidecarRecord | undefined> {
  return new Map(entries.map((entry) => [entry.history.historyId, entry.sidecar]));
}

describe("P2K-E Sealed Replay Cohort", () => {
  it("1. Eligible History can enter cohort", () => {
    const history = scoredHistory("match-eligible");
    const sidecar = sidecarRecord(history, sampleContext(history.matchId));
    const selection = selectReplayCohortMembers({
      histories: [history],
      sidecarsByHistoryId: sidecarMap([{ history, sidecar }]),
      specification: specification(),
    });

    expect(selection.members).toHaveLength(1);
    expect(selection.members[0]?.historyId).toBe(history.historyId);
    expect(selection.members[0]?.matchId).toBe(history.matchId);
  });

  it("2–4. Missing / invalid hash / unsupported schema cannot enter", () => {
    const missing = scoredHistory("match-missing");
    const badHash = scoredHistory("match-bad-hash");
    const badSchema = scoredHistory("match-bad-schema");
    const context = sampleContext(badHash.matchId);

    const selection = selectReplayCohortMembers({
      histories: [missing, badHash, badSchema],
      sidecarsByHistoryId: sidecarMap([
        { history: missing, sidecar: undefined },
        {
          history: badHash,
          sidecar: sidecarRecord(badHash, context, {
            contentSha256: "0".repeat(64),
          }),
        },
        {
          history: badSchema,
          sidecar: sidecarRecord(badSchema, sampleContext(badSchema.matchId), {
            schemaVersion: "projection-replay-sidecar.unsupported",
          }),
        },
      ]),
      specification: specification(),
    });

    expect(selection.members).toHaveLength(0);
    expect(selection.rejectedHistoryIds).toEqual(
      expect.arrayContaining([
        missing.historyId,
        badHash.historyId,
        badSchema.historyId,
      ]),
    );
  });

  it("5. Unfinished / unscored outcome cannot enter replayEligible cohort", () => {
    const finished = scoredHistory("match-finished-gate");
    const unfinished = createEvaluationHistoryRecord({
      ...finished,
      historyId: `${finished.historyId}-unfinished`,
      actualResult: Object.freeze({
        ...finished.actualResult,
        matchStatus: "POSTPONED" as typeof finished.actualResult.matchStatus,
      }),
    });
    const sidecar = sidecarRecord(unfinished, sampleContext(unfinished.matchId));
    const eligibility = assessProjectionReplayEligibility({
      history: unfinished,
      sidecar,
      hashContext: computeProjectionReplaySidecarContentSha256,
    });
    expect(eligibility.replayEligible).toBe(false);

    const selection = selectReplayCohortMembers({
      histories: [unfinished],
      sidecarsByHistoryId: sidecarMap([{ history: unfinished, sidecar }]),
      specification: specification(),
    });
    expect(selection.members).toHaveLength(0);
  });

  it("6–10. Membership, order, and digest are deterministic", () => {
    const a = scoredHistory("match-z");
    const b = scoredHistory("match-a");
    const c = scoredHistory("match-m");
    const entries = [a, b, c].map((history) => ({
      history,
      sidecar: sidecarRecord(history, sampleContext(history.matchId)),
    }));

    const first = selectReplayCohortMembers({
      histories: [a, b, c],
      sidecarsByHistoryId: sidecarMap(entries),
      specification: specification(),
    });
    const second = selectReplayCohortMembers({
      histories: [c, a, b],
      sidecarsByHistoryId: sidecarMap([...entries].reverse()),
      specification: specification(),
    });

    expect(first.members.map((member) => member.historyId)).toEqual(
      second.members.map((member) => member.historyId),
    );
    expect(first.members.map((member) => member.historyId)).toEqual(
      [...first.members.map((member) => member.historyId)].sort(),
    );
    expect(first.members.map((member) => member.position)).toEqual([0, 1, 2]);
    expect(first.membershipDigestSha256).toBe(second.membershipDigestSha256);
    expect(first.membershipDigestSha256).toBe(
      computeReplayCohortMembershipDigestSha256({
        specification: first.specification,
        members: first.members,
      }),
    );
  });

  it("8. Different population → different membership", () => {
    const left = scoredHistory("match-pop-1");
    const right = scoredHistory("match-pop-2");
    const leftSelection = selectReplayCohortMembers({
      histories: [left],
      sidecarsByHistoryId: sidecarMap([
        {
          history: left,
          sidecar: sidecarRecord(left, sampleContext(left.matchId)),
        },
      ]),
      specification: specification(),
    });
    const rightSelection = selectReplayCohortMembers({
      histories: [right],
      sidecarsByHistoryId: sidecarMap([
        {
          history: right,
          sidecar: sidecarRecord(right, sampleContext(right.matchId)),
        },
      ]),
      specification: specification(),
    });

    expect(leftSelection.membershipDigestSha256).not.toBe(
      rightSelection.membershipDigestSha256,
    );
  });

  it("11–12. Sealed cohort cannot be modified; overwrite fails", async () => {
    const history = scoredHistory("match-seal");
    const historyRepo = new InMemoryEvaluationHistoryRepository();
    const sidecarRepo = new InMemoryProjectionReplaySidecarRepository();
    const cohortRepo = new InMemoryReplayCohortRepository();
    await historyRepo.save(history);
    await sidecarRepo.save({
      historyId: history.historyId,
      matchId: history.matchId,
      context: sampleContext(history.matchId),
    });

    const created = await createAndSealReplayCohort({
      cohortId: "cohort.p2k.e.seal-1",
      specification: specification(),
      historyRepository: historyRepo,
      sidecarRepository: sidecarRepo,
      cohortRepository: cohortRepo,
      clock: () => "2026-08-12T15:00:00.000Z",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    expect(created.value.status).toBe("SEALED");
    const resolved = await resolveSealedReplayCohort({
      cohortId: "cohort.p2k.e.seal-1",
      cohortRepository: cohortRepo,
    });
    expect(resolved?.membershipDigestSha256).toBe(
      created.value.membershipDigestSha256,
    );

    const other = scoredHistory("match-seal-other");
    const otherSelection = selectReplayCohortMembers({
      histories: [other],
      sidecarsByHistoryId: sidecarMap([
        {
          history: other,
          sidecar: sidecarRecord(other, sampleContext(other.matchId)),
        },
      ]),
      specification: specification(),
    });
    const mutated = buildReplayCohort({
      cohortId: "cohort.p2k.e.seal-1",
      status: "SEALED",
      selection: otherSelection,
      createdAt: "2026-08-12T15:00:00.000Z",
      membershipCreatedAt: "2026-08-12T15:00:00.000Z",
      sealedAt: "2026-08-12T15:00:00.000Z",
    });

    await expect(cohortRepo.save(mutated)).rejects.toBeInstanceOf(
      SealedReplayCohortImmutableError,
    );

    const conflict = await createAndSealReplayCohort({
      cohortId: "cohort.p2k.e.seal-1",
      specification: createDefaultReplayCohortSpecification({
        sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
        maxSampleSize: 1,
      }),
      historyRepository: historyRepo,
      sidecarRepository: sidecarRepo,
      cohortRepository: cohortRepo,
      clock: () => "2026-08-12T16:00:00.000Z",
    });
    // Same membership under default spec is idempotent; different digest fails.
    // maxSampleSize changes digest even with one member.
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) {
      expect(conflict.error.code).toBe("SEALED_IMMUTABLE");
    }
  });

  it("13–14. Candidate results / actual scores do not drive selection order", () => {
    const homeWin = scoredHistory("match-bias-a", {
      winner: "home",
      homeGoals: 3,
      awayGoals: 0,
    });
    const awayWin = scoredHistory("match-bias-b", {
      winner: "away",
      homeGoals: 0,
      awayGoals: 2,
    });
    const selection = selectReplayCohortMembers({
      histories: [awayWin, homeWin],
      sidecarsByHistoryId: sidecarMap([
        {
          history: homeWin,
          sidecar: sidecarRecord(homeWin, sampleContext(homeWin.matchId)),
        },
        {
          history: awayWin,
          sidecar: sidecarRecord(awayWin, sampleContext(awayWin.matchId)),
        },
      ]),
      specification: specification(),
    });

    expect(selection.members).toHaveLength(2);
    expect(selection.members.map((member) => member.historyId)).toEqual(
      [homeWin.historyId, awayWin.historyId].sort(),
    );
    expect(selection.specification.eligibilityContractVersion).toBe(
      REPLAY_ELIGIBILITY_CONTRACT_VERSION,
    );
  });

  it("15–18. No Provider/Evidence/Sidecar fabrication; P2K-C remains gate", async () => {
    const eligible = scoredHistory("match-gate-ok");
    const legacy = scoredHistory("match-gate-legacy");
    const historyRepo = new InMemoryEvaluationHistoryRepository();
    const sidecarRepo = new InMemoryProjectionReplaySidecarRepository();
    const cohortRepo = new InMemoryReplayCohortRepository();
    await historyRepo.save(eligible);
    await historyRepo.save(legacy);
    await sidecarRepo.save({
      historyId: eligible.historyId,
      matchId: eligible.matchId,
      context: sampleContext(eligible.matchId),
    });

    const beforeSidecar = await sidecarRepo.findRecordByHistoryId(legacy.historyId);
    expect(beforeSidecar).toBeUndefined();

    const outcome = await createAndSealReplayCohort({
      cohortId: "cohort.p2k.e.gate",
      specification: specification(),
      historyRepository: historyRepo,
      sidecarRepository: sidecarRepo,
      cohortRepository: cohortRepo,
      clock: () => "2026-08-12T15:00:00.000Z",
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    expect(outcome.value.members.map((member) => member.historyId)).toEqual([
      eligible.historyId,
    ]);
    expect(await sidecarRepo.findRecordByHistoryId(legacy.historyId)).toBe(
      undefined,
    );
    expect(outcome.value.limitations.some((line) => line.includes("P2K-C"))).toBe(
      true,
    );
  });

  it("idempotent reseal of identical sealed cohort succeeds", async () => {
    const history = scoredHistory("match-idempotent");
    const historyRepo = new InMemoryEvaluationHistoryRepository();
    const sidecarRepo = new InMemoryProjectionReplaySidecarRepository();
    const cohortRepo = new InMemoryReplayCohortRepository();
    await historyRepo.save(history);
    await sidecarRepo.save({
      historyId: history.historyId,
      matchId: history.matchId,
      context: sampleContext(history.matchId),
    });

    const first = await createAndSealReplayCohort({
      cohortId: "cohort.p2k.e.idem",
      specification: specification(),
      historyRepository: historyRepo,
      sidecarRepository: sidecarRepo,
      cohortRepository: cohortRepo,
      clock: () => "2026-08-12T15:00:00.000Z",
    });
    const second = await createAndSealReplayCohort({
      cohortId: "cohort.p2k.e.idem",
      specification: specification(),
      historyRepository: historyRepo,
      sidecarRepository: sidecarRepo,
      cohortRepository: cohortRepo,
      clock: () => "2026-08-12T16:00:00.000Z",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }

    expect(second.value.membershipDigestSha256).toBe(
      first.value.membershipDigestSha256,
    );
    expect(second.value.sealedAt).toBe(first.value.sealedAt);
  });
});
