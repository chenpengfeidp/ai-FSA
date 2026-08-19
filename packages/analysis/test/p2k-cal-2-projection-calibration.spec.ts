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
  InMemoryProjectionReplaySidecarRepository,
  type ProjectionReplaySidecarRecord,
} from "@fas/statistics";
import { describe, expect, it } from "vitest";
import {
  AnalyzeMatchUseCase,
  applyDixonColesToProbabilityMatrix,
  buildIndependentPoissonMatrix,
  buildLambdasV2,
  CALIBRATION_CANDIDATE1_LAMBDA_FEATURE_WEIGHTS,
  computeFootballState,
  computeMatchProjection,
  computeProjectionV2,
  createProbabilityMatrixFromPoisson,
  getActiveProjectionParameterArtifact,
  getProjectionParameterArtifactByVersionLabel,
  MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT,
  PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT,
  PROJECTION_CALIBRATION_CANDIDATE1_VERSION_LABEL,
  PROJECTION_CALIBRATION_GOVERNANCE,
  PROJECTION_PARAMETER_VERSION_CALIBRATION_CANDIDATE1,
  PROJECTION_PARAMETER_VERSION_REPLAY,
  resolveOfflineProjectionCalibrationArtifact,
  runOfflineProjectionCalibrationReplay,
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

function richEvidenceSet(matchId: MatchId): readonly Evidence[] {
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
  const evidences = richEvidenceSet(matchId);
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

  return { history, sidecar: sidecar as ProjectionReplaySidecarRecord, analysis };
}

describe("P2K-CAL-2 Projection calibration candidate", () => {
  it("remaps percent-scale Features to percentCentered without changing production weights", () => {
    const productionAttack =
      MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT.lambda.featureWeights.find(
        (entry) => entry.featureName === "goalsScoredRateHome",
      );
    const candidateAttack = CALIBRATION_CANDIDATE1_LAMBDA_FEATURE_WEIGHTS.find(
      (entry) => entry.featureName === "goalsScoredRateHome",
    );

    expect(productionAttack?.scale).toBe("unitCentered");
    expect(candidateAttack?.scale).toBe("percentCentered");
    expect(candidateAttack?.weight).toBe(productionAttack?.weight);
  });

  it("keeps production baseline artifact byte-stable when candidate is not selected", () => {
    const active = getActiveProjectionParameterArtifact();

    expect(active.versionLabel).toBe(PROJECTION_PARAMETER_VERSION_REPLAY);
    expect(active.checksum).toBe(
      MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT.checksum,
    );
    expect(active.lambda).toEqual(MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT.lambda);
    expect(active.matrixMerge.lowScoreDependence).toBeUndefined();
  });

  it("registers calibration candidate as NON-DEFAULT with governed checksum", () => {
    const candidate = getProjectionParameterArtifactByVersionLabel(
      PROJECTION_PARAMETER_VERSION_CALIBRATION_CANDIDATE1,
    );

    expect(candidate?.artifactId).toBe(
      PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT.artifactId,
    );
    expect(candidate?.checksum).toBe(
      PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT.checksum,
    );
    expect(candidate?.qualified).toBe(false);
    expect(PROJECTION_CALIBRATION_GOVERNANCE.candidate1.productionPromoted).toBe(
      false,
    );
  });

  it("reduces saturated attack group factors and total λ vs production on rich Features", async () => {
    const { analysis } = await buildSealedHistoryAndSidecar("match-p2k-cal2-lambda");

    const production = computeProjectionV2({
      featureBundle: analysis.featureBundle,
      ruleResults: analysis.ruleResults,
      requiredEvidencePresentCount: analysis.requiredEvidencePresentCount,
      parameters: MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT,
    });
    const candidate = computeProjectionV2({
      featureBundle: analysis.featureBundle,
      ruleResults: analysis.ruleResults,
      requiredEvidencePresentCount: analysis.requiredEvidencePresentCount,
      parameters: PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT,
    });

    const productionAttackMax = Math.max(
      ...(production.footballState?.projectionInputs.groupContributions ?? [])
        .filter((entry) => entry.group === "attack")
        .map((entry) => entry.factor),
      0,
    );
    const candidateAttackMax = Math.max(
      ...(candidate.footballState?.projectionInputs.groupContributions ?? [])
        .filter((entry) => entry.group === "attack")
        .map((entry) => entry.factor),
    );

    expect(candidateAttackMax).toBeLessThanOrEqual(2);
    expect(candidateAttackMax).toBeLessThan(productionAttackMax);
    expect(
      candidate.projection.lambdaHome + candidate.projection.lambdaAway,
    ).toBeLessThan(
      production.projection.lambdaHome + production.projection.lambdaAway,
    );
  });

  it("increases draw mass via governed Dixon–Coles without breaking matrix coherence", () => {
    const poisson = buildIndependentPoissonMatrix(1.2, 1.1);
    const matrix = createProbabilityMatrixFromPoisson(poisson, {
      lambdaHome: 1.2,
      lambdaAway: 1.1,
    });
    const adjusted = applyDixonColesToProbabilityMatrix({
      matrix,
      lowScoreDependence: Object.freeze({ enabled: true, rho: -0.1 }),
    });

    expect(adjusted.pDraw).toBeGreaterThan(matrix.pDraw);
    expect(adjusted.pHome + adjusted.pDraw + adjusted.pAway).toBeCloseTo(1, 9);
    expect(
      adjusted.goalRange.range01 +
        adjusted.goalRange.range23 +
        adjusted.goalRange.range4Plus,
    ).toBeCloseTo(1, 9);
  });

  it("resolves offline calibration labels explicitly and fails closed on empty label", () => {
    const baseline = resolveOfflineProjectionCalibrationArtifact({
      calibrationLabel: PROJECTION_PARAMETER_VERSION_REPLAY,
    });
    const candidate = resolveOfflineProjectionCalibrationArtifact({
      calibrationLabel: PROJECTION_CALIBRATION_CANDIDATE1_VERSION_LABEL,
    });
    const missing = resolveOfflineProjectionCalibrationArtifact({
      calibrationLabel: undefined,
    });

    expect(baseline.ok).toBe(true);
    expect(candidate.ok).toBe(true);
    expect(missing.ok).toBe(false);
    if (baseline.ok && candidate.ok) {
      expect(baseline.isProductionDefault).toBe(true);
      expect(candidate.isProductionDefault).toBe(false);
      expect(baseline.productionPromoted).toBe(false);
      expect(candidate.productionPromoted).toBe(false);
    }
  });

  it("offline replay is deterministic for baseline vs candidate on same sealed sidecar", async () => {
    const { history, sidecar } = await buildSealedHistoryAndSidecar(
      "match-p2k-cal2-replay",
    );

    const baselineFirst = runOfflineProjectionCalibrationReplay({
      history,
      sidecar,
      projectionCalibrationLabel: PROJECTION_PARAMETER_VERSION_REPLAY,
    });
    const baselineSecond = runOfflineProjectionCalibrationReplay({
      history,
      sidecar,
      projectionCalibrationLabel: PROJECTION_PARAMETER_VERSION_REPLAY,
    });
    const candidateFirst = runOfflineProjectionCalibrationReplay({
      history,
      sidecar,
      projectionCalibrationLabel: PROJECTION_CALIBRATION_CANDIDATE1_VERSION_LABEL,
    });
    const candidateSecond = runOfflineProjectionCalibrationReplay({
      history,
      sidecar,
      projectionCalibrationLabel: PROJECTION_CALIBRATION_CANDIDATE1_VERSION_LABEL,
    });

    expect(baselineFirst.ok && baselineSecond.ok).toBe(true);
    expect(candidateFirst.ok && candidateSecond.ok).toBe(true);
    if (
      !baselineFirst.ok ||
      !baselineSecond.ok ||
      !candidateFirst.ok ||
      !candidateSecond.ok
    ) {
      return;
    }

    expect(baselineFirst.value.projectionChecksum).toBe(
      baselineSecond.value.projectionChecksum,
    );
    expect(candidateFirst.value.projectionChecksum).toBe(
      candidateSecond.value.projectionChecksum,
    );
    expect(candidateFirst.value.projectionChecksum).not.toBe(
      baselineFirst.value.projectionChecksum,
    );
    expect(candidateFirst.value.prediction.pDraw).toBeGreaterThanOrEqual(
      baselineFirst.value.prediction.pDraw,
    );
  });

  it("does not change production computeMatchProjection when parameters are omitted", async () => {
    const { analysis } = await buildSealedHistoryAndSidecar(
      "match-p2k-cal2-baseline-path",
    );

    const first = computeMatchProjection({
      featureBundle: analysis.featureBundle,
      ruleResults: analysis.ruleResults,
      requiredEvidencePresentCount: analysis.requiredEvidencePresentCount,
      projectionPolicyPin: "v2",
    });
    const second = computeMatchProjection({
      featureBundle: analysis.featureBundle,
      ruleResults: analysis.ruleResults,
      requiredEvidencePresentCount: analysis.requiredEvidencePresentCount,
      projectionPolicyPin: "v2",
      parameters: MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT,
    });

    expect(first.projection.checksum).toBe(second.projection.checksum);
  });
});

describe("P2K-CAL-2 lambda builder group governance", () => {
  it("applies groupFactorMax and groupScalars from parameter artifact", async () => {
    const { analysis } = await buildSealedHistoryAndSidecar("match-p2k-cal2-groups");
    const footballState = computeFootballState({
      featureBundle: analysis.featureBundle,
      lambdaParameters: PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT.lambda,
      footballStateParameters:
        PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT.footballState,
    });
    const lambdas = buildLambdasV2({
      footballState,
      parameters: PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT.lambda,
    });

    expect(lambdas.blocked).toBe(false);
    expect(lambdas.lambdaHome).toBeGreaterThan(0);
    expect(lambdas.lambdaAway).toBeGreaterThan(0);
    expect(lambdas.lambdaHome).toBeLessThanOrEqual(
      PROJECTION_CALIBRATION_CANDIDATE1_ARTIFACT.lambda.max,
    );
  });
});
