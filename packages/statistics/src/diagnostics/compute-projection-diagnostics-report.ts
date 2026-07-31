import type { EvaluationHistoryRecord } from "../domain/evaluation-history.js";
import type { ActualMatchResult } from "../domain/actual-match-result.js";
import type { SealedPredictionInput } from "../domain/prediction-evaluation.js";
import {
  MINIMUM_QUALIFIED_DIAGNOSTICS_SAMPLE_SIZE,
  PROJECTION_DIAGNOSTICS_REPORT_MODEL_VERSION,
  ProjectionDiagnosticsReportValidationError,
  type ConfidenceBucketRow,
  type ConfidenceDiagnostics,
  type FailureCategory,
  type FailureDistribution,
  type FootballStateDiagnostics,
  type FootballStateDiagnosticsRow,
  type ProjectionDiagnosticsReport,
  type RuleActivationRow,
  type RuleConflictPairRow,
  type RuleDiagnostics,
  type RuleIncorrectCorrelationRow,
  type ScriptDiagnostics,
  type ScriptDiagnosticsRow,
} from "../domain/projection-diagnostics-report.js";
import type { ProjectionReplayMetricSummary } from "../domain/projection-replay-comparison-report.js";
import type { ProjectionReplayMetrics } from "../replay/projection-replay-metrics.js";
import type {
  ProjectionReplayRecordOutcome,
  ReplayRunnerResult,
} from "../replay/replay-runner.js";

const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

const FAILURE_LABELS: Readonly<Record<FailureCategory, string>> = Object.freeze({
  winner_miss: "Winner miss",
  draw_miss: "Draw miss",
  score_miss: "Score miss",
  goal_range_miss: "Goal-range miss",
  btts_miss: "BTTS miss",
  over_under_miss: "Over/Under miss",
});

const RULE_SATURATION_THRESHOLD = 12;
const TOP_N = 8;

interface DiagnosticCase {
  readonly historyId: string;
  readonly prediction: SealedPredictionInput;
  readonly metrics: ProjectionReplayMetrics;
  readonly actual: ActualMatchResult;
  readonly metadata: ProjectionReplayRecordOutcome["v2Metadata"];
}

function requireTimestamp(value: string): string {
  if (!isoTimestampPattern.test(value) || Number.isNaN(Date.parse(value))) {
    throw new ProjectionDiagnosticsReportValidationError(
      "computedAt must be a valid ISO 8601 timestamp.",
    );
  }

  return value;
}

