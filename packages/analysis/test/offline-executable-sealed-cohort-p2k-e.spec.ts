import {
  assessProjectionReplayEligibility,
  buildEvaluationHistoryRecord,
  computeProjectionReplaySidecarContentSha256,
  computeReplayCohortMembershipDigestSha256,
  createActualMatchResult,
  evaluatePrediction,
  InMemoryEvaluationHistoryRepository,
  InMemoryProjectionReplaySidecarRepository,
  InMemoryReplayCohortRepository,
  PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
  REPLAY_ELIGIBILITY_CONTRACT_VERSION,
  SealedReplayCohortImmutableError,
  type EvaluationHistoryRecord,
  type SealedProjectionReplayContext,
} from "@fas/statistics";
import { describe, expect, it } from "vitest";

import {
  createAndSealOfflineExecutableReplayCohort,
  GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
  MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
  MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
  R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE,
} from "../src/index.js";

function scoredHistory(matchId: string): EvaluationHistoryRecord {
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
    projectionModelVersion: "projection.v2.m1b.manager",
    featureModelVersion: "feature.v2.m1b.manager",
    ruleSetVersion: "rule.mvp.m1b.manager",
  });

  const actual = createActualMatchResult({
    matchId,
    homeGoals: 1,
    awayGoals: 0,
    winner: "home",
    totalGoals: 1,
    matchStatus: "FINISHED",
    providerId: "football:p2k-e-v2",
    providerSourceId: `${matchId}:result`,
    providerMethod: "test",
    observedAt: "2026-08-13T12:00:00.000Z",
  });

  const evaluation = evaluatePrediction({
    prediction,
    actual,
    evaluatedAt: "2026-08-13T12:00:00.000Z",
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
    matchDate: "2026-08-13T10:00:00.000Z",
    recordedAt: "2026-08-13T12:00:00.000Z",
  });
}

function context(
  matchId: string,
  overrides: Partial<SealedProjectionReplayContext> = {},
): SealedProjectionReplayContext {
  return Object.freeze({
    matchId,
    featureModelVersion: "feature.v2.m1b.manager",
    featureBundleChecksum: "fb-checksum",
    featureBundleStatus: "completed_nonempty",
    evidenceRefs: Object.freeze(["ev-1"]),
    features: Object.freeze([
      Object.freeze({ name: "attackRatingHome", value: 1.1 }),
    ]),
    rules: Object.freeze([
      Object.freeze({
        ruleId: "rule:home-attack-edge:v1",
        ruleName: "HOME_ATTACK_EDGE",
        status: "PASS" as const,
        channel: "home+" as const,
        weight: 0.7,
        score: 0.7,
      }),
    ]),
    requiredEvidencePresentCount: 5,
    generatedAt: "2026-08-13T12:00:00.000Z",
    ...overrides,
  });
}

describe("P2K-E offline-executable sealed cohort (v2 recovery namespace)", () => {
  it("seals only namespace members that are P2K-C eligible and offlineReplayExecutable", async () => {
    const historyRepository = new InMemoryEvaluationHistoryRepository();
    const sidecarRepository = new InMemoryProjectionReplaySidecarRepository();
    const cohortRepository = new InMemoryReplayCohortRepository();

    const recovery = scoredHistory("match-p2kg-recovery-v2-1");
    const v1Unpinned = scoredHistory("match-example-1");
    const fixture = scoredHistory("match-p2k-fixture");

    await historyRepository.save(recovery);
    await historyRepository.save(v1Unpinned);
    await historyRepository.save(fixture);

    await sidecarRepository.save({
      historyId: recovery.historyId,
      matchId: recovery.matchId,
      context: context(recovery.matchId, {
        parameterVersionLabel: "projection.v3.replay",
        parameterArtifactId: "projectionParams:v3.1:matchScript",
        parameterArtifactChecksum: "d7b2f4fd",
      }),
    });

    await sidecarRepository.save({
      historyId: v1Unpinned.historyId,
      matchId: v1Unpinned.matchId,
      context: context(v1Unpinned.matchId),
    });

    await sidecarRepository.save({
      historyId: fixture.historyId,
      matchId: fixture.matchId,
      context: context(fixture.matchId, {
        featureModelVersion: "feature.v2.test",
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
      }),
    });

    const v1Sidecar = await sidecarRepository.findRecordByHistoryId(
      v1Unpinned.historyId,
    );
    const v1Eligibility = assessProjectionReplayEligibility({
      history: v1Unpinned,
      sidecar: v1Sidecar,
      hashContext: computeProjectionReplaySidecarContentSha256,
    });
    expect(v1Eligibility.replayEligible).toBe(true);
    expect(v1Eligibility.reasons).toContain("PARAMETER_ARTIFACT_UNPINNED");

    const sealed = await createAndSealOfflineExecutableReplayCohort({
      cohortId: "p2k.e.validation.recovery.v2.analyzematch.v1",
      matchIdPrefix: "match-p2kg-recovery-v2-",
      historyRepository,
      sidecarRepository,
      cohortRepository,
      sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
      clock: () => "2026-08-13T13:00:00.000Z",
    });

    expect(sealed.ok).toBe(true);
    if (!sealed.ok) {
      return;
    }

    expect(sealed.selectedMemberCount).toBe(1);
    expect(sealed.namespaceHistoryCount).toBe(1);
    expect(sealed.p2kCEligibleCount).toBe(1);
    expect(sealed.offlineReplayExecutableCount).toBe(1);
    expect(sealed.value.status).toBe("SEALED");
    expect(sealed.value.members.map((member) => member.matchId)).toEqual([
      "match-p2kg-recovery-v2-1",
    ]);
    expect(sealed.value.specification.ordering).toBe("historyId_asc");
    expect(sealed.value.eligibilityContractVersion).toBe(
      REPLAY_ELIGIBILITY_CONTRACT_VERSION,
    );
    expect(sealed.value.membershipDigestSha256).toBe(
      computeReplayCohortMembershipDigestSha256({
        specification: sealed.value.specification,
        members: sealed.value.members,
      }),
    );

    expect(
      sealed.exclusions.some(
        (row) =>
          row.matchId === "match-example-1" && row.reason === "OUT_OF_NAMESPACE",
      ),
    ).toBe(true);
    expect(
      sealed.exclusions.some(
        (row) =>
          row.matchId === "match-p2k-fixture" && row.reason === "OUT_OF_NAMESPACE",
      ),
    ).toBe(true);

    const mutated = Object.freeze({
      ...sealed.value,
      members: Object.freeze([
        Object.freeze({
          historyId: v1Unpinned.historyId,
          matchId: v1Unpinned.matchId,
          position: 0,
        }),
      ]),
      membershipDigestSha256: "0".repeat(64),
    });
    await expect(cohortRepository.save(mutated)).rejects.toBeInstanceOf(
      SealedReplayCohortImmutableError,
    );

    expect(GOVERNED_MATCH_SCRIPT_PARAMETER_SET).toBe(
      MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
    );
    expect(MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET).not.toBe(
      GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
    );
    expect(
      R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE.candidateC.productionPromoted,
    ).toBe(false);
  });
});
