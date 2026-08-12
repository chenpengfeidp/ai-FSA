import {
  createEvidence,
  type Evidence,
  InMemoryEvidenceRepository,
} from "@fas/evidence";
import { EvidenceQueryService } from "@fas/evidence-query";
import { FeatureExtractor } from "@fas/feature";
import { createMatchId, type MatchId } from "@fas/match";
import { RuleEvaluator } from "@fas/rule";
import {
  buildEvaluationHistoryRecord,
  createActualMatchResult,
  createAndSealReplayCohort,
  createDefaultReplayCohortSpecification,
  evaluatePrediction,
  InMemoryEvaluationHistoryRepository,
  InMemoryProjectionReplaySidecarRepository,
  InMemoryReplayCohortRepository,
  InMemoryReplayRunRepository,
  PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
  resolveSealedReplayCohort,
  type ReplayCohort,
  type ReplayCohortRepository,
} from "@fas/statistics";
import { describe, expect, it } from "vitest";
import {
  AnalyzeMatchUseCase,
  buildProjectionReplayContext,
  buildSealedPredictionInputFromAnalysis,
  executeSealedCohortOfflineReplayPair,
  executeSealedCohortOfflineReplayRun,
  getProductionMatchScriptParameterSet,
  GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
  MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
  MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
  R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE,
} from "../src/index.js";

function baseEvidence(
  id: string,
  type: Evidence["type"],
  matchId: MatchId,
  payload: Evidence["payload"],
): Evidence {
  return createEvidence({
    id,
    source: "fixture",
    sourceId: `${id}-source`,
    type,
    matchId,
    collectedAt: "2026-07-17T10:00:00Z",
    eventTime: "2026-08-01T19:30:00Z",
    freshness: "fresh",
    quality: "unverified",
    provenance: {
      collector: "@fas/evidence-normalizer",
      method: "fixture",
    },
    payload,
  });
}

function mvpEvidenceSet(matchId: MatchId): readonly Evidence[] {
  const form = (side: "away" | "home", results: readonly ("D" | "L" | "W")[]) =>
    baseEvidence(`evidence-form-${side}`, "TEAM_FORM", matchId, {
      teamSide: side,
      results,
      goalsFor: [2, 1, 1, 2, 0],
      goalsAgainst: [0, 1, 1, 0, 2],
    });
  const stats = (side: "away" | "home") =>
    baseEvidence(`evidence-stats-${side}`, "STATISTICS", matchId, {
      teamSide: side,
      windowMatches: 5,
      shotsForPerMatch: side === "home" ? 14 : 10,
      shotsAgainstPerMatch: side === "home" ? 9 : 13,
      xgForPerMatch: side === "home" ? 1.6 : 1.1,
      xgAgainstPerMatch: side === "home" ? 1.0 : 1.5,
    });

  return Object.freeze([
    baseEvidence("evidence-match", "MATCH_INFO", matchId, {
      home: "Home FC",
      away: "Away United",
      kickoff: "2026-08-01T19:30:00Z",
    }),
    form("home", ["W", "W", "D", "W", "W"]),
    form("away", ["L", "D", "L", "L", "W"]),
    stats("home"),
    stats("away"),
    baseEvidence("evidence-venue", "VENUE", matchId, {
      name: "Home Park",
      city: "Home City",
    }),
    baseEvidence("evidence-injury-home", "INJURY", matchId, {
      teamSide: "home",
      playerName: "Key Midfielder",
      status: "out",
    }),
  ]);
}

async function seedMatch(matchIdValue: string) {
  const matchId = createMatchId(matchIdValue);
  const evidences = mvpEvidenceSet(matchId);
  const evidenceRepo = new InMemoryEvidenceRepository();
  for (const evidence of evidences) {
    await evidenceRepo.save(evidence);
  }

  const analyzeMatch = new AnalyzeMatchUseCase(
    {
      execute: async () =>
        Object.freeze({
          ok: true,
          value: evidences[0] as Evidence,
        }),
    },
    new EvidenceQueryService(evidenceRepo),
    new FeatureExtractor(),
    new RuleEvaluator(),
    undefined,
    "v2",
  );
  const analysisResult = await analyzeMatch.execute(matchId);
  if (!analysisResult.ok) {
    throw new Error("analyze failed");
  }

  const analysis = analysisResult.value;
  const sealedPrediction = buildSealedPredictionInputFromAnalysis(analysis);
  const actual = createActualMatchResult({
    matchId: analysis.matchId,
    homeGoals: 2,
    awayGoals: 1,
    winner: "home",
    totalGoals: 3,
    competitionId: "292",
    competitionName: "K League 1",
    matchStatus: "FINISHED",
    providerId: "football:demo",
    providerSourceId: `demo:${analysis.matchId}:result`,
    providerMethod: "recorded-snapshot",
    observedAt: "2026-07-19T12:00:00.000Z",
  });
  const evaluation = evaluatePrediction({
    prediction: sealedPrediction,
    actual,
    evaluatedAt: "2026-07-19T13:00:00.000Z",
  });
  const history = buildEvaluationHistoryRecord({
    predictionSnapshot: sealedPrediction,
    actualResult: actual,
    evaluation,
    homeTeam: "Home FC",
    awayTeam: "Away United",
    matchDate: "2026-08-01T19:30:00.000Z",
    recordedAt: "2026-07-19T13:00:00.000Z",
  });

  return {
    history,
    context: buildProjectionReplayContext(analysis),
  };
}

