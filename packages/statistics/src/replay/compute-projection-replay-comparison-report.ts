import type { IntelligenceDomainId } from "../domain/contribution-report.js";
import {
  INTELLIGENCE_DOMAIN_IDS,
  INTELLIGENCE_DOMAIN_LABELS,
} from "../domain/contribution-report.js";
import { hasDomainFeatures } from "../contribution/domain-feature-families.js";
import type { EvaluationHistoryRecord } from "../domain/evaluation-history.js";
import {
  MINIMUM_QUALIFIED_REPLAY_SEGMENT_SAMPLE_SIZE,
  PROJECTION_REPLAY_COMPARISON_REPORT_MODEL_VERSION,
  ProjectionReplayComparisonReportValidationError,
  type ProjectionReplayAccuracyBlock,
  type ProjectionReplayAccuracyDelta,
  type ProjectionReplayComparisonReport,
  type ProjectionReplayComparisonSegment,
  type ProjectionReplayMetricSummary,
} from "../domain/projection-replay-comparison-report.js";
import type { FeatureProfileId } from "../domain/validation-report.js";
import {
  FEATURE_PROFILE_IDS,
  FEATURE_PROFILE_LABELS,
} from "../domain/validation-report.js";
import { classifyFeatureProfile } from "../validation/feature-profile.js";
import { computePredictionCalibrationReport } from "../reliability/compute-prediction-calibration-report.js";
import { pearsonCorrelation } from "./projection-replay-metrics.js";
import type { ProjectionReplayRecordOutcome } from "./replay-runner.js";

