import {
  assessProjectionReplayEligibility,
  buildEvaluationHistoryRecord,
  computeProjectionReplaySidecarContentSha256,
  computeReplayCohortMembershipDigestSha256,
  createActualMatchResult,
  createAndSealReplayCohort,
  createDefaultReplayCohortSpecification,
  evaluatePrediction,
  InMemoryEvaluationHistoryRepository,
  InMemoryProjectionReplaySidecarRepository,
  InMemoryReplayCohortRepository,
  PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
  REPLAY_ELIGIBILITY_CONTRACT_VERSION,
  SealedReplayCohortImmutableError,
  type EvaluationHistoryRecord,
  type ProjectionReplaySidecarRecord,
  type SealedProjectionReplayContext,
} from "@fas/statistics";
import { describe, expect, it } from "vitest";

import {
  createAndSealOfflineRebuildableReplayCohort,
  GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
  MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
  MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
  R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE,
} from "../src/index.js";

function scoredHistory(
  matchId: string,
  featureModelVersion = "feature.v2.m1b.manager",
): EvaluationHistoryRecord {
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
    featureModelVersion,
    ruleSetVersion: "rule.mvp.m1b.manager",
  });

  const actual = createActualMatchResult({
    matchId,
    homeGoals: 1,
    awayGoals: 0,
    winner: "home",
    totalGoals: 1,
    matchStatus: "FINISHED",
    providerId: "football:p2k-e-validation",
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

function context(
  matchId: string,
  rules: SealedProjectionReplayContext["rules"],
  featureModelVersion: string,
): SealedProjectionReplayContext {
  return Object.freeze({
    matchId,
    featureModelVersion,
    featureBundleChecksum: "fb-checksum",
    featureBundleStatus: "completed_nonempty",
    evidenceRefs: Object.freeze(["ev-1"]),
    features: Object.freeze([
      Object.freeze({ name: "attackRatingHome", value: 1.1 }),
    ]),
    rules,
    requiredEvidencePresentCount: 5,
    generatedAt: "2026-08-12T12:00:00.000Z",
    parameterArtifactId: "artifact-1",
    parameterVersionLabel: "projection.v3.replay",
    parameterArtifactChecksum: "param-1",
  });
}

function sidecarRecord(
  history: EvaluationHistoryRecord,
  ctx: SealedProjectionReplayContext,
): ProjectionReplaySidecarRecord {
  return Object.freeze({
    historyId: history.historyId,
    matchId: history.matchId,
    schemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
    contentSha256: computeProjectionReplaySidecarContentSha256(ctx),
    context: ctx,
  });
}

describe("P2K-E offline-rebuildable sealed cohort orchestration", () => {
  it("excludes P2K-C-eligible fixture Sidecars and seals only rebuildable members", async () => {
    const historyRepository = new InMemoryEvaluationHistoryRepository();
    const sidecarRepository = new InMemoryProjectionReplaySidecarRepository();
    const cohortRepository = new InMemoryReplayCohortRepository();

    const valid = scoredHistory("match-example-rebuildable");
    const fixture = scoredHistory("match-p2k-fixture", "feature.v2.test");

    await historyRepository.save(valid);
    await historyRepository.save(fixture);

    await sidecarRepository.save({
      historyId: valid.historyId,
      matchId: valid.matchId,
      context: context(
        valid.matchId,
        Object.freeze([
          Object.freeze({
            ruleId: "rule:home-attack-edge:v1",
            ruleName: "HOME_ATTACK_EDGE",
            status: "PASS" as const,
            channel: "home+" as const,
            weight: 0.7,
            score: 0.7,
          }),
        ]),
        "feature.v2.m1b.manager",
      ),
    });

    await sidecarRepository.save({
      historyId: fixture.historyId,
      matchId: fixture.matchId,
      context: context(
        fixture.matchId,
        Object.freeze([
          Object.freeze({
            ruleId: "rule-p2k",
            ruleName: "HOME_ATTACK_EDGE",
            status: "PASS" as const,
            channel: "home+" as const,
            weight: 1,
            score: 0.3,
          }),
        ]),
        "feature.v2.test",
      ),
    });

    const fixtureSidecar = await sidecarRepository.findRecordByHistoryId(
      fixture.historyId,
    );
    const fixtureEligibility = assessProjectionReplayEligibility({
      history: fixture,
      sidecar: fixtureSidecar,
      hashContext: computeProjectionReplaySidecarContentSha256,
    });
    expect(fixtureEligibility.replayEligible).toBe(true);

    const naive = await createAndSealReplayCohort({
      cohortId: "p2k.e.naive.includes-fixtures",
      specification: createDefaultReplayCohortSpecification({
        sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
      }),
      historyRepository,
      sidecarRepository,
      cohortRepository,
      clock: () => "2026-08-12T15:00:00.000Z",
    });
    expect(naive.ok).toBe(true);
    if (naive.ok) {
      expect(naive.value.members).toHaveLength(2);
    }

    const gated = await createAndSealOfflineRebuildableReplayCohort({
      cohortId: "p2k.e.validation.offline-rebuildable.v1",
      historyRepository,
      sidecarRepository,
      cohortRepository,
      sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
      clock: () => "2026-08-12T15:00:00.000Z",
    });

    expect(gated.ok).toBe(true);
    if (!gated.ok) {
      return;
    }

    expect(gated.selectedMemberCount).toBe(1);
    expect(gated.value.status).toBe("SEALED");
    expect(gated.value.members.map((member) => member.historyId)).toEqual([
      valid.historyId,
    ]);
    expect(gated.value.eligibilityContractVersion).toBe(
      REPLAY_ELIGIBILITY_CONTRACT_VERSION,
    );
    expect(gated.value.sidecarSchemaVersion).toBe(
      PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
    );
    expect(gated.value.specification.ordering).toBe("historyId_asc");
    expect(gated.value.membershipDigestSha256).toBe(
      computeReplayCohortMembershipDigestSha256({
        specification: gated.value.specification,
        members: gated.value.members,
      }),
    );

    expect(gated.p2kCEligibleButNotRebuildableCount).toBe(1);
    expect(
      gated.exclusions.some(
        (row) =>
          row.historyId === fixture.historyId &&
          row.reason === "OFFLINE_RULE_RESULT_NOT_REBUILDABLE",
      ),
    ).toBe(true);

    const mutated = Object.freeze({
      ...gated.value,
      members: Object.freeze([
        Object.freeze({
          historyId: fixture.historyId,
          matchId: fixture.matchId,
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
