import type {
  ActualMatchResult,
  MatchWinner,
} from "../domain/actual-match-result.js";
import {
  createPredictionEvaluationRecord,
  type EvaluationMetrics,
  type FeatureCoverageMetrics,
  type GoalRangeBucket,
  type PredictionEvaluationRecord,
  type RuleCoverageMetrics,
  type ScenarioHitMetrics,
  type SealedPredictionInput,
  type SealedScenario,
} from "../domain/prediction-evaluation.js";

export class PredictionEvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PredictionEvaluationError";
  }
}

/** Core football Features used for coverage ratio (honest absence lowers coverage). */
export const CORE_EVALUATION_FEATURE_NAMES = Object.freeze([
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
] as const);

const PAPER_DISCLAIMER =
  "Paper unit return is a research framing metric only — not wagering advice.";

const HIGH_CONFIDENCE_THRESHOLD = 70;

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

function roundRatio(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function predictedWinnerFromProbs(
  pHome: number,
  pDraw: number,
  pAway: number,
): MatchWinner {
  if (pHome >= pDraw && pHome >= pAway) {
    return "home";
  }

  if (pDraw >= pHome && pDraw >= pAway) {
    return "draw";
  }

  return "away";
}

export function goalRangeBucket(totalGoals: number): GoalRangeBucket {
  if (totalGoals <= 1) {
    return "range01";
  }

  if (totalGoals <= 3) {
    return "range23";
  }

  return "range4Plus";
}

export function predictedGoalRangeBucket(
  goalRange: SealedPredictionInput["goalRange"],
): GoalRangeBucket {
  if (
    goalRange.range01 >= goalRange.range23 &&
    goalRange.range01 >= goalRange.range4Plus
  ) {
    return "range01";
  }

  if (
    goalRange.range23 >= goalRange.range01 &&
    goalRange.range23 >= goalRange.range4Plus
  ) {
    return "range23";
  }

  return "range4Plus";
}

function scorelineMatches(
  scenario: SealedScenario,
  actual: ActualMatchResult,
): boolean {
  return (
    scenario.homeGoals === actual.homeGoals &&
    scenario.awayGoals === actual.awayGoals
  );
}

function buildScenarioHit(
  scenarios: SealedPredictionInput["scenarios"],
  actual: ActualMatchResult,
): ScenarioHitMetrics {
  const mostLikely = scorelineMatches(scenarios.mostLikely, actual);
  const alternative = scorelineMatches(scenarios.secondLikely, actual);
  const upset = scorelineMatches(scenarios.upset, actual);

  return Object.freeze({
    mostLikely,
    alternative,
    upset,
    anyScoreline: mostLikely || alternative || upset,
    mostLikelyWinner: scenarios.mostLikely.winner === actual.winner,
  });
}

function buildRuleCoverage(
  rules: SealedPredictionInput["rules"],
): RuleCoverageMetrics {
  let pass = 0;
  let fail = 0;
  let inapplicable = 0;

  for (const rule of rules) {
    if (rule.status === "PASS") {
      pass += 1;
    } else if (rule.status === "FAIL") {
      fail += 1;
    } else {
      inapplicable += 1;
    }
  }

  const applicable = pass + fail;

  return Object.freeze({
    applicable,
    pass,
    fail,
    inapplicable,
    agreementRatio: applicable === 0 ? 0 : roundRatio(pass / applicable),
  });
}

function buildFeatureCoverage(
  featureNames: readonly string[],
): FeatureCoverageMetrics {
  const presentNames = new Set(featureNames);
  let corePresent = 0;

  for (const name of CORE_EVALUATION_FEATURE_NAMES) {
    if (presentNames.has(name)) {
      corePresent += 1;
    }
  }

  const coreExpected = CORE_EVALUATION_FEATURE_NAMES.length;

  return Object.freeze({
    present: featureNames.length,
    corePresent,
    coreExpected,
    coverageRatio: roundRatio(corePresent / coreExpected),
  });
}

function buildMetrics(
  prediction: SealedPredictionInput,
  actual: ActualMatchResult,
): EvaluationMetrics {
  const predictedWinner = predictedWinnerFromProbs(
    prediction.pHome,
    prediction.pDraw,
    prediction.pAway,
  );
  const winnerHit = predictedWinner === actual.winner;
  const top = prediction.topScorelines[0];
  const scoreHit =
    top !== undefined &&
    top.homeGoals === actual.homeGoals &&
    top.awayGoals === actual.awayGoals;
  const mostLikelyTotal =
    prediction.scenarios.mostLikely.homeGoals +
    prediction.scenarios.mostLikely.awayGoals;
  const goalHit = mostLikelyTotal === actual.totalGoals;
  const predictedGoalRange = predictedGoalRangeBucket(prediction.goalRange);
  const actualGoalRange = goalRangeBucket(actual.totalGoals);
  const goalRangeHit = predictedGoalRange === actualGoalRange;
  const highConfidence =
    prediction.predictionConfidence >= HIGH_CONFIDENCE_THRESHOLD ||
    prediction.confidenceBand === "high" ||
    prediction.confidenceBand === "very_high";
  const confidenceCorrectness = !highConfidence
    ? ("not_claimed" as const)
    : winnerHit
      ? ("correct" as const)
      : ("incorrect" as const);

  return Object.freeze({
    winnerHit,
    scoreHit,
    goalHit,
    goalRangeHit,
    predictedWinner,
    predictedGoalRange,
    actualGoalRange,
    scenarioHit: buildScenarioHit(prediction.scenarios, actual),
    confidenceCorrectness,
    ruleCoverage: buildRuleCoverage(prediction.rules),
    featureCoverage: buildFeatureCoverage(prediction.featureNames),
    paperUnitReturn: winnerHit ? 1 : -1,
    paperMetricDisclaimer: PAPER_DISCLAIMER,
  });
}

function metricsChecksum(metrics: EvaluationMetrics): string {
  return [
    metrics.winnerHit ? "1" : "0",
    metrics.scoreHit ? "1" : "0",
    metrics.goalHit ? "1" : "0",
    metrics.goalRangeHit ? "1" : "0",
    metrics.predictedWinner,
    metrics.scenarioHit.mostLikely ? "1" : "0",
    metrics.scenarioHit.alternative ? "1" : "0",
    metrics.scenarioHit.upset ? "1" : "0",
    metrics.confidenceCorrectness,
    String(metrics.ruleCoverage.agreementRatio),
    String(metrics.featureCoverage.coverageRatio),
    String(metrics.paperUnitReturn),
  ].join("|");
}

export interface EvaluatePredictionInput {
  readonly prediction: SealedPredictionInput;
  readonly actual: ActualMatchResult;
  readonly evaluatedAt: string;
}

/**
 * Pure A1 evaluation: sealed prediction vs actual outcome.
 * Never mutates prediction inputs.
 */
export function evaluatePrediction(
  input: EvaluatePredictionInput,
): PredictionEvaluationRecord {
  const { prediction, actual, evaluatedAt } = input;

  if (prediction.matchId !== actual.matchId) {
    throw new PredictionEvaluationError(
      "prediction.matchId and actual.matchId must match.",
    );
  }

  if (prediction.projectionStatus !== "completed_nonempty") {
    return createPredictionEvaluationRecord({
      matchId: prediction.matchId,
      evaluatedAt,
      status: "excluded",
      exclusionReason: `projection status ${prediction.projectionStatus} is not scored`,
      projectionChecksum: prediction.projectionChecksum,
      projectionModelVersion: prediction.projectionModelVersion,
      ...(prediction.featureModelVersion === undefined
        ? {}
        : { featureModelVersion: prediction.featureModelVersion }),
      ...(prediction.ruleSetVersion === undefined
        ? {}
        : { ruleSetVersion: prediction.ruleSetVersion }),
      checksum: stableChecksum([
        prediction.matchId,
        prediction.projectionChecksum,
        prediction.projectionStatus,
        "excluded",
      ]),
    });
  }

  const metrics = buildMetrics(prediction, actual);
  const checksum = stableChecksum([
    prediction.matchId,
    prediction.projectionChecksum,
    actual.homeGoals.toString(),
    actual.awayGoals.toString(),
    actual.winner,
    metricsChecksum(metrics),
    evaluatedAt,
  ]);

  return createPredictionEvaluationRecord({
    matchId: prediction.matchId,
    evaluatedAt,
    status: "scored",
    projectionChecksum: prediction.projectionChecksum,
    projectionModelVersion: prediction.projectionModelVersion,
    ...(prediction.featureModelVersion === undefined
      ? {}
      : { featureModelVersion: prediction.featureModelVersion }),
    ...(prediction.ruleSetVersion === undefined
      ? {}
      : { ruleSetVersion: prediction.ruleSetVersion }),
    actual,
    metrics,
    checksum,
  });
}