const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function requireTimestamp(value: string): string {
  if (!isoTimestampPattern.test(value) || Number.isNaN(Date.parse(value))) {
    throw new ProjectionReplayComparisonReportValidationError(
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

function syntheticHistoryRecord(
  outcome: ProjectionReplayRecordOutcome,
  version: "v1" | "v2",
  source: EvaluationHistoryRecord,
): EvaluationHistoryRecord | null {
  const prediction = version === "v1" ? outcome.v1Prediction : outcome.v2Prediction;

  if (prediction === null) {
    return null;
  }

  return Object.freeze({
    ...source,
    predictionSnapshot: prediction,
  });
}

function aggregateMetrics(
  outcomes: readonly ProjectionReplayRecordOutcome[],
  version: "v1" | "v2",
  recordsByHistoryId: ReadonlyMap<string, EvaluationHistoryRecord>,
  computedAt: string,
): ProjectionReplayAccuracyBlock {
  let sampleSize = 0;
  let scoredSampleSize = 0;
  let winnerHits = 0;
  let drawSampleSize = 0;
  let drawHits = 0;
  let scoreHits = 0;
  let goalRangeHits = 0;
  let bttsHits = 0;
  let overUnderHits = 0;
  const confidences: number[] = [];
  const winnerHitsNumeric: number[] = [];
  const calibrationRecords: EvaluationHistoryRecord[] = [];

  for (const outcome of outcomes) {
    sampleSize += 1;
    const metrics = version === "v1" ? outcome.v1Metrics : outcome.v2Metrics;

    if (metrics === null) {
      continue;
    }

    scoredSampleSize += 1;

    if (metrics.winnerHit) {
      winnerHits += 1;
    }

    if (metrics.scoreHit) {
      scoreHits += 1;
    }

    if (metrics.goalRangeHit) {
      goalRangeHits += 1;
    }

    if (metrics.bttsHit) {
      bttsHits += 1;
    }

    if (metrics.overUnderHit) {
      overUnderHits += 1;
    }

    const source = recordsByHistoryId.get(outcome.historyId);

    if (source?.actualResult.winner === "draw") {
      drawSampleSize += 1;

      if (metrics.drawHit) {
        drawHits += 1;
      }
    }

    confidences.push(metrics.predictionConfidence);
    winnerHitsNumeric.push(metrics.winnerHitNumeric);

    if (source !== undefined) {
      const synthetic = syntheticHistoryRecord(outcome, version, source);

      if (synthetic !== null) {
        calibrationRecords.push(synthetic);
      }
    }
  }

  const correlation = pearsonCorrelation(confidences, winnerHitsNumeric);

  return Object.freeze({
    sampleSize,
    scoredSampleSize,
    v2ReplaySampleSize: version === "v2" ? scoredSampleSize : 0,
    winnerAccuracy: ratioMetric(winnerHits, scoredSampleSize),
    drawAccuracy: ratioMetric(drawHits, drawSampleSize),
    scoreAccuracy: ratioMetric(scoreHits, scoredSampleSize),
    goalRangeAccuracy: ratioMetric(goalRangeHits, scoredSampleSize),
    bttsAccuracy: ratioMetric(bttsHits, scoredSampleSize),
    overUnderAccuracy: ratioMetric(overUnderHits, scoredSampleSize),
    confidenceCorrelation: Object.freeze({
      value: correlation === undefined ? undefined : roundRatio(correlation),
      sampleSize: scoredSampleSize,
      qualified: scoredSampleSize >= MINIMUM_QUALIFIED_REPLAY_SEGMENT_SAMPLE_SIZE,
    }),
    calibration: computePredictionCalibrationReport({
      records: Object.freeze(calibrationRecords),
      computedAt,
    }),
  });
}

function computeDeltas(
  v1: ProjectionReplayAccuracyBlock,
  v2: ProjectionReplayAccuracyBlock,
): ProjectionReplayAccuracyDelta {
  const delta = (
    left: ProjectionReplayMetricSummary,
    right: ProjectionReplayMetricSummary,
  ): number | undefined => {
    if (left.value === undefined || right.value === undefined) {
      return undefined;
    }

    return roundRatio(right.value - left.value);
  };

  return Object.freeze({
    winnerAccuracyDelta: delta(v1.winnerAccuracy, v2.winnerAccuracy),
    drawAccuracyDelta: delta(v1.drawAccuracy, v2.drawAccuracy),
    scoreAccuracyDelta: delta(v1.scoreAccuracy, v2.scoreAccuracy),
    goalRangeAccuracyDelta: delta(v1.goalRangeAccuracy, v2.goalRangeAccuracy),
    bttsAccuracyDelta: delta(v1.bttsAccuracy, v2.bttsAccuracy),
    overUnderAccuracyDelta: delta(v1.overUnderAccuracy, v2.overUnderAccuracy),
    confidenceCorrelationDelta: delta(
      v1.confidenceCorrelation,
      v2.confidenceCorrelation,
    ),
  });
}

function buildSegment(
  segmentKey: string,
  label: string,
  outcomes: readonly ProjectionReplayRecordOutcome[],
  recordsByHistoryId: ReadonlyMap<string, EvaluationHistoryRecord>,
  computedAt: string,
): ProjectionReplayComparisonSegment {
  const v1 = aggregateMetrics(outcomes, "v1", recordsByHistoryId, computedAt);
  const v2 = aggregateMetrics(outcomes, "v2", recordsByHistoryId, computedAt);

  return Object.freeze({
    segmentKey,
    label,
    v1,
    v2,
    deltas: computeDeltas(v1, v2),
  });
}

function groupByCompetition(
  outcomes: readonly ProjectionReplayRecordOutcome[],
  recordsByHistoryId: ReadonlyMap<string, EvaluationHistoryRecord>,
  computedAt: string,
): readonly ProjectionReplayComparisonSegment[] {
  const groups = new Map<string, ProjectionReplayRecordOutcome[]>();

  for (const outcome of outcomes) {
    const record = recordsByHistoryId.get(outcome.historyId);
    const key = record?.competitionName ?? record?.competitionId ?? "unknown";
    const bucket = groups.get(key) ?? [];
    bucket.push(outcome);
    groups.set(key, bucket);
  }

  return Object.freeze(
    [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([segmentKey, bucket]) =>
        buildSegment(segmentKey, segmentKey, bucket, recordsByHistoryId, computedAt),
      ),
  );
}

function groupBySeason(
  outcomes: readonly ProjectionReplayRecordOutcome[],
  recordsByHistoryId: ReadonlyMap<string, EvaluationHistoryRecord>,
  computedAt: string,
): readonly ProjectionReplayComparisonSegment[] {
  const groups = new Map<string, ProjectionReplayRecordOutcome[]>();

  for (const outcome of outcomes) {
    const record = recordsByHistoryId.get(outcome.historyId);
    const key = record?.season ?? "unknown";
    const bucket = groups.get(key) ?? [];
    bucket.push(outcome);
    groups.set(key, bucket);
  }

  return Object.freeze(
    [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([segmentKey, bucket]) =>
        buildSegment(segmentKey, segmentKey, bucket, recordsByHistoryId, computedAt),
      ),
  );
}

function groupByFeatureProfile(
  outcomes: readonly ProjectionReplayRecordOutcome[],
  recordsByHistoryId: ReadonlyMap<string, EvaluationHistoryRecord>,
  computedAt: string,
): readonly ProjectionReplayComparisonSegment[] {
  const groups = new Map<FeatureProfileId, ProjectionReplayRecordOutcome[]>();

  for (const profile of FEATURE_PROFILE_IDS) {
    groups.set(profile, []);
  }

  for (const outcome of outcomes) {
    const record = recordsByHistoryId.get(outcome.historyId);

    if (record === undefined) {
      continue;
    }

    const profile = classifyFeatureProfile(record.predictionSnapshot.featureNames);
    groups.get(profile)?.push(outcome);
  }

  return Object.freeze(
    FEATURE_PROFILE_IDS.map((profile) =>
      buildSegment(
        profile,
        FEATURE_PROFILE_LABELS[profile],
        groups.get(profile) ?? [],
        recordsByHistoryId,
        computedAt,
      ),
    ),
  );
}

function groupByIntelligenceDomain(
  outcomes: readonly ProjectionReplayRecordOutcome[],
  recordsByHistoryId: ReadonlyMap<string, EvaluationHistoryRecord>,
  computedAt: string,
): readonly ProjectionReplayComparisonSegment[] {
  return Object.freeze(
    INTELLIGENCE_DOMAIN_IDS.map((domain: IntelligenceDomainId) => {
      const bucket = outcomes.filter((outcome) => {
        const record = recordsByHistoryId.get(outcome.historyId);

        if (record === undefined) {
          return false;
        }

        return hasDomainFeatures(record.predictionSnapshot.featureNames, domain);
      });

      return buildSegment(
        domain,
        INTELLIGENCE_DOMAIN_LABELS[domain],
        bucket,
        recordsByHistoryId,
        computedAt,
      );
    }),
  );
}

export interface ComputeProjectionReplayComparisonReportInput {
  readonly outcomes: readonly ProjectionReplayRecordOutcome[];
  readonly sourceRecords: readonly EvaluationHistoryRecord[];
  readonly computedAt: string;
}

export function computeProjectionReplayComparisonReport(
  input: ComputeProjectionReplayComparisonReportInput,
): ProjectionReplayComparisonReport {
  const computedAt = requireTimestamp(input.computedAt);
  const recordsByHistoryId = new Map(
    input.sourceRecords.map((record) => [record.historyId, record]),
  );
  const overall = buildSegment(
    "overall",
    "Overall population",
    input.outcomes,
    recordsByHistoryId,
    computedAt,
  );
  const v2Replayed = input.outcomes.filter(
    (outcome) => outcome.v2ReplayStatus === "completed",
  ).length;
  const limitations = [
    "Replay reads sealed Evaluation History only — never mutates History rows or original Prediction seals.",
    "Projection V1 replay uses the stored predictionSnapshot (original sealed output).",
    "Projection V2 replay requires SealedProjectionReplayContext sidecar inputs; records without sidecar are skipped for V2 metrics.",
    "BTTS and Over/Under 2.5 metrics are deterministic research overlays derived from sealed scenarios and goal-range marginals.",
    "Calibration sections reuse A2 Prediction Calibration over synthetic replay snapshots — display/analysis only.",
  ];

  if (v2Replayed === 0) {
    limitations.push(
      "No V2 replay contexts were supplied; V2 accuracy blocks reflect zero scored replays.",
    );
  }

  const reportBody: Omit<ProjectionReplayComparisonReport, "checksum"> = {
    modelVersion: PROJECTION_REPLAY_COMPARISON_REPORT_MODEL_VERSION,
    computedAt,
    populationSampleSize: input.outcomes.length,
    v2ReplayCoverage: ratioMetric(v2Replayed, input.outcomes.length),
    overall,
    byCompetition: groupByCompetition(
      input.outcomes,
      recordsByHistoryId,
      computedAt,
    ),
    bySeason: groupBySeason(input.outcomes, recordsByHistoryId, computedAt),
    byFeatureProfile: groupByFeatureProfile(
      input.outcomes,
      recordsByHistoryId,
      computedAt,
    ),
    byIntelligenceDomain: groupByIntelligenceDomain(
      input.outcomes,
      recordsByHistoryId,
      computedAt,
    ),
    limitations: Object.freeze(limitations),
  };

  return Object.freeze({
    ...reportBody,
    checksum: stableChecksum([
      reportBody.modelVersion,
      reportBody.computedAt,
      String(reportBody.populationSampleSize),
      String(v2Replayed),
      reportBody.overall.v1.winnerAccuracy.value?.toString() ?? "na",
      reportBody.overall.v2.winnerAccuracy.value?.toString() ?? "na",
    ]),
  });
}
