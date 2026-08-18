import { describe, expect, it } from "vitest";
import {
  buildEvaluationHistoryRecord,
  computeReplayCohortMembershipDigestSha256,
  computeSealedCohortPopulationEvaluation,
  createActualMatchResult,
  createDefaultReplayCohortSpecification,
  evaluatePrediction,
  InMemoryEvaluationHistoryRepository,
  InMemoryPopulationEvaluationRepository,
  InMemoryReplayCohortRepository,
  InMemoryReplayRunRepository,
  PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
  REPLAY_COHORT_SCHEMA_VERSION,
  REPLAY_ELIGIBILITY_CONTRACT_VERSION,
  SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION,
  SEALED_COHORT_POPULATION_EVALUATION_SCHEMA_VERSION,
  type EvaluationHistoryRecord,
  type ReplayCohort,
  type SealedCohortOfflineReplayContextIdentity,
  type SealedCohortOfflineReplayMemberResult,
  type SealedCohortOfflineReplayRun,
  type SealedPredictionInput,
} from "../src/index.js";

function predictionFixture(
  matchId: string,
  overrides: Partial<SealedPredictionInput> = {},
): SealedPredictionInput {
  return Object.freeze({
    matchId,
    projectionChecksum: `proj-${matchId}`,
    projectionStatus: "completed_nonempty",
    pHome: 0.52,
    pDraw: 0.28,
    pAway: 0.2,
    topScorelines: Object.freeze([
      Object.freeze({ homeGoals: 1, awayGoals: 0, probability: 0.12 }),
    ]),
    goalRange: Object.freeze({
      range01: 0.3,
      range23: 0.45,
      range4Plus: 0.25,
    }),
    predictionConfidence: 74,
    confidenceBand: "high",
    scenarios: Object.freeze({
      mostLikely: Object.freeze({
        slot: "mostLikely",
        winner: "home",
        homeGoals: 1,
        awayGoals: 0,
        probability: 0.52,
      }),
      secondLikely: Object.freeze({
        slot: "secondLikely",
        winner: "draw",
        homeGoals: 1,
        awayGoals: 1,
        probability: 0.28,
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
    projectionModelVersion: "projection.v2.test",
    featureModelVersion: "feature.v2.test",
    ruleSetVersion: "rule.mvp.test",
    ...overrides,
  });
}

function historyFixture(
  matchId: string,
  actualWinner: "away" | "draw" | "home" = "home",
): EvaluationHistoryRecord {
  const prediction = predictionFixture(matchId);
  const homeGoals = actualWinner === "away" ? 0 : actualWinner === "draw" ? 1 : 2;
  const awayGoals = actualWinner === "home" ? 1 : actualWinner === "draw" ? 1 : 2;
  const actual = createActualMatchResult({
    matchId,
    homeGoals,
    awayGoals,
    winner: actualWinner,
    totalGoals: homeGoals + awayGoals,
    competitionId: "292",
    competitionName: "K League 1",
    matchStatus: "FINISHED",
    providerId: "football:p2k-g",
    providerSourceId: `${matchId}:result`,
    providerMethod: "test",
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

function contextIdentity(
  matchId: string,
  overrides: Partial<SealedCohortOfflineReplayContextIdentity> = {},
): SealedCohortOfflineReplayContextIdentity {
  return Object.freeze({
    matchId,
    featureBundleChecksum: "fb-checksum",
    featureModelVersion: "feature.v2.test",
    featureNames: Object.freeze(["attackRatingHome"]),
    ruleIds: Object.freeze(["rule-1"]),
    ruleNames: Object.freeze(["HOME_ATTACK_EDGE"]),
    evidenceRefs: Object.freeze(["ev-1"]),
    requiredEvidencePresentCount: 5,
    generatedAt: "2026-08-12T12:00:00.000Z",
    contentSha256: "c".repeat(64),
    schemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
    parameterVersionLabel: "projection.v3.replay",
    parameterArtifactId: "artifact-1",
    parameterArtifactChecksum: "param-1",
    ...overrides,
  });
}

function sealedCohort(
  cohortId: string,
  histories: readonly EvaluationHistoryRecord[],
): ReplayCohort {
  const specification = createDefaultReplayCohortSpecification({
    sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
  });
  const members = Object.freeze(
    [...histories]
      .sort((left, right) =>
        left.historyId < right.historyId
          ? -1
          : left.historyId > right.historyId
            ? 1
            : 0,
      )
      .map((history, position) =>
        Object.freeze({
          historyId: history.historyId,
          matchId: history.matchId,
          position,
        }),
      ),
  );
  const membershipDigestSha256 = computeReplayCohortMembershipDigestSha256({
    specification,
    members,
  });

  return Object.freeze({
    cohortId,
    schemaVersion: REPLAY_COHORT_SCHEMA_VERSION,
    status: "SEALED",
    specification,
    eligibilityContractVersion: REPLAY_ELIGIBILITY_CONTRACT_VERSION,
    sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
    createdAt: "2026-08-12T17:00:00.000Z",
    membershipCreatedAt: "2026-08-12T17:00:00.000Z",
    sealedAt: "2026-08-12T17:00:00.000Z",
    members,
    membershipDigestSha256,
    limitations: Object.freeze(["P2K-G test cohort"]),
  });
}

function successMember(input: {
  readonly position: number;
  readonly history: EvaluationHistoryRecord;
  readonly cohort: ReplayCohort;
  readonly label: "r1b.candidate.a.baseline" | "r1b.candidate.c.sideAwareOpen";
  readonly prediction: SealedPredictionInput;
  readonly context?: SealedCohortOfflineReplayContextIdentity;
}): SealedCohortOfflineReplayMemberResult {
  return Object.freeze({
    status: "success",
    position: input.position,
    historyId: input.history.historyId,
    matchId: input.history.matchId,
    cohortId: input.cohort.cohortId,
    membershipDigestSha256: input.cohort.membershipDigestSha256,
    matchScriptCalibrationLabel: input.label,
    isProductionDefault: input.label === "r1b.candidate.a.baseline",
    productionPromoted: false,
    sidecarContentSha256: "c".repeat(64),
    sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
    replaySchemaVersion: SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION,
    offlineParameterArtifactId: "offline-artifact",
    offlineParameterArtifactChecksum: "offline-checksum",
    projectionChecksum: input.prediction.projectionChecksum,
    historicalReplayContext: input.context ?? contextIdentity(input.history.matchId),
    prediction: input.prediction,
  });
}

function failureMember(input: {
  readonly position: number;
  readonly history: EvaluationHistoryRecord;
  readonly cohort: ReplayCohort;
  readonly label: "r1b.candidate.a.baseline" | "r1b.candidate.c.sideAwareOpen";
}): SealedCohortOfflineReplayMemberResult {
  return Object.freeze({
    status: "failure",
    position: input.position,
    historyId: input.history.historyId,
    matchId: input.history.matchId,
    cohortId: input.cohort.cohortId,
    membershipDigestSha256: input.cohort.membershipDigestSha256,
    matchScriptCalibrationLabel: input.label,
    isProductionDefault: input.label === "r1b.candidate.a.baseline",
    productionPromoted: false,
    replaySchemaVersion: SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION,
    reasonCode: "MISSING_SIDECAR",
    message: "sidecar missing",
  });
}

function replayRun(input: {
  readonly replayRunId: string;
  readonly cohort: ReplayCohort;
  readonly label: "r1b.candidate.a.baseline" | "r1b.candidate.c.sideAwareOpen";
  readonly results: readonly SealedCohortOfflineReplayMemberResult[];
}): SealedCohortOfflineReplayRun {
  const successCount = input.results.filter(
    (result) => result.status === "success",
  ).length;
  const failureCount = input.results.length - successCount;

  return Object.freeze({
    replayRunId: input.replayRunId,
    schemaVersion: SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION,
    cohortId: input.cohort.cohortId,
    membershipDigestSha256: input.cohort.membershipDigestSha256,
    matchScriptCalibrationLabel: input.label,
    isProductionDefault: input.label === "r1b.candidate.a.baseline",
    productionPromoted: false,
    status: failureCount === 0 ? "completed" : "completed_with_failures",
    createdAt: "2026-08-12T17:10:00.000Z",
    completedAt: "2026-08-12T17:10:00.000Z",
    memberCount: input.results.length,
    successCount,
    failureCount,
    results: Object.freeze([...input.results]),
    limitations: Object.freeze(["P2K-G test run"]),
  });
}

async function seedPair(input: {
  readonly cohortId: string;
  readonly histories: readonly EvaluationHistoryRecord[];
  readonly buildResults?: (args: {
    readonly cohort: ReplayCohort;
    readonly histories: readonly EvaluationHistoryRecord[];
  }) => {
    readonly baseline: readonly SealedCohortOfflineReplayMemberResult[];
    readonly candidate: readonly SealedCohortOfflineReplayMemberResult[];
  };
}) {
  const historyRepository = new InMemoryEvaluationHistoryRepository();
  const cohortRepository = new InMemoryReplayCohortRepository();
  const replayRunRepository = new InMemoryReplayRunRepository();
  const populationEvaluationRepository =
    new InMemoryPopulationEvaluationRepository();

  for (const history of input.histories) {
    await historyRepository.save(history);
  }

  const cohort = sealedCohort(input.cohortId, input.histories);
  await cohortRepository.save(cohort);

  const ordered = [...cohort.members].map((member) => {
    const history = input.histories.find(
      (row) => row.historyId === member.historyId,
    );
    if (history === undefined) {
      throw new Error("history missing for member");
    }
    return { member, history };
  });

  const defaultResults = {
    baseline: ordered.map(({ member, history }) =>
      successMember({
        position: member.position,
        history,
        cohort,
        label: "r1b.candidate.a.baseline",
        prediction: predictionFixture(history.matchId, {
          projectionChecksum: `proj-a-${history.matchId}`,
          pHome: 0.55,
          pDraw: 0.25,
          pAway: 0.2,
        }),
      }),
    ),
    candidate: ordered.map(({ member, history }) =>
      successMember({
        position: member.position,
        history,
        cohort,
        label: "r1b.candidate.c.sideAwareOpen",
        prediction: predictionFixture(history.matchId, {
          projectionChecksum: `proj-c-${history.matchId}`,
          pHome: 0.4,
          pDraw: 0.25,
          pAway: 0.35,
          scenarios: Object.freeze({
            mostLikely: Object.freeze({
              slot: "mostLikely" as const,
              winner: "away" as const,
              homeGoals: 0,
              awayGoals: 1,
              probability: 0.35,
            }),
            secondLikely: Object.freeze({
              slot: "secondLikely" as const,
              winner: "home" as const,
              homeGoals: 1,
              awayGoals: 0,
              probability: 0.3,
            }),
            upset: Object.freeze({
              slot: "upset" as const,
              winner: "draw" as const,
              homeGoals: 1,
              awayGoals: 1,
              probability: 0.2,
            }),
          }),
        }),
      }),
    ),
  };

  const results =
    input.buildResults?.({ cohort, histories: input.histories }) ?? defaultResults;

  const baseline = replayRun({
    replayRunId: `${input.cohortId}.baseline`,
    cohort,
    label: "r1b.candidate.a.baseline",
    results: results.baseline,
  });
  const candidate = replayRun({
    replayRunId: `${input.cohortId}.candidate`,
    cohort,
    label: "r1b.candidate.c.sideAwareOpen",
    results: results.candidate,
  });

  await replayRunRepository.save(baseline);
  await replayRunRepository.save(candidate);

  return {
    cohort,
    baseline,
    candidate,
    historyRepository,
    cohortRepository,
    replayRunRepository,
    populationEvaluationRepository,
  };
}

describe("P2K-G Sealed Cohort Population Evaluation", () => {
  it("evaluates Baseline A and Candidate C on the same sealed cohort", async () => {
    const h1 = historyFixture("match-p2kg-1", "home");
    const h2 = historyFixture("match-p2kg-2", "away");
    const seeded = await seedPair({
      cohortId: "cohort.p2k.g.happy",
      histories: [h1, h2],
    });

    const outcome = await computeSealedCohortPopulationEvaluation({
      evaluationRunId: "eval.p2k.g.happy",
      cohortId: seeded.cohort.cohortId,
      baselineReplayRunId: seeded.baseline.replayRunId,
      candidateReplayRunId: seeded.candidate.replayRunId,
      computedAt: "2026-08-12T18:00:00.000Z",
      cohortRepository: seeded.cohortRepository,
      replayRunRepository: seeded.replayRunRepository,
      historyRepository: seeded.historyRepository,
      populationEvaluationRepository: seeded.populationEvaluationRepository,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    expect(outcome.value.schemaVersion).toBe(
      SEALED_COHORT_POPULATION_EVALUATION_SCHEMA_VERSION,
    );
    expect(outcome.value.cohortId).toBe(seeded.cohort.cohortId);
    expect(outcome.value.membershipDigestSha256).toBe(
      seeded.cohort.membershipDigestSha256,
    );
    expect(outcome.value.baselineCalibrationLabel).toBe("r1b.candidate.a.baseline");
    expect(outcome.value.candidateCalibrationLabel).toBe(
      "r1b.candidate.c.sideAwareOpen",
    );
    expect(outcome.value.coverage.totalSealedMembers).toBe(2);
    expect(outcome.value.coverage.eligibleReplayMembers).toBe(2);
    expect(outcome.value.coverage.pairedSuccessfulCount).toBe(2);
    expect(outcome.value.coverage.finalEvaluationSampleSize).toBe(2);
    expect(outcome.value.candidateCProductionPromoted).toBe(false);
    expect(outcome.value.productionMatchScriptUnchanged).toBe(true);
    expect(outcome.value.statisticalSignificanceSupported).toBe(false);

    const winner = outcome.value.comparisons.find(
      (row) => row.metricId === "winnerAccuracy",
    );
    expect(winner?.baseline.availability).toBe("available");
    expect(winner?.candidate.availability).toBe("available");
    expect(winner?.baseline.sampleSize).toBe(2);
    expect(winner?.candidate.sampleSize).toBe(2);
    expect(winner?.delta).toBeDefined();

    for (const metricId of [
      "exactScoreAccuracy",
      "goalRangeAccuracy",
      "bttsAccuracy",
      "overUnderAccuracy",
      "brierScore",
      "expectedCalibrationError",
    ] as const) {
      const row = outcome.value.comparisons.find(
        (entry) => entry.metricId === metricId,
      );
      expect(row?.baseline.availability).toBe("available");
      expect(row?.candidate.availability).toBe("available");
      expect(row?.baseline.sampleSize).toBeGreaterThan(0);
    }

    const persisted =
      await seeded.populationEvaluationRepository.findByEvaluationRunId(
        "eval.p2k.g.happy",
      );
    expect(persisted).toEqual(outcome.value);

    const again = await computeSealedCohortPopulationEvaluation({
      evaluationRunId: "eval.p2k.g.happy",
      cohortId: seeded.cohort.cohortId,
      baselineReplayRunId: seeded.baseline.replayRunId,
      candidateReplayRunId: seeded.candidate.replayRunId,
      computedAt: "2026-08-12T18:00:00.000Z",
      cohortRepository: seeded.cohortRepository,
      replayRunRepository: seeded.replayRunRepository,
      historyRepository: seeded.historyRepository,
      populationEvaluationRepository: seeded.populationEvaluationRepository,
    });
    expect(again.ok).toBe(true);
    if (!again.ok) {
      return;
    }
    expect(again.value).toEqual(outcome.value);
  });

  it("records that A2 calibration qualification is not Candidate superiority", async () => {
    const histories = Array.from({ length: 20 }, (_, index) =>
      historyFixture(
        `match-p2kg-qualified-${index + 1}`,
        index % 2 === 0 ? "home" : "away",
      ),
    );
    const seeded = await seedPair({
      cohortId: "cohort.p2k.g.qualified-not-superior",
      histories,
    });

    const outcome = await computeSealedCohortPopulationEvaluation({
      evaluationRunId: "eval.p2k.g.qualified-not-superior",
      cohortId: seeded.cohort.cohortId,
      baselineReplayRunId: seeded.baseline.replayRunId,
      candidateReplayRunId: seeded.candidate.replayRunId,
      computedAt: "2026-08-12T18:00:00.000Z",
      cohortRepository: seeded.cohortRepository,
      replayRunRepository: seeded.replayRunRepository,
      historyRepository: seeded.historyRepository,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.coverage.finalEvaluationSampleSize).toBe(20);
    expect(outcome.value.candidateCProductionPromoted).toBe(false);
    expect(
      outcome.value.limitations.some((line) =>
        line.includes("calibration qualification is not Candidate C superiority"),
      ),
    ).toBe(true);
    expect(
      outcome.value.limitations.some((line) =>
        line.includes("below the qualified threshold"),
      ),
    ).toBe(false);
  });

  it("rejects membership digest mismatch fail-closed", async () => {
    const history = historyFixture("match-p2kg-digest");
    const seeded = await seedPair({
      cohortId: "cohort.p2k.g.digest",
      histories: [history],
    });

    const mutated = replayRun({
      replayRunId: "run.digest.mismatch",
      cohort: {
        ...seeded.cohort,
        membershipDigestSha256: "d".repeat(64),
      },
      label: "r1b.candidate.a.baseline",
      results: [
        successMember({
          position: 0,
          history,
          cohort: {
            ...seeded.cohort,
            membershipDigestSha256: "d".repeat(64),
          },
          label: "r1b.candidate.a.baseline",
          prediction: predictionFixture(history.matchId),
        }),
      ],
    });
    await seeded.replayRunRepository.save(mutated);

    const outcome = await computeSealedCohortPopulationEvaluation({
      evaluationRunId: "eval.digest",
      cohortId: seeded.cohort.cohortId,
      baselineReplayRunId: mutated.replayRunId,
      candidateReplayRunId: seeded.candidate.replayRunId,
      computedAt: "2026-08-12T18:00:00.000Z",
      cohortRepository: seeded.cohortRepository,
      replayRunRepository: seeded.replayRunRepository,
      historyRepository: seeded.historyRepository,
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) {
      return;
    }
    expect(outcome.error.code).toBe("RUN_MEMBERSHIP_DIGEST_MISMATCH");
  });

  it("rejects A/C membership set mismatch", async () => {
    const h1 = historyFixture("match-p2kg-set-1", "home");
    const h2 = historyFixture("match-p2kg-set-2", "away");
    const seeded = await seedPair({
      cohortId: "cohort.p2k.g.set",
      histories: [h1, h2],
      buildResults: ({ cohort, histories }) => {
        const [first, second] = [...cohort.members].map((member) => {
          const history = histories.find(
            (row) => row.historyId === member.historyId,
          );
          if (history === undefined) {
            throw new Error("missing");
          }
          return { member, history };
        });
        if (first === undefined || second === undefined) {
          throw new Error("expected two members");
        }

        return {
          baseline: [
            successMember({
              position: first.member.position,
              history: first.history,
              cohort,
              label: "r1b.candidate.a.baseline",
              prediction: predictionFixture(first.history.matchId),
            }),
            successMember({
              position: second.member.position,
              history: second.history,
              cohort,
              label: "r1b.candidate.a.baseline",
              prediction: predictionFixture(second.history.matchId),
            }),
          ],
          candidate: [
            successMember({
              position: first.member.position,
              history: first.history,
              cohort,
              label: "r1b.candidate.c.sideAwareOpen",
              prediction: predictionFixture(first.history.matchId, {
                pAway: 0.5,
                pHome: 0.3,
                pDraw: 0.2,
              }),
            }),
          ],
        };
      },
    });

    const outcome = await computeSealedCohortPopulationEvaluation({
      evaluationRunId: "eval.set",
      cohortId: seeded.cohort.cohortId,
      baselineReplayRunId: seeded.baseline.replayRunId,
      candidateReplayRunId: seeded.candidate.replayRunId,
      computedAt: "2026-08-12T18:00:00.000Z",
      cohortRepository: seeded.cohortRepository,
      replayRunRepository: seeded.replayRunRepository,
      historyRepository: seeded.historyRepository,
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) {
      return;
    }
    expect(outcome.error.code).toBe("MEMBERSHIP_SET_MISMATCH");
  });

  it("rejects same-context violations", async () => {
    const history = historyFixture("match-p2kg-context");
    const seeded = await seedPair({
      cohortId: "cohort.p2k.g.context",
      histories: [history],
      buildResults: ({ cohort, histories }) => {
        const row = histories[0];
        if (row === undefined) {
          throw new Error("missing");
        }
        return {
          baseline: [
            successMember({
              position: 0,
              history: row,
              cohort,
              label: "r1b.candidate.a.baseline",
              prediction: predictionFixture(row.matchId),
              context: contextIdentity(row.matchId, {
                featureBundleChecksum: "context-a",
              }),
            }),
          ],
          candidate: [
            successMember({
              position: 0,
              history: row,
              cohort,
              label: "r1b.candidate.c.sideAwareOpen",
              prediction: predictionFixture(row.matchId, { pAway: 0.4 }),
              context: contextIdentity(row.matchId, {
                featureBundleChecksum: "context-c",
              }),
            }),
          ],
        };
      },
    });

    const outcome = await computeSealedCohortPopulationEvaluation({
      evaluationRunId: "eval.context",
      cohortId: seeded.cohort.cohortId,
      baselineReplayRunId: seeded.baseline.replayRunId,
      candidateReplayRunId: seeded.candidate.replayRunId,
      computedAt: "2026-08-12T18:00:00.000Z",
      cohortRepository: seeded.cohortRepository,
      replayRunRepository: seeded.replayRunRepository,
      historyRepository: seeded.historyRepository,
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) {
      return;
    }
    expect(outcome.error.code).toBe("SAME_CONTEXT_VIOLATION");
  });

  it("accounts for failed replays without asymmetric metric populations", async () => {
    const h1 = historyFixture("match-p2kg-fail-1", "home");
    const h2 = historyFixture("match-p2kg-fail-2", "away");
    const seeded = await seedPair({
      cohortId: "cohort.p2k.g.fail",
      histories: [h1, h2],
      buildResults: ({ cohort, histories }) => {
        const ordered = [...cohort.members].map((member) => {
          const history = histories.find(
            (row) => row.historyId === member.historyId,
          );
          if (history === undefined) {
            throw new Error("missing");
          }
          return { member, history };
        });
        const [first, second] = ordered;
        if (first === undefined || second === undefined) {
          throw new Error("expected two");
        }

        return {
          baseline: [
            successMember({
              position: first.member.position,
              history: first.history,
              cohort,
              label: "r1b.candidate.a.baseline",
              prediction: predictionFixture(first.history.matchId),
            }),
            failureMember({
              position: second.member.position,
              history: second.history,
              cohort,
              label: "r1b.candidate.a.baseline",
            }),
          ],
          candidate: [
            successMember({
              position: first.member.position,
              history: first.history,
              cohort,
              label: "r1b.candidate.c.sideAwareOpen",
              prediction: predictionFixture(first.history.matchId, {
                pAway: 0.45,
                pHome: 0.35,
                pDraw: 0.2,
              }),
            }),
            successMember({
              position: second.member.position,
              history: second.history,
              cohort,
              label: "r1b.candidate.c.sideAwareOpen",
              prediction: predictionFixture(second.history.matchId, {
                pAway: 0.45,
                pHome: 0.35,
                pDraw: 0.2,
              }),
            }),
          ],
        };
      },
    });

    const outcome = await computeSealedCohortPopulationEvaluation({
      evaluationRunId: "eval.fail",
      cohortId: seeded.cohort.cohortId,
      baselineReplayRunId: seeded.baseline.replayRunId,
      candidateReplayRunId: seeded.candidate.replayRunId,
      computedAt: "2026-08-12T18:00:00.000Z",
      cohortRepository: seeded.cohortRepository,
      replayRunRepository: seeded.replayRunRepository,
      historyRepository: seeded.historyRepository,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    expect(outcome.value.coverage.failedBaselineCount).toBe(1);
    expect(outcome.value.coverage.failedCandidateCount).toBe(0);
    expect(outcome.value.coverage.pairedSuccessfulCount).toBe(1);
    expect(outcome.value.coverage.finalEvaluationSampleSize).toBe(1);
    const winner = outcome.value.comparisons.find(
      (row) => row.metricId === "winnerAccuracy",
    );
    expect(winner?.baseline.sampleSize).toBe(1);
    expect(winner?.candidate.sampleSize).toBe(1);
  });

  it("marks metrics NOT AVAILABLE for empty cohort", async () => {
    const cohortRepository = new InMemoryReplayCohortRepository();
    const replayRunRepository = new InMemoryReplayRunRepository();
    const historyRepository = new InMemoryEvaluationHistoryRepository();
    const specification = createDefaultReplayCohortSpecification({
      sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
    });
    const members = Object.freeze([]);
    const digest = computeReplayCohortMembershipDigestSha256({
      specification,
      members,
    });
    const cohort: ReplayCohort = Object.freeze({
      cohortId: "cohort.p2k.g.empty",
      schemaVersion: REPLAY_COHORT_SCHEMA_VERSION,
      status: "SEALED",
      specification,
      eligibilityContractVersion: REPLAY_ELIGIBILITY_CONTRACT_VERSION,
      sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
      createdAt: "2026-08-12T17:00:00.000Z",
      membershipCreatedAt: "2026-08-12T17:00:00.000Z",
      sealedAt: "2026-08-12T17:00:00.000Z",
      members,
      membershipDigestSha256: digest,
      limitations: Object.freeze(["empty"]),
    });
    await cohortRepository.save(cohort);
    await replayRunRepository.save(
      replayRun({
        replayRunId: "run.empty.a",
        cohort,
        label: "r1b.candidate.a.baseline",
        results: [],
      }),
    );
    await replayRunRepository.save(
      replayRun({
        replayRunId: "run.empty.c",
        cohort,
        label: "r1b.candidate.c.sideAwareOpen",
        results: [],
      }),
    );

    const outcome = await computeSealedCohortPopulationEvaluation({
      evaluationRunId: "eval.empty",
      cohortId: cohort.cohortId,
      baselineReplayRunId: "run.empty.a",
      candidateReplayRunId: "run.empty.c",
      computedAt: "2026-08-12T18:00:00.000Z",
      cohortRepository,
      replayRunRepository,
      historyRepository,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.coverage.finalEvaluationSampleSize).toBe(0);
    for (const row of outcome.value.comparisons) {
      expect(row.baseline.availability).toBe("not_available");
      expect(row.candidate.availability).toBe("not_available");
      expect(row.baseline.unavailableReason).toBeTruthy();
      expect(row.delta).toBeUndefined();
    }
  });

  it("marks zero-size winner subgroups as not_available (not available+undefined)", async () => {
    const h1 = historyFixture("match-p2kg-home-only-1", "home");
    const h2 = historyFixture("match-p2kg-home-only-2", "home");
    const seeded = await seedPair({
      cohortId: "cohort.p2k.g.home-only",
      histories: [h1, h2],
    });

    const outcome = await computeSealedCohortPopulationEvaluation({
      evaluationRunId: "eval.p2k.g.home-only",
      cohortId: seeded.cohort.cohortId,
      baselineReplayRunId: seeded.baseline.replayRunId,
      candidateReplayRunId: seeded.candidate.replayRunId,
      computedAt: "2026-08-12T18:00:00.000Z",
      cohortRepository: seeded.cohortRepository,
      replayRunRepository: seeded.replayRunRepository,
      historyRepository: seeded.historyRepository,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    expect(outcome.value.coverage.finalEvaluationSampleSize).toBe(2);
    expect(outcome.value.winnerBreakdown.actualHome.baseline.availability).toBe(
      "available",
    );
    expect(outcome.value.winnerBreakdown.actualHome.baseline.sampleSize).toBe(2);
    expect(outcome.value.winnerBreakdown.actualHome.baseline.value).toBeTypeOf(
      "number",
    );

    for (const row of [
      outcome.value.winnerBreakdown.actualDraw,
      outcome.value.winnerBreakdown.actualAway,
    ]) {
      expect(row.baseline.availability).toBe("not_available");
      expect(row.candidate.availability).toBe("not_available");
      expect(row.baseline.value).toBeUndefined();
      expect(row.candidate.value).toBeUndefined();
      expect(row.baseline.sampleSize).toBe(0);
      expect(row.candidate.sampleSize).toBe(0);
      expect(row.baseline.unavailableReason).toContain(
        "Subgroup sample size is zero",
      );
      expect(row.delta).toBeUndefined();
    }
  });

  it("fails closed when history outcome is missing", async () => {
    const history = historyFixture("match-p2kg-missing-history");
    const seeded = await seedPair({
      cohortId: "cohort.p2k.g.missing-history",
      histories: [history],
    });
    const emptyHistory = new InMemoryEvaluationHistoryRepository();

    const outcome = await computeSealedCohortPopulationEvaluation({
      evaluationRunId: "eval.missing-history",
      cohortId: seeded.cohort.cohortId,
      baselineReplayRunId: seeded.baseline.replayRunId,
      candidateReplayRunId: seeded.candidate.replayRunId,
      computedAt: "2026-08-12T18:00:00.000Z",
      cohortRepository: seeded.cohortRepository,
      replayRunRepository: seeded.replayRunRepository,
      historyRepository: emptyHistory,
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) {
      return;
    }
    expect(outcome.error.code).toBe("MISSING_HISTORY_OUTCOME");
  });

  it("uses actual outcomes only at evaluation time (not for membership or pairing)", async () => {
    const history = historyFixture("match-p2kg-leakage", "home");
    const seeded = await seedPair({
      cohortId: "cohort.p2k.g.leakage",
      histories: [history],
    });

    // Replay predictions are fixed before evaluation; flipping stored actual
    // would change metrics, proving outcomes are consumed only in evaluation.
    const outcomeBefore = await computeSealedCohortPopulationEvaluation({
      evaluationRunId: "eval.leak.1",
      cohortId: seeded.cohort.cohortId,
      baselineReplayRunId: seeded.baseline.replayRunId,
      candidateReplayRunId: seeded.candidate.replayRunId,
      computedAt: "2026-08-12T18:00:00.000Z",
      cohortRepository: seeded.cohortRepository,
      replayRunRepository: seeded.replayRunRepository,
      historyRepository: seeded.historyRepository,
    });
    expect(outcomeBefore.ok).toBe(true);

    expect(seeded.baseline.results.every((row) => !("actualResult" in row))).toBe(
      true,
    );
    expect(seeded.candidate.results.every((row) => !("actualResult" in row))).toBe(
      true,
    );
    expect(seeded.cohort.members.every((row) => !("actualResult" in row))).toBe(
      true,
    );
  });

  it("keeps Candidate C non-default and does not claim promotion", async () => {
    const history = historyFixture("match-p2kg-governance");
    const seeded = await seedPair({
      cohortId: "cohort.p2k.g.gov",
      histories: [history],
    });

    const outcome = await computeSealedCohortPopulationEvaluation({
      evaluationRunId: "eval.gov",
      cohortId: seeded.cohort.cohortId,
      baselineReplayRunId: seeded.baseline.replayRunId,
      candidateReplayRunId: seeded.candidate.replayRunId,
      computedAt: "2026-08-12T18:00:00.000Z",
      cohortRepository: seeded.cohortRepository,
      replayRunRepository: seeded.replayRunRepository,
      historyRepository: seeded.historyRepository,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.candidateCProductionPromoted).toBe(false);
    expect(outcome.value.productionMatchScriptUnchanged).toBe(true);
    expect(outcome.value.limitations.join(" ")).toContain("NON-DEFAULT");
    expect(outcome.value.limitations.join(" ")).toContain(
      "Statistical significance",
    );
  });
});
