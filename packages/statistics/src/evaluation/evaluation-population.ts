import { createActualMatchResult } from "../domain/actual-match-result.js";
import type {
  PredictionEvaluationRecord,
  SealedPredictionInput,
} from "../domain/prediction-evaluation.js";
import { evaluatePrediction } from "./evaluate-prediction.js";

export interface EvaluationPopulationRow {
  readonly prediction: SealedPredictionInput;
  readonly actual: ReturnType<typeof createActualMatchResult>;
}

export interface EvaluationPopulationSummary {
  readonly evaluationModelVersion: "evaluation.mvp.a1";
  readonly sampleSize: number;
  readonly scoredCount: number;
  readonly excludedCount: number;
  readonly winnerHitRate: number;
  readonly scoreHitRate: number;
  readonly goalHitRate: number;
  readonly goalRangeHitRate: number;
  readonly scenarioMostLikelyHitRate: number;
  readonly scenarioAnyHitRate: number;
  readonly confidenceCorrectRate: number;
  readonly confidenceClaimedCount: number;
  readonly meanRuleAgreement: number;
  readonly meanFeatureCoverage: number;
  readonly meanPaperUnitReturn: number;
  readonly paperMetricDisclaimer: string;
  readonly checksum: string;
}

export class EvaluationPopulationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvaluationPopulationError";
  }
}

