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
  PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
  resolveSealedReplayCohort,
} from "@fas/statistics";
import { describe, expect, it } from "vitest";
import {
  AnalyzeMatchUseCase,
  buildProjectionReplayContext,
  buildSealedPredictionInputFromAnalysis,
  getProductionMatchScriptParameterSet,
  GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
  MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
  MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
  R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE,
  runOfflineMatchScriptReplay,
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

describe("P2K-E sealed cohort + P2K-D offline replay", () => {
  it("19. P2K-D offline replay can resolve a sealed cohort member", async () => {
    const matchId = createMatchId("match-p2k-e-offline");
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
    expect(analysisResult.ok).toBe(true);
    if (!analysisResult.ok) {
      return;
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

    const historyRepo = new InMemoryEvaluationHistoryRepository();
    const sidecarRepo = new InMemoryProjectionReplaySidecarRepository();
    const cohortRepo = new InMemoryReplayCohortRepository();
    await historyRepo.save(history);
    await sidecarRepo.save({
      historyId: history.historyId,
      matchId: history.matchId,
      context: buildProjectionReplayContext(analysis),
    });

    const sealed = await createAndSealReplayCohort({
      cohortId: "cohort.p2k.e.offline-1",
      specification: createDefaultReplayCohortSpecification({
        sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
      }),
      historyRepository: historyRepo,
      sidecarRepository: sidecarRepo,
      cohortRepository: cohortRepo,
      clock: () => "2026-08-12T15:00:00.000Z",
    });
    expect(sealed.ok).toBe(true);
    if (!sealed.ok) {
      return;
    }

    const resolved = await resolveSealedReplayCohort({
      cohortId: "cohort.p2k.e.offline-1",
      cohortRepository: cohortRepo,
    });
    expect(resolved?.members).toHaveLength(1);
    const member = resolved?.members[0];
    expect(member?.historyId).toBe(history.historyId);

    const sidecar = await sidecarRepo.findRecordByHistoryId(history.historyId);
    const replayA = runOfflineMatchScriptReplay({
      history,
      sidecar,
      matchScriptCalibrationLabel: "r1b.candidate.a.baseline",
    });
    const replayC = runOfflineMatchScriptReplay({
      history,
      sidecar,
      matchScriptCalibrationLabel: "r1b.candidate.c.sideAwareOpen",
    });

    expect(replayA.ok).toBe(true);
    expect(replayC.ok).toBe(true);
    if (!replayA.ok || !replayC.ok) {
      return;
    }

    expect(replayA.value.historicalReplayContext.contentSha256).toBe(
      replayC.value.historicalReplayContext.contentSha256,
    );
    expect(replayA.value.matchScriptCalibrationLabel).toBe(
      "r1b.candidate.a.baseline",
    );
    expect(replayC.value.matchScriptCalibrationLabel).toBe(
      "r1b.candidate.c.sideAwareOpen",
    );
  });

  it("22–23. Baseline A remains production default; Candidate C remains non-default", () => {
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
});
