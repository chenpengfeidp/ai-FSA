import type { EvaluationHistoryRecord } from "../domain/evaluation-history.js";
import {
  MINIMUM_QUALIFIED_REPLAY_SEGMENT_SAMPLE_SIZE,
  type ProjectionReplayMetricSummary,
} from "../domain/projection-replay-comparison-report.js";
import {
  PROJECTION_REPLAY_REPORT_MODEL_VERSION,
  ProjectionReplayReportValidationError,
  type FootballStateContribution,
  type ProjectionReplayReport,
  type ProjectionVersionComparison,
  type ReplaySummary,
  type ScriptContribution,
} from "../domain/projection-replay-report.js";
import { computeProjectionReplayComparisonReport } from "./compute-projection-replay-comparison-report.js";
import type { ProjectionReplayMetadata } from "./projection-replay-metadata.js";
import type {
  ProjectionReplayRecordOutcome,
  ReplayRunnerResult,
} from "./replay-runner.js";

const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function requireTimestamp(value: string): string {
  if (!isoTimestampPattern.test(value) || Number.isNaN(Date.parse(value))) {
    throw new ProjectionReplayReportValidationError(
      "computedAt must be a valid ISO 8601 timestamp.",
    );
  }

  return value;
}

function roundRatio(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function ratioMetric(
  hits: number,
  sampleSize: number,
): ProjectionReplayMetricSummary {
  return Object.freeze({
    value: sampleSize === 0 ? undefined : roundRatio(hits / sampleSize),
    sampleSize,
    qualified: sampleSize >= MINIMUM_QUALIFIED_REPLAY_SEGMENT_SAMPLE_SIZE,
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

function buildReplaySummary(replayResult: ReplayRunnerResult): ReplaySummary {
  const v2Completed = replayResult.outcomes.filter(
    (outcome) => outcome.v2ReplayStatus === "completed",
  );

  return Object.freeze({
    populationSampleSize: replayResult.outcomes.length,
    v1ScoredSampleSize: replayResult.outcomes.length,
    v2ScoredSampleSize: v2Completed.length,
    v2ReplayCoverage: ratioMetric(v2Completed.length, replayResult.outcomes.length),
    replayedAt: replayResult.replayedAt,
  });
}

function buildVersionComparison(
  comparisonReport: ReturnType<typeof computeProjectionReplayComparisonReport>,
): ProjectionVersionComparison {
  return Object.freeze({
    v1: comparisonReport.overall.v1,
    v2: comparisonReport.overall.v2,
    improvement: comparisonReport.overall.deltas,
  });
}

interface WeightedAccumulator {
  activationCount: number;
  weightSum: number;
  confidenceSum: number;
  winnerWeightedHits: number;
  goalRangeWeightedHits: number;
  scoreWeightedHits: number;
}

function accumulateWeightedHit(
  accumulator: WeightedAccumulator,
  weight: number,
  metrics: NonNullable<ProjectionReplayRecordOutcome["v2Metrics"]>,
  metadata: ProjectionReplayMetadata,
): void {
  accumulator.activationCount += 1;
  accumulator.weightSum += weight;
  accumulator.confidenceSum += metadata.projectionConfidence;

  if (metrics.winnerHit) {
    accumulator.winnerWeightedHits += weight;
  }

  if (metrics.goalRangeHit) {
    accumulator.goalRangeWeightedHits += weight;
  }

  if (metrics.scoreHit) {
    accumulator.scoreWeightedHits += weight;
  }
}

function buildScriptContributions(
  outcomes: readonly ProjectionReplayRecordOutcome[],
): readonly ScriptContribution[] {
  const v2Completed = outcomes.filter(
    (outcome) =>
      outcome.v2ReplayStatus === "completed" &&
      outcome.v2Metrics !== null &&
      outcome.v2Metadata !== null,
  );
  const accumulators = new Map<
    string,
    WeightedAccumulator & { readonly label: string }
  >();

  for (const outcome of v2Completed) {
    const metadata = outcome.v2Metrics === null ? null : outcome.v2Metadata;

    if (metadata === null || outcome.v2Metrics === null) {
      continue;
    }

    for (const script of metadata.activeMatchScripts) {
      const existing = accumulators.get(script.scriptId);

      if (existing === undefined) {
        accumulators.set(
          script.scriptId,
          Object.assign(createAccumulator(), { label: script.label }),
        );
      }

      const accumulator = accumulators.get(script.scriptId);

      if (accumulator === undefined) {
        continue;
      }

      accumulateWeightedHit(accumulator, script.weight, outcome.v2Metrics, metadata);
    }
  }

  const denominator = v2Completed.length;

  return Object.freeze(
    [...accumulators.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([scriptId, accumulator]) =>
        Object.freeze({
          scriptId,
          label: accumulator.label,
          activationCount: accumulator.activationCount,
          activationFrequency:
            denominator === 0
              ? 0
              : roundRatio(accumulator.activationCount / denominator),
          averageWeight:
            accumulator.activationCount === 0
              ? 0
              : roundRatio(accumulator.weightSum / accumulator.activationCount),
          averageConfidence:
            accumulator.activationCount === 0
              ? 0
              : roundRatio(accumulator.confidenceSum / accumulator.activationCount),
          winnerAccuracy: ratioMetric(
            accumulator.winnerWeightedHits,
            accumulator.weightSum,
          ),
          goalRangeAccuracy: ratioMetric(
            accumulator.goalRangeWeightedHits,
            accumulator.weightSum,
          ),
          scoreAccuracy: ratioMetric(
            accumulator.scoreWeightedHits,
            accumulator.weightSum,
          ),
        }),
      ),
  );
}

function createAccumulator(): WeightedAccumulator {
  return {
    activationCount: 0,
    weightSum: 0,
    confidenceSum: 0,
    winnerWeightedHits: 0,
    goalRangeWeightedHits: 0,
    scoreWeightedHits: 0,
  };
}

interface DimensionAccumulator {
  sampleSize: number;
  winnerHits: number;
  goalRangeHits: number;
  scoreHits: number;
}

function buildFootballStateContributions(
  outcomes: readonly ProjectionReplayRecordOutcome[],
): readonly FootballStateContribution[] {
  const groups = new Map<
    string,
    DimensionAccumulator & { label: string; level: string }
  >();

  for (const outcome of outcomes) {
    if (
      outcome.v2ReplayStatus !== "completed" ||
      outcome.v2Metrics === null ||
      outcome.v2Metadata === null
    ) {
      continue;
    }

    for (const dimension of outcome.v2Metadata.footballStateDimensions) {
      const key = `${dimension.dimensionId}:${dimension.level}`;
      const existing = groups.get(key);

      if (existing === undefined) {
        groups.set(key, {
          label: dimension.dimensionLabel,
          level: dimension.level,
          sampleSize: 0,
          winnerHits: 0,
          goalRangeHits: 0,
          scoreHits: 0,
        });
      }

      const bucket = groups.get(key);

      if (bucket === undefined) {
        continue;
      }

      bucket.sampleSize += 1;

      if (outcome.v2Metrics.winnerHit) {
        bucket.winnerHits += 1;
      }

      if (outcome.v2Metrics.goalRangeHit) {
        bucket.goalRangeHits += 1;
      }

      if (outcome.v2Metrics.scoreHit) {
        bucket.scoreHits += 1;
      }
    }
  }

  return Object.freeze(
    [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([segmentKey, bucket]) => {
        const dimensionId = segmentKey.split(":")[0] ?? segmentKey;

        return Object.freeze({
          dimensionId,
          dimensionLabel: bucket.label,
          level: bucket.level,
          sampleSize: bucket.sampleSize,
          winnerAccuracy: ratioMetric(bucket.winnerHits, bucket.sampleSize),
          goalRangeAccuracy: ratioMetric(bucket.goalRangeHits, bucket.sampleSize),
          scoreAccuracy: ratioMetric(bucket.scoreHits, bucket.sampleSize),
        });
      }),
  );
}

export interface ComputeProjectionReplayReportInput {
  readonly replayResult: ReplayRunnerResult;
  readonly sourceRecords: readonly EvaluationHistoryRecord[];
  readonly computedAt: string;
}

export function computeProjectionReplayReport(
  input: ComputeProjectionReplayReportInput,
): ProjectionReplayReport {
  const computedAt = requireTimestamp(input.computedAt);
  const comparisonReport = computeProjectionReplayComparisonReport({
    outcomes: input.replayResult.outcomes,
    sourceRecords: input.sourceRecords,
    computedAt,
  });
  const summary = buildReplaySummary(input.replayResult);
  const versionComparison = buildVersionComparison(comparisonReport);
  const scriptContributions = buildScriptContributions(input.replayResult.outcomes);
  const footballStateContributions = buildFootballStateContributions(
    input.replayResult.outcomes,
  );
  const limitations = Object.freeze([
    ...comparisonReport.limitations,
    "Match Script and Football State statistics derive from V2 replay metadata only.",
    "Script accuracy uses weight-weighted attribution across all active scripts per replay.",
  ]);
  const reportBody: Omit<ProjectionReplayReport, "checksum"> = {
    modelVersion: PROJECTION_REPLAY_REPORT_MODEL_VERSION,
    computedAt,
    summary,
    versionComparison,
    comparisonReport,
    scriptContributions,
    footballStateContributions,
    limitations,
  };

  return Object.freeze({
    ...reportBody,
    checksum: stableChecksum([
      reportBody.modelVersion,
      reportBody.computedAt,
      String(reportBody.summary.populationSampleSize),
      String(reportBody.summary.v2ScoredSampleSize),
      reportBody.versionComparison.improvement.winnerAccuracyDelta?.toString() ??
        "na",
    ]),
  });
}