function roundRatio(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function roundError(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function ratioMetric(
  hits: number,
  sampleSize: number,
): ProjectionReplayMetricSummary {
  return Object.freeze({
    value: sampleSize === 0 ? undefined : roundRatio(hits / sampleSize),
    sampleSize,
    qualified: sampleSize >= MINIMUM_QUALIFIED_DIAGNOSTICS_SAMPLE_SIZE,
  });
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

function selectCases(
  outcomes: readonly ProjectionReplayRecordOutcome[],
  recordsByHistoryId: ReadonlyMap<string, EvaluationHistoryRecord>,
): readonly DiagnosticCase[] {
  const cases: DiagnosticCase[] = [];

  for (const outcome of outcomes) {
    const record = recordsByHistoryId.get(outcome.historyId);

    if (record === undefined) {
      continue;
    }

    if (outcome.v2ReplayStatus === "completed" && outcome.v2Metrics !== null) {
      const prediction = outcome.v2Prediction ?? outcome.v1Prediction;
      cases.push(
        Object.freeze({
          historyId: outcome.historyId,
          prediction,
          metrics: outcome.v2Metrics,
          actual: record.actualResult,
          metadata: outcome.v2Metadata,
        }),
      );
      continue;
    }

    cases.push(
      Object.freeze({
        historyId: outcome.historyId,
        prediction: outcome.v1Prediction,
        metrics: outcome.v1Metrics,
        actual: record.actualResult,
        metadata: null,
      }),
    );
  }

  return Object.freeze(cases);
}

function scoreError(
  prediction: SealedPredictionInput,
  actual: ActualMatchResult,
): number {
  const mostLikely = prediction.scenarios.mostLikely;

  return (
    Math.abs(mostLikely.homeGoals - actual.homeGoals) +
    Math.abs(mostLikely.awayGoals - actual.awayGoals)
  );
}

function goalError(
  prediction: SealedPredictionInput,
  actual: ActualMatchResult,
): number {
  const mostLikely = prediction.scenarios.mostLikely;
  const predictedTotal = mostLikely.homeGoals + mostLikely.awayGoals;

  return Math.abs(predictedTotal - actual.totalGoals);
}

function buildFailureDistribution(
  cases: readonly DiagnosticCase[],
): FailureDistribution {
  const counts: Record<FailureCategory, number> = {
    winner_miss: 0,
    draw_miss: 0,
    score_miss: 0,
    goal_range_miss: 0,
    btts_miss: 0,
    over_under_miss: 0,
  };
  let drawEligible = 0;

  for (const diagnosticCase of cases) {
    if (!diagnosticCase.metrics.winnerHit) {
      counts.winner_miss += 1;
    }

    if (diagnosticCase.actual.winner === "draw") {
      drawEligible += 1;

      if (!diagnosticCase.metrics.drawHit) {
        counts.draw_miss += 1;
      }
    }

    if (!diagnosticCase.metrics.scoreHit) {
      counts.score_miss += 1;
    }

    if (!diagnosticCase.metrics.goalRangeHit) {
      counts.goal_range_miss += 1;
    }

    if (!diagnosticCase.metrics.bttsHit) {
      counts.btts_miss += 1;
    }

    if (!diagnosticCase.metrics.overUnderHit) {
      counts.over_under_miss += 1;
    }
  }

  const sampleSize = cases.length;
  const categories = Object.freeze(
    (Object.keys(counts) as FailureCategory[]).map((category) => {
      const denominator = category === "draw_miss" ? drawEligible : sampleSize;

      return Object.freeze({
        category,
        label: FAILURE_LABELS[category],
        count: counts[category],
        rate: ratioMetric(counts[category], denominator),
      });
    }),
  );
  const topFailureReasons = Object.freeze(
    [...categories]
      .sort(
        (left, right) =>
          right.count - left.count || left.category.localeCompare(right.category),
      )
      .slice(0, TOP_N),
  );

  return Object.freeze({
    sampleSize,
    categories,
    topFailureReasons,
  });
}

function buildScriptDiagnostics(
  cases: readonly DiagnosticCase[],
): ScriptDiagnostics {
  const accumulators = new Map<
    string,
    {
      label: string;
      activationCount: number;
      winnerHits: number;
      confidenceSum: number;
      scoreErrorSum: number;
      goalErrorSum: number;
    }
  >();

  for (const diagnosticCase of cases) {
    const metadata = diagnosticCase.metadata;

    if (metadata === null) {
      continue;
    }

    for (const script of metadata.activeMatchScripts) {
      const existing = accumulators.get(script.scriptId) ?? {
        label: script.label,
        activationCount: 0,
        winnerHits: 0,
        confidenceSum: 0,
        scoreErrorSum: 0,
        goalErrorSum: 0,
      };
      existing.activationCount += 1;
      existing.confidenceSum += metadata.projectionConfidence;
      existing.scoreErrorSum += scoreError(
        diagnosticCase.prediction,
        diagnosticCase.actual,
      );
      existing.goalErrorSum += goalError(
        diagnosticCase.prediction,
        diagnosticCase.actual,
      );

      if (diagnosticCase.metrics.winnerHit) {
        existing.winnerHits += 1;
      }

      accumulators.set(script.scriptId, existing);
    }
  }

  const rows = Object.freeze(
    [...accumulators.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([scriptId, accumulator]) =>
        Object.freeze({
          scriptId,
          label: accumulator.label,
          activationCount: accumulator.activationCount,
          accuracy: ratioMetric(accumulator.winnerHits, accumulator.activationCount),
          averageConfidence:
            accumulator.activationCount === 0
              ? 0
              : roundError(accumulator.confidenceSum / accumulator.activationCount),
          averageScoreError:
            accumulator.activationCount === 0
              ? 0
              : roundError(accumulator.scoreErrorSum / accumulator.activationCount),
          averageGoalError:
            accumulator.activationCount === 0
              ? 0
              : roundError(accumulator.goalErrorSum / accumulator.activationCount),
        } satisfies ScriptDiagnosticsRow),
      ),
  );
  const ranked = [...rows].sort((left, right) => {
    const leftValue = left.accuracy.value ?? -1;
    const rightValue = right.accuracy.value ?? -1;

    return rightValue - leftValue || left.scriptId.localeCompare(right.scriptId);
  });

  return Object.freeze({
    rows,
    bestScripts: Object.freeze(ranked.slice(0, TOP_N)),
    worstScripts: Object.freeze([...ranked].reverse().slice(0, TOP_N)),
  });
}

function buildFootballStateDiagnostics(
  cases: readonly DiagnosticCase[],
): FootballStateDiagnostics {
  const groups = new Map<
    string,
    {
      dimensionId: string;
      dimensionLabel: string;
      level: string;
      sampleSize: number;
      winnerHits: number;
      falsePositive: number;
      falseNegative: number;
    }
  >();

  for (const diagnosticCase of cases) {
    const metadata = diagnosticCase.metadata;

    if (metadata === null) {
      continue;
    }

    for (const dimension of metadata.footballStateDimensions) {
      const key = `${dimension.dimensionId}:${dimension.level}`;
      const existing = groups.get(key) ?? {
        dimensionId: dimension.dimensionId,
        dimensionLabel: dimension.dimensionLabel,
        level: dimension.level,
        sampleSize: 0,
        winnerHits: 0,
        falsePositive: 0,
        falseNegative: 0,
      };
      existing.sampleSize += 1;

      if (diagnosticCase.metrics.winnerHit) {
        existing.winnerHits += 1;
      } else if (dimension.level === "high" || dimension.level === "medium") {
        // Elevated state present but winner prediction failed.
        existing.falsePositive += 1;
      } else {
        // Weak/absent state with winner miss (missed protective signal).
        existing.falseNegative += 1;
      }

      groups.set(key, existing);
    }
  }

  const rows = Object.freeze(
    [...groups.values()]
      .sort(
        (left, right) =>
          left.dimensionId.localeCompare(right.dimensionId) ||
          left.level.localeCompare(right.level),
      )
      .map((bucket) =>
        Object.freeze({
          dimensionId: bucket.dimensionId,
          dimensionLabel: bucket.dimensionLabel,
          level: bucket.level,
          sampleSize: bucket.sampleSize,
          accuracy: ratioMetric(bucket.winnerHits, bucket.sampleSize),
          falsePositive: bucket.falsePositive,
          falseNegative: bucket.falseNegative,
        } satisfies FootballStateDiagnosticsRow),
      ),
  );

  return Object.freeze({ rows });
}

function buildRuleDiagnostics(cases: readonly DiagnosticCase[]): RuleDiagnostics {
  const activation = new Map<string, number>();
  const incorrect = new Map<string, { incorrect: number; activation: number }>();
  const conflicts = new Map<
    string,
    { homeRule: string; awayRule: string; coActivation: number; incorrect: number }
  >();
  let passSum = 0;
  let applicableSum = 0;
  let maxPass = 0;
  let saturatedMatchCount = 0;

  for (const diagnosticCase of cases) {
    const passRules = diagnosticCase.prediction.rules.filter(
      (rule) => rule.status === "PASS",
    );
    const applicableRules = diagnosticCase.prediction.rules.filter(
      (rule) => rule.status !== "INAPPLICABLE",
    );
    passSum += passRules.length;
    applicableSum += applicableRules.length;
    maxPass = Math.max(maxPass, passRules.length);

    if (passRules.length >= RULE_SATURATION_THRESHOLD) {
      saturatedMatchCount += 1;
    }

    const winnerMiss = !diagnosticCase.metrics.winnerHit;
    const homePass = passRules
      .filter((rule) => rule.channel === "home+")
      .map((rule) => rule.ruleName)
      .sort((left, right) => left.localeCompare(right));
    const awayPass = passRules
      .filter((rule) => rule.channel === "away+")
      .map((rule) => rule.ruleName)
      .sort((left, right) => left.localeCompare(right));

    for (const rule of passRules) {
      activation.set(rule.ruleName, (activation.get(rule.ruleName) ?? 0) + 1);
      const existing = incorrect.get(rule.ruleName) ?? {
        incorrect: 0,
        activation: 0,
      };
      existing.activation += 1;

      if (winnerMiss) {
        existing.incorrect += 1;
      }

      incorrect.set(rule.ruleName, existing);
    }

    for (const homeRule of homePass) {
      for (const awayRule of awayPass) {
        const key = `${homeRule}|${awayRule}`;
        const existing = conflicts.get(key) ?? {
          homeRule,
          awayRule,
          coActivation: 0,
          incorrect: 0,
        };
        existing.coActivation += 1;

        if (winnerMiss) {
          existing.incorrect += 1;
        }

        conflicts.set(key, existing);
      }
    }
  }

  const sampleSize = cases.length;
  const mostFrequentlyActivated = Object.freeze(
    [...activation.entries()]
      .sort(
        ([leftName, leftCount], [rightName, rightCount]) =>
          rightCount - leftCount || leftName.localeCompare(rightName),
      )
      .slice(0, TOP_N)
      .map(([ruleName, activationCount]) =>
        Object.freeze({
          ruleName,
          activationCount,
          activationRate:
            sampleSize === 0 ? 0 : roundRatio(activationCount / sampleSize),
        } satisfies RuleActivationRow),
      ),
  );
  const correlatedWithIncorrect = Object.freeze(
    [...incorrect.entries()]
      .map(([ruleName, stats]) =>
        Object.freeze({
          ruleName,
          incorrectCount: stats.incorrect,
          incorrectRate:
            stats.activation === 0
              ? 0
              : roundRatio(stats.incorrect / stats.activation),
          activationCount: stats.activation,
        } satisfies RuleIncorrectCorrelationRow),
      )
      .sort(
        (left, right) =>
          right.incorrectRate - left.incorrectRate ||
          right.incorrectCount - left.incorrectCount ||
          left.ruleName.localeCompare(right.ruleName),
      )
      .slice(0, TOP_N),
  );
  const conflictPairs = Object.freeze(
    [...conflicts.values()]
      .map((pair) =>
        Object.freeze({
          homeRule: pair.homeRule,
          awayRule: pair.awayRule,
          coActivationCount: pair.coActivation,
          incorrectCount: pair.incorrect,
          incorrectRate:
            pair.coActivation === 0
              ? 0
              : roundRatio(pair.incorrect / pair.coActivation),
        } satisfies RuleConflictPairRow),
      )
      .sort(
        (left, right) =>
          right.incorrectRate - left.incorrectRate ||
          right.coActivationCount - left.coActivationCount ||
          left.homeRule.localeCompare(right.homeRule),
      )
      .slice(0, TOP_N),
  );

  return Object.freeze({
    mostFrequentlyActivated,
    correlatedWithIncorrect,
    conflictPairs,
    saturation: Object.freeze({
      averagePassRules: sampleSize === 0 ? 0 : roundError(passSum / sampleSize),
      averageApplicableRules:
        sampleSize === 0 ? 0 : roundError(applicableSum / sampleSize),
      maxPassRules: maxPass,
      saturatedMatchCount,
      saturationThreshold: RULE_SATURATION_THRESHOLD,
    }),
  });
}

function buildConfidenceDiagnostics(
  cases: readonly DiagnosticCase[],
): ConfidenceDiagnostics {
  let highConfidenceWrong = 0;
  let highConfidenceTotal = 0;
  let lowConfidenceCorrect = 0;
  let lowConfidenceTotal = 0;
  const buckets = new Map<
    ConfidenceBucketRow["band"],
    { sampleSize: number; hits: number; incorrect: number }
  >();

  for (const band of ["low", "medium", "high", "very_high"] as const) {
    buckets.set(band, { sampleSize: 0, hits: 0, incorrect: 0 });
  }

  for (const diagnosticCase of cases) {
    const band = diagnosticCase.prediction.confidenceBand;
    const bucket = buckets.get(band);

    if (bucket !== undefined) {
      bucket.sampleSize += 1;

      if (diagnosticCase.metrics.winnerHit) {
        bucket.hits += 1;
      } else {
        bucket.incorrect += 1;
      }
    }

    if (band === "high" || band === "very_high") {
      highConfidenceTotal += 1;

      if (!diagnosticCase.metrics.winnerHit) {
        highConfidenceWrong += 1;
      }
    }

    if (band === "low") {
      lowConfidenceTotal += 1;

      if (diagnosticCase.metrics.winnerHit) {
        lowConfidenceCorrect += 1;
      }
    }
  }

  const calibrationBuckets = Object.freeze(
    (["low", "medium", "high", "very_high"] as const).map((band) => {
      const bucket = buckets.get(band) ?? {
        sampleSize: 0,
        hits: 0,
        incorrect: 0,
      };

      return Object.freeze({
        band,
        sampleSize: bucket.sampleSize,
        accuracy: ratioMetric(bucket.hits, bucket.sampleSize),
        incorrectCount: bucket.incorrect,
      } satisfies ConfidenceBucketRow);
    }),
  );

  return Object.freeze({
    highConfidenceWrong,
    lowConfidenceCorrect,
    highConfidenceWrongRate: ratioMetric(highConfidenceWrong, highConfidenceTotal),
    lowConfidenceCorrectRate: ratioMetric(lowConfidenceCorrect, lowConfidenceTotal),
    calibrationBuckets,
  });
}

export interface ComputeProjectionDiagnosticsReportInput {
  readonly replayResult: ReplayRunnerResult;
  readonly sourceRecords: readonly EvaluationHistoryRecord[];
  readonly computedAt: string;
}

export function computeProjectionDiagnosticsReport(
  input: ComputeProjectionDiagnosticsReportInput,
): ProjectionDiagnosticsReport {
  const computedAt = requireTimestamp(input.computedAt);
  const recordsByHistoryId = new Map(
    input.sourceRecords.map((record) => [record.historyId, record]),
  );
  const cases = selectCases(input.replayResult.outcomes, recordsByHistoryId);
  const failureDistribution = buildFailureDistribution(cases);
  const scriptDiagnostics = buildScriptDiagnostics(cases);
  const footballStateDiagnostics = buildFootballStateDiagnostics(cases);
  const ruleDiagnostics = buildRuleDiagnostics(cases);
  const confidenceDiagnostics = buildConfidenceDiagnostics(cases);
  const limitations = Object.freeze([
    "Diagnostics read sealed Evaluation History and temporary replay outcomes only — never mutates History or Projection.",
    "Primary diagnostics prefer V2 replay outcomes when sidecar replay completed; otherwise sealed V1 snapshots are used.",
    "Match Script and Football State diagnostics require V2 replay metadata; rows are empty when no V2 sidecars are present.",
    "False positive = elevated Football State (high/medium) with winner miss; false negative = absent/low state with winner miss.",
    "Rule conflict pairs are PASS home+ and away+ co-activations; correlation is observational, not causal.",
    "No ML, parameter tuning, or automatic optimization is performed.",
  ]);
  const reportBody: Omit<ProjectionDiagnosticsReport, "checksum"> = {
    modelVersion: PROJECTION_DIAGNOSTICS_REPORT_MODEL_VERSION,
    computedAt,
    sampleSize: cases.length,
    failureDistribution,
    scriptDiagnostics,
    footballStateDiagnostics,
    ruleDiagnostics,
    confidenceDiagnostics,
    limitations,
  };

  return Object.freeze({
    ...reportBody,
    checksum: stableChecksum([
      reportBody.modelVersion,
      reportBody.computedAt,
      String(reportBody.sampleSize),
      String(failureDistribution.topFailureReasons[0]?.count ?? 0),
      String(confidenceDiagnostics.highConfidenceWrong),
    ]),
  });
}
