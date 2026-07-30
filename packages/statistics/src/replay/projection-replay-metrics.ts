import type { ActualMatchResult } from "../domain/actual-match-result.js";
import type { SealedPredictionInput } from "../domain/prediction-evaluation.js";
import {
  evaluatePrediction,
  predictedWinnerFromProbs,
} from "../evaluation/evaluate-prediction.js";

export interface ProjectionReplayMetrics {
  readonly winnerHit: boolean;
  readonly drawHit: boolean;
  readonly scoreHit: boolean;
  readonly goalRangeHit: boolean;
  readonly bttsHit: boolean;
  readonly overUnderHit: boolean;
  readonly predictionConfidence: number;
  readonly winnerHitNumeric: number;
}

function predictedBtts(prediction: SealedPredictionInput): boolean {
  const scenario = prediction.scenarios.mostLikely;

  return scenario.homeGoals > 0 && scenario.awayGoals > 0;
}

function actualBtts(actual: ActualMatchResult): boolean {
  return actual.homeGoals > 0 && actual.awayGoals > 0;
}

function predictedOver25(prediction: SealedPredictionInput): boolean {
  const overMass = prediction.goalRange.range23 + prediction.goalRange.range4Plus;

  return overMass >= 0.5;
}

function actualOver25(actual: ActualMatchResult): boolean {
  return actual.totalGoals >= 3;
}

function drawHit(
  prediction: SealedPredictionInput,
  actual: ActualMatchResult,
): boolean {
  if (actual.winner !== "draw") {
    return false;
  }

  return (
    predictedWinnerFromProbs(
      prediction.pHome,
      prediction.pDraw,
      prediction.pAway,
    ) === "draw"
  );
}

export function computeProjectionReplayMetrics(input: {
  readonly prediction: SealedPredictionInput;
  readonly actual: ActualMatchResult;
  readonly evaluatedAt: string;
}): ProjectionReplayMetrics {
  const evaluation = evaluatePrediction(input);
  const metrics = evaluation.metrics;

  if (metrics === undefined) {
    return Object.freeze({
      winnerHit: false,
      drawHit: false,
      scoreHit: false,
      goalRangeHit: false,
      bttsHit: false,
      overUnderHit: false,
      predictionConfidence: input.prediction.predictionConfidence,
      winnerHitNumeric: 0,
    });
  }

  return Object.freeze({
    winnerHit: metrics.winnerHit,
    drawHit: drawHit(input.prediction, input.actual),
    scoreHit: metrics.scoreHit,
    goalRangeHit: metrics.goalRangeHit,
    bttsHit: predictedBtts(input.prediction) === actualBtts(input.actual),
    overUnderHit: predictedOver25(input.prediction) === actualOver25(input.actual),
    predictionConfidence: input.prediction.predictionConfidence,
    winnerHitNumeric: metrics.winnerHit ? 1 : 0,
  });
}

export function pearsonCorrelation(
  xs: readonly number[],
  ys: readonly number[],
): number | undefined {
  if (xs.length !== ys.length || xs.length < 2) {
    return undefined;
  }

  const n = xs.length;
  const meanX = xs.reduce((sum, value) => sum + value, 0) / n;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / n;
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let index = 0; index < n; index += 1) {
    const dx = (xs[index] ?? 0) - meanX;
    const dy = (ys[index] ?? 0) - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  if (denomX === 0 || denomY === 0) {
    return undefined;
  }

  return numerator / Math.sqrt(denomX * denomY);
}
