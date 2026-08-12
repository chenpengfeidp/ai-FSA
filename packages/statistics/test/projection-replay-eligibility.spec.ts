import { describe, expect, it } from "vitest";
import {
  assessProjectionReplayEligibility,
  buildEvaluationHistoryRecord,
  classifySidecarBackfill,
  computeProjectionReplaySidecarContentSha256,
  createActualMatchResult,
  createEvaluationHistoryRecord,
  evaluatePrediction,
  InMemoryEvaluationHistoryRepository,
  InMemoryProjectionReplaySidecarRepository,
  PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
  summarizeProjectionReplayEligibility,
  type EvaluationHistoryRecord,
  type ProjectionReplaySidecarRecord,
  type SealedProjectionReplayContext,
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
    projectionModelVersion: "projection.v2.test",
    featureModelVersion: "feature.v2.test",
    ruleSetVersion: "rule.mvp.test",
  });

  const actual = createActualMatchResult({
    matchId,
    homeGoals: 1,
    awayGoals: 0,
    winner: "home",
    totalGoals: 1,
    matchStatus: "FINISHED",
    providerId: "football:p2k-c",
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
    parameterVersionLabel: "projectionParams:v3.1:matchScript",
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

describe("P2K-C Projection Replay eligibility", () => {
  it("marks History + valid Sidecar as replay complete and outcome evaluable", () => {
    const history = scoredHistory("match-complete");
    const context = sampleContext(history.matchId);
    const assessment = assessProjectionReplayEligibility({
      history,
      sidecar: sidecarRecord(history, context),
      hashContext: computeProjectionReplaySidecarContentSha256,
    });

    expect(assessment.replayComplete).toBe(true);
    expect(assessment.outcomeEvaluable).toBe(true);
    expect(assessment.replayEligible).toBe(true);
    expect(assessment.reasons).not.toContain("MISSING_SIDECAR");
  });

  it("marks History without Sidecar as replay incomplete", () => {
    const history = scoredHistory("match-legacy");
    const assessment = assessProjectionReplayEligibility({
      history,
      sidecar: undefined,
      hashContext: computeProjectionReplaySidecarContentSha256,
    });

    expect(assessment.replayComplete).toBe(false);
    expect(assessment.replayEligible).toBe(false);
    expect(assessment.reasons).toContain("MISSING_SIDECAR");
    expect(assessment.outcomeEvaluable).toBe(true);
  });

  it("marks unsupported Sidecar schema as replay incomplete", () => {
    const history = scoredHistory("match-schema");
    const context = sampleContext(history.matchId);
    const assessment = assessProjectionReplayEligibility({
      history,
      sidecar: sidecarRecord(history, context, {
        schemaVersion: "projection-replay-sidecar.unknown",
      }),
      hashContext: computeProjectionReplaySidecarContentSha256,
    });

    expect(assessment.replayComplete).toBe(false);
    expect(assessment.reasons).toContain("UNSUPPORTED_SIDECAR_SCHEMA");
  });

  it("marks invalid content hash as replay incomplete", () => {
    const history = scoredHistory("match-hash");
    const context = sampleContext(history.matchId);
    const assessment = assessProjectionReplayEligibility({
      history,
      sidecar: sidecarRecord(history, context, {
        contentSha256: "0".repeat(64),
      }),
      hashContext: computeProjectionReplaySidecarContentSha256,
    });

    expect(assessment.replayComplete).toBe(false);
    expect(assessment.reasons).toContain("INVALID_SIDECAR_HASH");
  });

  it("marks missing replay context / empty features as incomplete", () => {
    const history = scoredHistory("match-context");
    const context = sampleContext(history.matchId, {
      features: Object.freeze([]),
      rules: Object.freeze([]),
      featureBundleChecksum: "",
    });
    const assessment = assessProjectionReplayEligibility({
      history,
      sidecar: sidecarRecord(history, context),
      hashContext: computeProjectionReplaySidecarContentSha256,
    });

    expect(assessment.replayComplete).toBe(false);
    expect(assessment.reasons).toEqual(
      expect.arrayContaining([
        "MISSING_FEATURES",
        "MISSING_RULES",
        "MISSING_REPLAY_CONTEXT",
      ]),
    );
  });

  it("keeps replay complete but not outcome evaluable for unfinished match status", () => {
    const history = scoredHistory("match-unfinished");
    const unfinished = createEvaluationHistoryRecord({
      ...history,
      actualResult: Object.freeze({
        ...history.actualResult,
        // Domain today only constructs FINISHED via createActualMatchResult;
        // eligibility still distinguishes non-FINISHED for future outcome states.
        matchStatus: "POSTPONED" as typeof history.actualResult.matchStatus,
      }),
    });
    const context = sampleContext(unfinished.matchId);
    const assessment = assessProjectionReplayEligibility({
      history: unfinished,
      sidecar: sidecarRecord(unfinished, context),
      hashContext: computeProjectionReplaySidecarContentSha256,
    });

    expect(assessment.replayComplete).toBe(true);
    expect(assessment.outcomeEvaluable).toBe(false);
    expect(assessment.replayEligible).toBe(false);
    expect(assessment.reasons).toContain("OUTCOME_NOT_FINISHED");
  });

  it("marks finished scored History as outcome evaluable when Sidecar is complete", () => {
    const history = scoredHistory("match-finished");
    const context = sampleContext(history.matchId);
    const assessment = assessProjectionReplayEligibility({
      history,
      sidecar: sidecarRecord(history, context),
      hashContext: computeProjectionReplaySidecarContentSha256,
    });

    expect(assessment.replayComplete).toBe(true);
    expect(assessment.outcomeEvaluable).toBe(true);
    expect(assessment.replayEligible).toBe(true);
  });

  it("classifies missing parameter artifact pin without failing completeness", () => {
    const history = scoredHistory("match-param");
    const context = sampleContext(history.matchId, {
      parameterArtifactId: undefined,
      parameterVersionLabel: undefined,
      parameterArtifactChecksum: undefined,
    });
    const assessment = assessProjectionReplayEligibility({
      history,
      sidecar: sidecarRecord(history, context),
      hashContext: computeProjectionReplaySidecarContentSha256,
    });

    expect(assessment.replayComplete).toBe(true);
    expect(assessment.reasons).toContain("PARAMETER_ARTIFACT_UNPINNED");
  });

  it("keeps legacy History readable and classifies backfill as manual review", async () => {
    const history = scoredHistory("match-readable-legacy");
    const historyRepo = new InMemoryEvaluationHistoryRepository();
    await historyRepo.save(history);
    const loaded = await historyRepo.findByHistoryId(history.historyId);
    expect(loaded?.historyId).toBe(history.historyId);

    const eligibility = assessProjectionReplayEligibility({
      history,
      sidecar: undefined,
      hashContext: computeProjectionReplaySidecarContentSha256,
    });
    const backfill = classifySidecarBackfill({
      history,
      sidecar: undefined,
      eligibility,
    });

    expect(backfill.classification).toBe("MANUAL_REVIEW_REQUIRED");
    expect(backfill.automaticBackfillAllowed).toBe(false);
  });

  it("never allows automatic backfill for integrity failures", () => {
    const history = scoredHistory("match-integrity-backfill");
    const context = sampleContext(history.matchId);
    const sidecar = sidecarRecord(history, context, {
      contentSha256: "f".repeat(64),
    });
    const eligibility = assessProjectionReplayEligibility({
      history,
      sidecar,
      hashContext: computeProjectionReplaySidecarContentSha256,
    });
    const backfill = classifySidecarBackfill({ history, sidecar, eligibility });

    expect(backfill.classification).toBe("PERMANENTLY_INELIGIBLE");
    expect(backfill.automaticBackfillAllowed).toBe(false);
  });

  it("summarizes population eligibility counts without fabricating Sidecars", async () => {
    const historyRepo = new InMemoryEvaluationHistoryRepository();
    const sidecarRepo = new InMemoryProjectionReplaySidecarRepository();
    const complete = scoredHistory("match-sum-complete");
    const legacy = scoredHistory("match-sum-legacy");

    await historyRepo.save(complete);
    await historyRepo.save(legacy);
    await sidecarRepo.save({
      historyId: complete.historyId,
      matchId: complete.matchId,
      context: sampleContext(complete.matchId),
    });

    const summary = await summarizeProjectionReplayEligibility({
      historyRepository: historyRepo,
      sidecarRepository: sidecarRepo,
    });

    expect(summary.totalHistoryRecords).toBe(2);
    expect(summary.replayCompleteRecords).toBe(1);
    expect(summary.replayIncompleteRecords).toBe(1);
    expect(summary.missingSidecarRecords).toBe(1);
    expect(summary.outcomeEvaluableRecords).toBe(2);
    expect(summary.replayEligibleRecords).toBe(1);
    expect(summary.integrityFailureRecords).toBe(0);
  });

  it("does not invent SAFE_TO_BACKFILL for missing Sidecar", () => {
    const history = scoredHistory("match-no-safe");
    const eligibility = assessProjectionReplayEligibility({
      history,
      sidecar: undefined,
      hashContext: computeProjectionReplaySidecarContentSha256,
    });
    const backfill = classifySidecarBackfill({
      history,
      sidecar: undefined,
      eligibility,
    });

    expect(backfill.classification).not.toBe("SAFE_TO_BACKFILL");
    expect(backfill.automaticBackfillAllowed).toBe(false);
  });
});
