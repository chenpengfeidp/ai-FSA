import {
  assessOfflineReplayExecutability,
  assessSealedReplayRuleRebuild,
} from "@fas/analysis";
import {
  assessProjectionReplayEligibility,
  buildEvaluationHistoryRecord,
  computeProjectionReplaySidecarContentSha256,
  createActualMatchResult,
  evaluatePrediction,
  PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
  type EvaluationHistoryRecord,
  type ProjectionReplaySidecarRecord,
  type SealedProjectionReplayContext,
} from "@fas/statistics";
import { describe, expect, it } from "vitest";

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
    providerId: "football:offline-exec",
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

function sidecar(
  history: EvaluationHistoryRecord,
  context: SealedProjectionReplayContext,
): ProjectionReplaySidecarRecord {
  return Object.freeze({
    historyId: history.historyId,
    matchId: history.matchId,
    schemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
    contentSha256: computeProjectionReplaySidecarContentSha256(context),
    context,
  });
}

function baseContext(
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

describe("assessOfflineReplayExecutability", () => {
  it("keeps P2K-C replayComplete distinct from offlineReplayExecutable when pin missing", () => {
    const history = scoredHistory("match-unpinned");
    const record = sidecar(history, baseContext(history.matchId));

    const p2kC = assessProjectionReplayEligibility({
      history,
      sidecar: record,
      hashContext: computeProjectionReplaySidecarContentSha256,
    });
    expect(p2kC.replayComplete).toBe(true);
    expect(p2kC.replayEligible).toBe(true);
    expect(p2kC.reasons).toContain("PARAMETER_ARTIFACT_UNPINNED");

    const assessment = assessOfflineReplayExecutability({
      history,
      sidecar: record,
    });
    expect(assessment.replayComplete).toBe(true);
    expect(assessment.offlineReplayExecutable).toBe(false);
    expect(assessment.reasons).toContain("PARAMETER_PROVENANCE_MISSING");
    expect(assessSealedReplayRuleRebuild(record.context).rebuildable).toBe(true);
  });

  it("marks offlineReplayExecutable when provenance is complete and rebuildable", () => {
    const history = scoredHistory("match-pinned");
    const record = sidecar(
      history,
      baseContext(history.matchId, {
        parameterVersionLabel: "projection.v3.replay",
        parameterArtifactId: "artifact-replay",
        parameterArtifactChecksum: "checksum-replay",
      }),
    );

    const assessment = assessOfflineReplayExecutability({
      history,
      sidecar: record,
    });
    expect(assessment.replayComplete).toBe(true);
    expect(assessment.parameterProvenance.complete).toBe(true);
    expect(assessment.parameterProvenance.registryRecognized).toBe(true);
    expect(assessment.ruleResultRebuildable).toBe(true);
    expect(assessment.offlineReplayExecutable).toBe(true);
    expect(assessment.reasons).toEqual([]);
  });
});