function roundRate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function stableChecksum(parts: readonly string[]): string {
  let hash = 2166136261;

  for (const part of parts) {
    for (let index = 0; index < part.length; index += 1) {
      hash ^= part.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    hash ^= 124;
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function basePrediction(
  matchId: string,
  overrides: Partial<SealedPredictionInput> &
    Pick<SealedPredictionInput, "pHome" | "pDraw" | "pAway">,
): SealedPredictionInput {
  return Object.freeze({
    matchId,
    projectionChecksum: `proj:${matchId}`,
    projectionStatus: "completed_nonempty",
    topScorelines: Object.freeze([
      Object.freeze({ homeGoals: 1, awayGoals: 0, probability: 0.12 }),
      Object.freeze({ homeGoals: 2, awayGoals: 1, probability: 0.1 }),
    ]),
    goalRange: Object.freeze({
      range01: 0.28,
      range23: 0.45,
      range4Plus: 0.27,
    }),
    predictionConfidence: 72,
    confidenceBand: "high",
    scenarios: Object.freeze({
      mostLikely: Object.freeze({
        slot: "mostLikely" as const,
        winner: "home" as const,
        homeGoals: 1,
        awayGoals: 0,
        probability: overrides.pHome,
      }),
      secondLikely: Object.freeze({
        slot: "secondLikely" as const,
        winner: "draw" as const,
        homeGoals: 1,
        awayGoals: 1,
        probability: overrides.pDraw,
      }),
      upset: Object.freeze({
        slot: "upset" as const,
        winner: "away" as const,
        homeGoals: 0,
        awayGoals: 1,
        probability: overrides.pAway,
      }),
    }),
    rules: Object.freeze([
      Object.freeze({
        ruleName: "HOME_ATTACK_EDGE",
        status: "PASS" as const,
        channel: "home+" as const,
      }),
      Object.freeze({
        ruleName: "FORM_HOME_SUPERIOR",
        status: "PASS" as const,
        channel: "home+" as const,
      }),
      Object.freeze({
        ruleName: "MARKET_LEAN_HOME",
        status: "INAPPLICABLE" as const,
        channel: "none" as const,
      }),
    ]),
    featureNames: Object.freeze([
      "homeTeam",
      "awayTeam",
      "kickoff",
      "homeAdvantage",
      "attackRatingHome",
      "attackRatingAway",
      "defenseRatingHome",
      "defenseRatingAway",
      "momentumHome",
      "momentumAway",
      "recentFormHome",
      "recentFormAway",
    ]),
    projectionModelVersion: "projection.v2.i2b.market",
    featureModelVersion: "feature.v2.i2b.market",
    ruleSetVersion: "rule.mvp.i2b.market",
    ...overrides,
  });
}

/** Declared immutable demo population for offline A1 evaluation scoring. */
export const EVALUATION_POPULATION_DEMO_V1: readonly EvaluationPopulationRow[] =
  Object.freeze([
    Object.freeze({
      prediction: basePrediction("eval-demo-001", {
        pHome: 0.55,
        pDraw: 0.25,
        pAway: 0.2,
      }),
      actual: createActualMatchResult({
        matchId: "eval-demo-001",
        homeGoals: 1,
        awayGoals: 0,
        winner: "home",
        totalGoals: 1,
        competitionId: "demo",
        competitionName: "Evaluation Demo League",
        matchStatus: "FINISHED",
        providerId: "football:demo",
        providerSourceId: "demo:eval-demo-001:result",
        providerMethod: "recorded-snapshot",
        observedAt: "2026-07-01T15:00:00.000Z",
      }),
    }),
    Object.freeze({
      prediction: basePrediction("eval-demo-002", {
        pHome: 0.4,
        pDraw: 0.35,
        pAway: 0.25,
        predictionConfidence: 55,
        confidenceBand: "medium",
        topScorelines: Object.freeze([
          Object.freeze({ homeGoals: 1, awayGoals: 1, probability: 0.14 }),
        ]),
        scenarios: Object.freeze({
          mostLikely: Object.freeze({
            slot: "mostLikely" as const,
            winner: "home" as const,
            homeGoals: 1,
            awayGoals: 0,
            probability: 0.4,
          }),
          secondLikely: Object.freeze({
            slot: "secondLikely" as const,
            winner: "draw" as const,
            homeGoals: 1,
            awayGoals: 1,
            probability: 0.35,
          }),
          upset: Object.freeze({
            slot: "upset" as const,
            winner: "away" as const,
            homeGoals: 0,
            awayGoals: 1,
            probability: 0.25,
          }),
        }),
      }),
      actual: createActualMatchResult({
        matchId: "eval-demo-002",
        homeGoals: 1,
        awayGoals: 1,
        winner: "draw",
        totalGoals: 2,
        competitionId: "demo",
        competitionName: "Evaluation Demo League",
        matchStatus: "FINISHED",
        providerId: "football:demo",
        providerSourceId: "demo:eval-demo-002:result",
        providerMethod: "recorded-snapshot",
        observedAt: "2026-07-02T15:00:00.000Z",
      }),
    }),
    Object.freeze({
      prediction: basePrediction("eval-demo-003", {
        pHome: 0.3,
        pDraw: 0.28,
        pAway: 0.42,
        predictionConfidence: 78,
        confidenceBand: "high",
        topScorelines: Object.freeze([
          Object.freeze({ homeGoals: 0, awayGoals: 1, probability: 0.13 }),
        ]),
        scenarios: Object.freeze({
          mostLikely: Object.freeze({
            slot: "mostLikely" as const,
            winner: "away" as const,
            homeGoals: 0,
            awayGoals: 1,
            probability: 0.42,
          }),
          secondLikely: Object.freeze({
            slot: "secondLikely" as const,
            winner: "home" as const,
            homeGoals: 1,
            awayGoals: 0,
            probability: 0.3,
          }),
          upset: Object.freeze({
            slot: "upset" as const,
            winner: "draw" as const,
            homeGoals: 1,
            awayGoals: 1,
            probability: 0.28,
          }),
        }),
      }),
      actual: createActualMatchResult({
        matchId: "eval-demo-003",
        homeGoals: 2,
        awayGoals: 0,
        winner: "home",
        totalGoals: 2,
        competitionId: "demo",
        competitionName: "Evaluation Demo League",
        matchStatus: "FINISHED",
        providerId: "football:demo",
        providerSourceId: "demo:eval-demo-003:result",
        providerMethod: "recorded-snapshot",
        observedAt: "2026-07-03T15:00:00.000Z",
      }),
    }),
    Object.freeze({
      prediction: basePrediction("eval-demo-004", {
        pHome: 0.48,
        pDraw: 0.27,
        pAway: 0.25,
        topScorelines: Object.freeze([
          Object.freeze({ homeGoals: 2, awayGoals: 1, probability: 0.11 }),
        ]),
        scenarios: Object.freeze({
          mostLikely: Object.freeze({
            slot: "mostLikely" as const,
            winner: "home" as const,
            homeGoals: 2,
            awayGoals: 1,
            probability: 0.48,
          }),
          secondLikely: Object.freeze({
            slot: "secondLikely" as const,
            winner: "draw" as const,
            homeGoals: 1,
            awayGoals: 1,
            probability: 0.27,
          }),
          upset: Object.freeze({
            slot: "upset" as const,
            winner: "away" as const,
            homeGoals: 1,
            awayGoals: 2,
            probability: 0.25,
          }),
        }),
      }),
      actual: createActualMatchResult({
        matchId: "eval-demo-004",
        homeGoals: 2,
        awayGoals: 1,
        winner: "home",
        totalGoals: 3,
        competitionId: "demo",
        competitionName: "Evaluation Demo League",
        matchStatus: "FINISHED",
        providerId: "football:demo",
        providerSourceId: "demo:eval-demo-004:result",
        providerMethod: "recorded-snapshot",
        observedAt: "2026-07-04T15:00:00.000Z",
      }),
    }),
    Object.freeze({
      prediction: basePrediction("eval-demo-005", {
        pHome: 0.5,
        pDraw: 0.3,
        pAway: 0.2,
        projectionStatus: "blocked",
      }),
      actual: createActualMatchResult({
        matchId: "eval-demo-005",
        homeGoals: 0,
        awayGoals: 0,
        winner: "draw",
        totalGoals: 0,
        competitionId: "demo",
        competitionName: "Evaluation Demo League",
        matchStatus: "FINISHED",
        providerId: "football:demo",
        providerSourceId: "demo:eval-demo-005:result",
        providerMethod: "recorded-snapshot",
        observedAt: "2026-07-05T15:00:00.000Z",
      }),
    }),
  ]);

export function loadEvaluationDemoPopulationRows(): readonly EvaluationPopulationRow[] {
  return EVALUATION_POPULATION_DEMO_V1;
}

export function scoreEvaluationPopulation(
  rows: readonly EvaluationPopulationRow[],
  evaluatedAt = "2026-07-19T12:00:00.000Z",
): readonly PredictionEvaluationRecord[] {
  if (rows.length === 0) {
    throw new EvaluationPopulationError("Evaluation population must be non-empty.");
  }

  return Object.freeze(
    rows.map((row) =>
      evaluatePrediction({
        prediction: row.prediction,
        actual: row.actual,
        evaluatedAt,
      }),
    ),
  );
}

export function summarizeEvaluationPopulation(
  records: readonly PredictionEvaluationRecord[],
): EvaluationPopulationSummary {
  if (records.length === 0) {
    throw new EvaluationPopulationError("Evaluation records must be non-empty.");
  }

  const scored = records.filter((record) => record.status === "scored");
  const excludedCount = records.length - scored.length;
  let winnerHits = 0;
  let scoreHits = 0;
  let goalHits = 0;
  let goalRangeHits = 0;
  let scenarioMostLikelyHits = 0;
  let scenarioAnyHits = 0;
  let confidenceCorrect = 0;
  let confidenceClaimed = 0;
  let ruleAgreementSum = 0;
  let featureCoverageSum = 0;
  let paperReturnSum = 0;

  for (const record of scored) {
    const metrics = record.metrics;

    if (metrics === undefined) {
      continue;
    }

    if (metrics.winnerHit) {
      winnerHits += 1;
    }

    if (metrics.scoreHit) {
      scoreHits += 1;
    }

    if (metrics.goalHit) {
      goalHits += 1;
    }

    if (metrics.goalRangeHit) {
      goalRangeHits += 1;
    }

    if (metrics.scenarioHit.mostLikely) {
      scenarioMostLikelyHits += 1;
    }

    if (metrics.scenarioHit.anyScoreline) {
      scenarioAnyHits += 1;
    }

    if (metrics.confidenceCorrectness !== "not_claimed") {
      confidenceClaimed += 1;

      if (metrics.confidenceCorrectness === "correct") {
        confidenceCorrect += 1;
      }
    }

    ruleAgreementSum += metrics.ruleCoverage.agreementRatio;
    featureCoverageSum += metrics.featureCoverage.coverageRatio;
    paperReturnSum += metrics.paperUnitReturn;
  }

  const scoredCount = scored.length;
  const denom = scoredCount === 0 ? 1 : scoredCount;

  return Object.freeze({
    evaluationModelVersion: "evaluation.mvp.a1",
    sampleSize: records.length,
    scoredCount,
    excludedCount,
    winnerHitRate: roundRate(winnerHits / denom),
    scoreHitRate: roundRate(scoreHits / denom),
    goalHitRate: roundRate(goalHits / denom),
    goalRangeHitRate: roundRate(goalRangeHits / denom),
    scenarioMostLikelyHitRate: roundRate(scenarioMostLikelyHits / denom),
    scenarioAnyHitRate: roundRate(scenarioAnyHits / denom),
    confidenceCorrectRate:
      confidenceClaimed === 0 ? 0 : roundRate(confidenceCorrect / confidenceClaimed),
    confidenceClaimedCount: confidenceClaimed,
    meanRuleAgreement: roundRate(ruleAgreementSum / denom),
    meanFeatureCoverage: roundRate(featureCoverageSum / denom),
    meanPaperUnitReturn: roundRate(paperReturnSum / denom),
    paperMetricDisclaimer:
      "Paper unit return is a research framing metric only — not wagering advice.",
    checksum: stableChecksum(records.map((record) => record.checksum)),
  });
}
