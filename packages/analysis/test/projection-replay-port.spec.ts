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
  evaluatePrediction,
} from "@fas/statistics";
import { describe, expect, it } from "vitest";
import {
  AnalysisProjectionReplayPort,
  AnalyzeMatchUseCase,
  buildProjectionReplayContext,
  buildSealedPredictionInputFromAnalysis,
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

describe("AnalysisProjectionReplayPort (P2E.5)", () => {
  it("replays V1 from sealed snapshot and V2 from sidecar without mutating history", async () => {
    const matchId = createMatchId("match-replay-port");
    const evidences = mvpEvidenceSet(matchId);
    const repository = new InMemoryEvidenceRepository();

    for (const evidence of evidences) {
      await repository.save(evidence);
    }

    const analyzeMatch = new AnalyzeMatchUseCase(
      {
        execute: async () =>
          Object.freeze({
            ok: true,
            value: evidences[0] as Evidence,
          }),
      },
      new EvidenceQueryService(repository),
      new FeatureExtractor(),
      new RuleEvaluator(),
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
    const historyRecord = buildEvaluationHistoryRecord({
      predictionSnapshot: sealedPrediction,
      actualResult: actual,
      evaluation,
      homeTeam: "Home FC",
      awayTeam: "Away United",
      matchDate: "2026-08-01T19:30:00.000Z",
      recordedAt: "2026-07-19T13:00:00.000Z",
    });
    const originalChecksum = historyRecord.predictionSnapshot.projectionChecksum;
    const replayContext = buildProjectionReplayContext(analysis);
    const port = new AnalysisProjectionReplayPort();

    const v1Outcome = port.replayV1({ record: historyRecord, replayContext });
    const v2Outcome = port.replayV2({ record: historyRecord, replayContext });

    expect(v1Outcome.version).toBe("v1");
    expect("prediction" in v1Outcome).toBe(true);
    if (!("prediction" in v1Outcome)) {
      return;
    }

    expect(v1Outcome.prediction.projectionChecksum).toBe(originalChecksum);
    expect(v2Outcome.version).toBe("v2");
    expect("prediction" in v2Outcome).toBe(true);
    if (!("prediction" in v2Outcome)) {
      return;
    }

    expect(v2Outcome.prediction.matchId).toBe(analysis.matchId);
    expect(
      v2Outcome.prediction.pHome +
        v2Outcome.prediction.pDraw +
        v2Outcome.prediction.pAway,
    ).toBeCloseTo(1, 9);
    expect(historyRecord.predictionSnapshot.projectionChecksum).toBe(
      originalChecksum,
    );
  });
});