async function seedSealedCohort(input: {
  readonly cohortId: string;
  readonly matchIds: readonly string[];
}) {
  const historyRepo = new InMemoryEvaluationHistoryRepository();
  const sidecarRepo = new InMemoryProjectionReplaySidecarRepository();
  const cohortRepo = new InMemoryReplayCohortRepository();
  const replayRunRepo = new InMemoryReplayRunRepository();

  for (const matchId of input.matchIds) {
    const seeded = await seedMatch(matchId);
    await historyRepo.save(seeded.history);
    await sidecarRepo.save({
      historyId: seeded.history.historyId,
      matchId: seeded.history.matchId,
      context: seeded.context,
    });
  }

  const sealed = await createAndSealReplayCohort({
    cohortId: input.cohortId,
    specification: createDefaultReplayCohortSpecification({
      sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
    }),
    historyRepository: historyRepo,
    sidecarRepository: sidecarRepo,
    cohortRepository: cohortRepo,
    clock: () => "2026-08-12T17:00:00.000Z",
  });
  if (!sealed.ok) {
    throw new Error(sealed.error.message);
  }

  return {
    historyRepo,
    sidecarRepo,
    cohortRepo,
    replayRunRepo,
    cohort: sealed.value,
  };
}

describe("P2K-F Sealed Cohort Offline Replay Run", () => {
  it("requires SEALED cohort and verifies membership digest", async () => {
    const historyRepo = new InMemoryEvaluationHistoryRepository();
    const sidecarRepo = new InMemoryProjectionReplaySidecarRepository();
    const cohortRepo = new InMemoryReplayCohortRepository();
    const replayRunRepo = new InMemoryReplayRunRepository();

    const missing = await executeSealedCohortOfflineReplayRun({
      replayRunId: "run.missing",
      cohortId: "cohort.missing",
      matchScriptCalibrationLabel: "r1b.candidate.a.baseline",
      cohortRepository: cohortRepo,
      historyRepository: historyRepo,
      sidecarRepository: sidecarRepo,
      replayRunRepository: replayRunRepo,
      clock: () => "2026-08-12T17:00:00.000Z",
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.error.code).toBe("COHORT_NOT_FOUND");
    }

    const seeded = await seedSealedCohort({
      cohortId: "cohort.p2k.f.digest",
      matchIds: ["match-p2k-f-digest"],
    });
    const tamperedRepo: ReplayCohortRepository = {
      save: (cohort) => seeded.cohortRepo.save(cohort),
      seal: (input) => seeded.cohortRepo.seal(input),
      findByCohortId: async (cohortId) => {
        const cohort = await seeded.cohortRepo.findByCohortId(cohortId);
        if (cohort === undefined) {
          return undefined;
        }
        return Object.freeze({
          ...cohort,
          membershipDigestSha256: "f".repeat(64),
        }) as ReplayCohort;
      },
    };

    const digestFail = await executeSealedCohortOfflineReplayRun({
      replayRunId: "run.digest-fail",
      cohortId: "cohort.p2k.f.digest",
      matchScriptCalibrationLabel: "r1b.candidate.a.baseline",
      cohortRepository: tamperedRepo,
      historyRepository: seeded.historyRepo,
      sidecarRepository: seeded.sidecarRepo,
      replayRunRepository: seeded.replayRunRepo,
      clock: () => "2026-08-12T17:00:00.000Z",
    });
    expect(digestFail.ok).toBe(false);
    if (!digestFail.ok) {
      expect(digestFail.error.code).toBe("MEMBERSHIP_DIGEST_MISMATCH");
    }
  });

  it("executes A/C pair with deterministic order, same context, and provenance", async () => {
    const seeded = await seedSealedCohort({
      cohortId: "cohort.p2k.f.pair",
      matchIds: ["match-p2k-f-b", "match-p2k-f-a"],
    });

    const first = await executeSealedCohortOfflineReplayPair({
      cohortId: "cohort.p2k.f.pair",
      baselineReplayRunId: "run.p2k.f.pair.a",
      candidateReplayRunId: "run.p2k.f.pair.c",
      cohortRepository: seeded.cohortRepo,
      historyRepository: seeded.historyRepo,
      sidecarRepository: seeded.sidecarRepo,
      replayRunRepository: seeded.replayRunRepo,
      clock: () => "2026-08-12T17:00:00.000Z",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }

    expect(first.baseline.matchScriptCalibrationLabel).toBe(
      "r1b.candidate.a.baseline",
    );
    expect(first.candidate.matchScriptCalibrationLabel).toBe(
      "r1b.candidate.c.sideAwareOpen",
    );
    expect(first.baseline.isProductionDefault).toBe(true);
    expect(first.candidate.isProductionDefault).toBe(false);
    expect(first.baseline.productionPromoted).toBe(false);
    expect(first.candidate.productionPromoted).toBe(false);
    expect(first.pairs).toHaveLength(2);
    expect(first.pairs.map((pair) => pair.historyId)).toEqual(
      [...first.pairs.map((pair) => pair.historyId)].sort(),
    );

    for (const pair of first.pairs) {
      expect(pair.baseline.historyId).toBe(pair.candidate.historyId);
      expect(pair.baseline.matchId).toBe(pair.candidate.matchId);
      expect(pair.sameHistoricalContext).toBe(true);
      expect(pair.baseline.status).toBe("success");
      expect(pair.candidate.status).toBe("success");
      if (
        pair.baseline.status === "success" &&
        pair.candidate.status === "success"
      ) {
        expect(pair.baseline.historicalReplayContext).toEqual(
          pair.candidate.historicalReplayContext,
        );
        expect(pair.baseline.offlineParameterArtifactChecksum).not.toBe(
          pair.candidate.offlineParameterArtifactChecksum,
        );
      }
    }

    const second = await executeSealedCohortOfflineReplayPair({
      cohortId: "cohort.p2k.f.pair",
      baselineReplayRunId: "run.p2k.f.pair.a.2",
      candidateReplayRunId: "run.p2k.f.pair.c.2",
      cohortRepository: seeded.cohortRepo,
      historyRepository: seeded.historyRepo,
      sidecarRepository: seeded.sidecarRepo,
      replayRunRepository: seeded.replayRunRepo,
      clock: () => "2026-08-12T17:00:00.000Z",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }

    expect(second.baseline.results).toEqual(first.baseline.results);
    expect(second.candidate.results).toEqual(first.candidate.results);

    const after = await resolveSealedReplayCohort({
      cohortId: "cohort.p2k.f.pair",
      cohortRepository: seeded.cohortRepo,
    });
    expect(after?.membershipDigestSha256).toBe(seeded.cohort.membershipDigestSha256);
    expect(after?.members).toEqual(seeded.cohort.members);
  });

  it("reports explicit member failure when Sidecar is missing at run time", async () => {
    const seeded = await seedSealedCohort({
      cohortId: "cohort.p2k.f.fail",
      matchIds: ["match-p2k-f-fail"],
    });
    const member = seeded.cohort.members[0];
    if (member === undefined) {
      throw new Error("expected member");
    }

    // Simulate durable Sidecar loss after seal without mutating cohort membership.
    const sidecarRepo = new InMemoryProjectionReplaySidecarRepository();
    const outcome = await executeSealedCohortOfflineReplayRun({
      replayRunId: "run.p2k.f.fail",
      cohortId: "cohort.p2k.f.fail",
      matchScriptCalibrationLabel: "r1b.candidate.a.baseline",
      cohortRepository: seeded.cohortRepo,
      historyRepository: seeded.historyRepo,
      sidecarRepository: sidecarRepo,
      replayRunRepository: seeded.replayRunRepo,
      clock: () => "2026-08-12T17:00:00.000Z",
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    expect(outcome.value.status).toBe("completed_with_failures");
    expect(outcome.value.failureCount).toBe(1);
    expect(outcome.value.results[0]?.status).toBe("failure");
    if (outcome.value.results[0]?.status === "failure") {
      expect(outcome.value.results[0].reasonCode).toBe("MISSING_SIDECAR");
    }
  });

  it("supports empty sealed cohort without inventing members", async () => {
    const historyRepo = new InMemoryEvaluationHistoryRepository();
    const sidecarRepo = new InMemoryProjectionReplaySidecarRepository();
    const cohortRepo = new InMemoryReplayCohortRepository();
    const replayRunRepo = new InMemoryReplayRunRepository();

    const sealed = await createAndSealReplayCohort({
      cohortId: "cohort.p2k.f.empty",
      specification: createDefaultReplayCohortSpecification({
        sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
      }),
      historyRepository: historyRepo,
      sidecarRepository: sidecarRepo,
      cohortRepository: cohortRepo,
      clock: () => "2026-08-12T17:00:00.000Z",
    });
    expect(sealed.ok).toBe(true);
    if (!sealed.ok) {
      return;
    }

    expect(sealed.value.members).toHaveLength(0);
    const run = await executeSealedCohortOfflineReplayRun({
      replayRunId: "run.p2k.f.empty",
      cohortId: "cohort.p2k.f.empty",
      matchScriptCalibrationLabel: "r1b.candidate.c.sideAwareOpen",
      cohortRepository: cohortRepo,
      historyRepository: historyRepo,
      sidecarRepository: sidecarRepo,
      replayRunRepository: replayRunRepo,
      clock: () => "2026-08-12T17:00:00.000Z",
    });
    expect(run.ok).toBe(true);
    if (!run.ok) {
      return;
    }
    expect(run.value.memberCount).toBe(0);
    expect(run.value.status).toBe("completed");
    expect(run.value.isProductionDefault).toBe(false);
  });

  it("rejects invalid calibration label and keeps production default Baseline A", async () => {
    const seeded = await seedSealedCohort({
      cohortId: "cohort.p2k.f.label",
      matchIds: ["match-p2k-f-label"],
    });
    const invalid = await executeSealedCohortOfflineReplayRun({
      replayRunId: "run.p2k.f.label",
      cohortId: "cohort.p2k.f.label",
      matchScriptCalibrationLabel: "r1b.candidate.b.controlOpen",
      cohortRepository: seeded.cohortRepo,
      historyRepository: seeded.historyRepo,
      sidecarRepository: seeded.sidecarRepo,
      replayRunRepository: seeded.replayRunRepo,
      clock: () => "2026-08-12T17:00:00.000Z",
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.error.code).toBe("INVALID_CALIBRATION_LABEL");
    }

    expect(GOVERNED_MATCH_SCRIPT_PARAMETER_SET).toBe(
      MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
    );
    expect(getProductionMatchScriptParameterSet()).toBe(
      MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
    );
    expect(MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET).not.toBe(
      GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
    );
    expect(
      R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE.candidateC.productionPromoted,
    ).toBe(false);
  });

  it("idempotent identical Replay Run save; conflicting overwrite fails", async () => {
    const seeded = await seedSealedCohort({
      cohortId: "cohort.p2k.f.idem",
      matchIds: ["match-p2k-f-idem"],
    });
    const clock = () => "2026-08-12T17:00:00.000Z";
    const first = await executeSealedCohortOfflineReplayRun({
      replayRunId: "run.p2k.f.idem",
      cohortId: "cohort.p2k.f.idem",
      matchScriptCalibrationLabel: "r1b.candidate.a.baseline",
      cohortRepository: seeded.cohortRepo,
      historyRepository: seeded.historyRepo,
      sidecarRepository: seeded.sidecarRepo,
      replayRunRepository: seeded.replayRunRepo,
      clock,
    });
    const second = await executeSealedCohortOfflineReplayRun({
      replayRunId: "run.p2k.f.idem",
      cohortId: "cohort.p2k.f.idem",
      matchScriptCalibrationLabel: "r1b.candidate.a.baseline",
      cohortRepository: seeded.cohortRepo,
      historyRepository: seeded.historyRepo,
      sidecarRepository: seeded.sidecarRepo,
      replayRunRepository: seeded.replayRunRepo,
      clock,
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }
    expect(second.value).toEqual(first.value);

    const conflict = await executeSealedCohortOfflineReplayRun({
      replayRunId: "run.p2k.f.idem",
      cohortId: "cohort.p2k.f.idem",
      matchScriptCalibrationLabel: "r1b.candidate.c.sideAwareOpen",
      cohortRepository: seeded.cohortRepo,
      historyRepository: seeded.historyRepo,
      sidecarRepository: seeded.sidecarRepo,
      replayRunRepository: seeded.replayRunRepo,
      clock,
    });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) {
      expect(conflict.error.code).toBe("REPLAY_RUN_CONFLICT");
    }
  });
});
