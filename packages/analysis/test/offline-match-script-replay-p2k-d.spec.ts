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
  computeProjectionReplaySidecarContentSha256,
  createActualMatchResult,
  evaluatePrediction,
  InMemoryProjectionReplaySidecarRepository,
  PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
  type ProjectionReplaySidecarRecord,
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
  resolveMatchScriptParameterSet,
  resolveOfflineMatchScriptParameterSet,
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

async function buildSealedHistoryAndSidecar(matchIdValue: string) {
  const matchId = createMatchId(matchIdValue);
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
    undefined,
    "v2",
  );

  const analysisResult = await analyzeMatch.execute(matchId);
  expect(analysisResult.ok).toBe(true);
  if (!analysisResult.ok) {
    throw new Error("analyzeMatch failed");
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
  const context = buildProjectionReplayContext(analysis);
  const sidecarRepo = new InMemoryProjectionReplaySidecarRepository();
  await sidecarRepo.save({
    historyId: history.historyId,
    matchId: history.matchId,
    context,
  });
  const sidecar = await sidecarRepo.findRecordByHistoryId(history.historyId);
  if (sidecar === undefined) {
    throw new Error("sidecar missing after save");
  }

  return { history, sidecar, context, analysis };
}

describe("P2K-D offline Match Script parameter override", () => {
  it("1. Baseline A explicit offline replay → PASS", async () => {
    const { history, sidecar } = await buildSealedHistoryAndSidecar(
      "match-p2k-d-baseline-a",
    );

    const outcome = runOfflineMatchScriptReplay({
      history,
      sidecar,
      matchScriptCalibrationLabel: "r1b.candidate.a.baseline",
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    expect(outcome.value.matchScriptCalibrationLabel).toBe(
      "r1b.candidate.a.baseline",
    );
    expect(outcome.value.isProductionDefault).toBe(true);
    expect(outcome.value.productionPromoted).toBe(false);
    expect(outcome.value.prediction.matchId).toBe(history.matchId);
    expect(
      outcome.value.prediction.pHome +
        outcome.value.prediction.pDraw +
        outcome.value.prediction.pAway,
    ).toBeCloseTo(1, 9);
  });

  it("2. Candidate C explicit offline replay → PASS", async () => {
    const { history, sidecar } = await buildSealedHistoryAndSidecar(
      "match-p2k-d-candidate-c",
    );

    const outcome = runOfflineMatchScriptReplay({
      history,
      sidecar,
      matchScriptCalibrationLabel: "r1b.candidate.c.sideAwareOpen",
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    expect(outcome.value.matchScriptCalibrationLabel).toBe(
      "r1b.candidate.c.sideAwareOpen",
    );
    expect(outcome.value.isProductionDefault).toBe(false);
    expect(outcome.value.productionPromoted).toBe(false);
  });

  it("3–4. Candidate C is not production default; production resolver remains Baseline A", () => {
    expect(GOVERNED_MATCH_SCRIPT_PARAMETER_SET).toBe(
      MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
    );
    expect(getProductionMatchScriptParameterSet()).toBe(
      MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
    );
    expect(resolveMatchScriptParameterSet().calibrationLabel).toBe(
      "r1b.candidate.a.baseline",
    );
    expect(
      R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE.candidateC.productionPromoted,
    ).toBe(false);
    expect(
      R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE.candidateC.populationValidated,
    ).toBe(false);
    expect(R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE.candidateC.calibrationLabel).toBe(
      "r1b.candidate.c.sideAwareOpen",
    );
    expect(MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET).not.toBe(
      GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
    );
  });

  it("5–7. Same History+Sidecar under A/C: identical context, differing provenance", async () => {
    const { history, sidecar } = await buildSealedHistoryAndSidecar(
      "match-p2k-d-same-context",
    );

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

    expect(replayA.value.historicalReplayContext).toEqual(
      replayC.value.historicalReplayContext,
    );
    expect(replayA.value.historicalReplayContext.matchId).toBe(history.matchId);
    expect(replayA.value.historicalReplayContext.contentSha256).toBe(
      sidecar.contentSha256,
    );
    expect(replayA.value.historicalReplayContext.featureBundleChecksum).toBe(
      sidecar.context.featureBundleChecksum,
    );
    expect(replayA.value.historicalReplayContext.featureNames).toEqual(
      replayC.value.historicalReplayContext.featureNames,
    );
    expect(replayA.value.historicalReplayContext.ruleIds).toEqual(
      replayC.value.historicalReplayContext.ruleIds,
    );

    expect(replayA.value.matchScriptCalibrationLabel).toBe(
      "r1b.candidate.a.baseline",
    );
    expect(replayC.value.matchScriptCalibrationLabel).toBe(
      "r1b.candidate.c.sideAwareOpen",
    );
    expect(replayA.value.offlineParameterArtifactChecksum).not.toBe(
      replayC.value.offlineParameterArtifactChecksum,
    );
    expect(replayA.value.isProductionDefault).toBe(true);
    expect(replayC.value.isProductionDefault).toBe(false);
  });

  it("8. Missing Sidecar → reject", async () => {
    const { history } = await buildSealedHistoryAndSidecar(
      "match-p2k-d-missing-sidecar",
    );

    const outcome = runOfflineMatchScriptReplay({
      history,
      sidecar: undefined,
      matchScriptCalibrationLabel: "r1b.candidate.a.baseline",
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) {
      return;
    }

    expect(outcome.error.code).toBe("MISSING_SIDECAR");
  });

  it("9. Invalid Sidecar hash → reject", async () => {
    const { history, sidecar } = await buildSealedHistoryAndSidecar(
      "match-p2k-d-bad-hash",
    );
    const tampered: ProjectionReplaySidecarRecord = Object.freeze({
      ...sidecar,
      contentSha256: "0".repeat(64),
    });

    const outcome = runOfflineMatchScriptReplay({
      history,
      sidecar: tampered,
      matchScriptCalibrationLabel: "r1b.candidate.c.sideAwareOpen",
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) {
      return;
    }

    expect(outcome.error.code).toBe("INVALID_SIDECAR_HASH");
  });

  it("10. Unsupported Sidecar schema → reject", async () => {
    const { history, sidecar } = await buildSealedHistoryAndSidecar(
      "match-p2k-d-bad-schema",
    );
    const unsupported: ProjectionReplaySidecarRecord = Object.freeze({
      ...sidecar,
      schemaVersion: "projection-replay-sidecar.unsupported",
    });

    const outcome = runOfflineMatchScriptReplay({
      history,
      sidecar: unsupported,
      matchScriptCalibrationLabel: "r1b.candidate.a.baseline",
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) {
      return;
    }

    expect(outcome.error.code).toBe("UNSUPPORTED_SIDECAR_SCHEMA");
  });

  it("11. Invalid / empty parameter label → reject (no silent Baseline fallback)", () => {
    expect(
      resolveOfflineMatchScriptParameterSet({
        calibrationLabel: "not.a.real.label",
      }).ok,
    ).toBe(false);
    expect(
      resolveOfflineMatchScriptParameterSet({
        calibrationLabel: undefined,
      }).ok,
    ).toBe(false);

    const empty = resolveOfflineMatchScriptParameterSet({
      calibrationLabel: "   ",
    });
    expect(empty.ok).toBe(false);
    if (!empty.ok) {
      expect(empty.error.code).toBe("PRODUCTION_IMPLICIT_OVERRIDE");
    }

    // Production resolver still falls back; offline must not.
    expect(
      resolveMatchScriptParameterSet({
        calibrationLabel: "not.a.real.label",
      }),
    ).toBe(GOVERNED_MATCH_SCRIPT_PARAMETER_SET);
  });

  it("11b. Invalid label on replay path → reject without Baseline A fallback", async () => {
    const { history, sidecar } = await buildSealedHistoryAndSidecar(
      "match-p2k-d-bad-label",
    );

    const outcome = runOfflineMatchScriptReplay({
      history,
      sidecar,
      matchScriptCalibrationLabel: "r1b.candidate.b.controlOpen",
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) {
      return;
    }

    expect(outcome.error.code).toBe("INVALID_PARAMETER_LABEL");
  });

  it("12–13. Offline replay uses sealed Sidecar only (no Provider/Evidence regen API)", async () => {
    const { history, sidecar, context } = await buildSealedHistoryAndSidecar(
      "match-p2k-d-sealed-only",
    );

    // API surface accepts only History + Sidecar + label — no Provider ports.
    const outcome = runOfflineMatchScriptReplay({
      history,
      sidecar,
      matchScriptCalibrationLabel: "r1b.candidate.a.baseline",
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    expect(outcome.value.historicalReplayContext.featureNames).toEqual(
      context.features.map((feature) => feature.name),
    );
    expect(outcome.value.historicalReplayContext.evidenceRefs).toEqual(
      context.evidenceRefs,
    );
    expect(outcome.value.limitations.some((line) => line.includes("Offline"))).toBe(
      true,
    );
    expect(sidecar.schemaVersion).toBe(PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION);
    expect(sidecar.contentSha256).toBe(
      computeProjectionReplaySidecarContentSha256(context),
    );
  });

  it("14. Deterministic repeated replay for identical History+Sidecar+label", async () => {
    const { history, sidecar } = await buildSealedHistoryAndSidecar(
      "match-p2k-d-determinism",
    );

    const first = runOfflineMatchScriptReplay({
      history,
      sidecar,
      matchScriptCalibrationLabel: "r1b.candidate.c.sideAwareOpen",
    });
    const second = runOfflineMatchScriptReplay({
      history,
      sidecar,
      matchScriptCalibrationLabel: "r1b.candidate.c.sideAwareOpen",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }

    expect(first.value).toEqual(second.value);
    expect(first.value.projectionChecksum).toBe(second.value.projectionChecksum);
    expect(first.value.matchScriptCalibrationLabel).toBe(
      second.value.matchScriptCalibrationLabel,
    );
    expect(first.value.prediction).toEqual(second.value.prediction);
    expect(first.value.metadata?.activeMatchScripts).toEqual(
      second.value.metadata?.activeMatchScripts,
    );
  });
});
