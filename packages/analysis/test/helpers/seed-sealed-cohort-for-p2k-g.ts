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
} from "@fas/statistics";

import {
  AnalyzeMatchUseCase,
  buildProjectionReplayContext,
  buildSealedPredictionInputFromAnalysis,
} from "../../src/index.js";

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

/** Shared SEALED cohort fixture for P2K-G integration over real P2K-F runs. */
export async function seedSealedCohortForP2kG(input: {
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
