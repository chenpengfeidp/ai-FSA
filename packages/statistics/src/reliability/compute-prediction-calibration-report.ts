import type { EvaluationHistoryRecord } from "../domain/evaluation-history.js";
import type { GoalRangeBucket } from "../domain/prediction-evaluation.js";
import {
  CONFIDENCE_BANDS,
  type CalibrationErrorMetric,
  type ConfidenceBandLabel,
  type ConfidenceBucketAccuracyRow,
  type ConfidenceDistributionRow,
  GOAL_RANGE_BUCKETS,
  type GoalRangeCalibrationRow,
  MATCH_OUTCOME_LABELS,
  MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE,
  MINIMUM_QUALIFIED_REPORT_SAMPLE_SIZE,
  type MatchOutcomeLabel,
  type OutcomeCalibrationRow,
  PREDICTION_CALIBRATION_REPORT_MODEL_VERSION,
  PredictionCalibrationReportValidationError,
  type PredictionCalibrationProvenance,
  type PredictionCalibrationReport,
  type ProbabilityBucketRow,
} from "../domain/prediction-calibration-report.js";

export interface ComputePredictionCalibrationReportInput {
  readonly records: readonly EvaluationHistoryRecord[];
  readonly computedAt: string;
}

const PROBABILITY_BUCKET_COUNT = 10;

const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function requireTimestamp(value: string): string {
  if (!isoTimestampPattern.test(value) || Number.isNaN(Date.parse(value))) {
    throw new PredictionCalibrationReportValidationError(
      "computedAt must be a valid ISO 8601 timestamp.",
    );
  }

  return value;
}

function roundRatio(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function probabilityBucketIndex(probability: number): number {
  const clamped = Math.min(1, Math.max(0, probability));
  return Math.min(
    PROBABILITY_BUCKET_COUNT - 1,
    Math.floor(clamped * PROBABILITY_BUCKET_COUNT),
  );
}

function probabilityBucketLabel(min: number, max: number): string {
  return `${Math.round(min * 100)}-${Math.round(max * 100)}%`;
}

interface ProbabilityAccumulator {
  sampleSize: number;
  probabilitySum: number;
  hits: number;
}

function emptyAccumulators(): ProbabilityAccumulator[] {
  return Array.from({ length: PROBABILITY_BUCKET_COUNT }, () => ({
    sampleSize: 0,
    probabilitySum: 0,
    hits: 0,
  }));
}

function toProbabilityBucketRows(
  accumulators: readonly ProbabilityAccumulator[],
): readonly ProbabilityBucketRow[] {
  return Object.freeze(
    accumulators.map((accumulator, index) => {
      const min = index / PROBABILITY_BUCKET_COUNT;
      const max = (index + 1) / PROBABILITY_BUCKET_COUNT;
      const sampleSize = accumulator.sampleSize;

      return Object.freeze({
        bucketLabel: probabilityBucketLabel(min, max),
        minProbability: min,
        maxProbability: max,
        sampleSize,
        meanPredictedProbability:
          sampleSize === 0
            ? undefined
            : roundRatio(accumulator.probabilitySum / sampleSize),
        observedFrequency:
          sampleSize === 0 ? undefined : roundRatio(accumulator.hits / sampleSize),
        qualified: sampleSize >= MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE,
      });
    }),
  );
}

function computeConfidenceSections(records: readonly EvaluationHistoryRecord[]): {
  readonly confidenceBucketAccuracy: readonly ConfidenceBucketAccuracyRow[];
  readonly confidenceDistribution: readonly ConfidenceDistributionRow[];
} {
  const byBand = new Map<
    ConfidenceBandLabel,
    { sampleSize: number; hits: number }
  >();

  for (const band of CONFIDENCE_BANDS) {
    byBand.set(band, { sampleSize: 0, hits: 0 });
  }

  for (const record of records) {
    const metrics = record.evaluation.metrics;

    if (metrics === undefined) {
      continue;
    }

    const bucket = byBand.get(record.confidence.confidenceBand);

    if (bucket === undefined) {
      continue;
    }

    bucket.sampleSize += 1;

    if (metrics.winnerHit) {
      bucket.hits += 1;
    }
  }

  const totalSampleSize = records.length;

  const confidenceBucketAccuracy = Object.freeze(
    CONFIDENCE_BANDS.map((band) => {
      const bucket = byBand.get(band);
      const sampleSize = bucket?.sampleSize ?? 0;
      const hits = bucket?.hits ?? 0;

      return Object.freeze({
        band,
        sampleSize,
        hits,
        accuracy: sampleSize === 0 ? undefined : roundRatio(hits / sampleSize),
        qualified: sampleSize >= MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE,
      });
    }),
  );

  const confidenceDistribution = Object.freeze(
    CONFIDENCE_BANDS.map((band) => {
      const bucket = byBand.get(band);
      const sampleSize = bucket?.sampleSize ?? 0;

      return Object.freeze({
        band,
        sampleSize,
        share: totalSampleSize === 0 ? 0 : roundRatio(sampleSize / totalSampleSize),
      });
    }),
  );

  return { confidenceBucketAccuracy, confidenceDistribution };
}

function computeReliabilityTable(
  records: readonly EvaluationHistoryRecord[],
): readonly ProbabilityBucketRow[] {
  const accumulators = emptyAccumulators();

  for (const record of records) {
    const metrics = record.evaluation.metrics;

    if (metrics === undefined) {
      continue;
    }

    const { pHome, pDraw, pAway } = record.predictionSnapshot;
    const predictedProbability = Math.max(pHome, pDraw, pAway);
    const accumulator = accumulators[probabilityBucketIndex(predictedProbability)];

    if (accumulator === undefined) {
      continue;
    }

    accumulator.sampleSize += 1;
    accumulator.probabilitySum += predictedProbability;

    if (metrics.winnerHit) {
      accumulator.hits += 1;
    }
  }

  return toProbabilityBucketRows(accumulators);
}

function computeExpectedCalibrationError(
  reliabilityTable: readonly ProbabilityBucketRow[],
): CalibrationErrorMetric {
  const totalSampleSize = reliabilityTable.reduce(
    (sum, row) => sum + row.sampleSize,
    0,
  );

  if (totalSampleSize === 0) {
    return Object.freeze({ value: undefined, sampleSize: 0, qualified: false });
  }

  let weightedError = 0;

  for (const row of reliabilityTable) {
    if (
      row.sampleSize === 0 ||
      row.meanPredictedProbability === undefined ||
      row.observedFrequency === undefined
    ) {
      continue;
    }

    weightedError +=
      (row.sampleSize / totalSampleSize) *
      Math.abs(row.observedFrequency - row.meanPredictedProbability);
  }

  return Object.freeze({
    value: roundRatio(weightedError),
    sampleSize: totalSampleSize,
    qualified: totalSampleSize >= MINIMUM_QUALIFIED_REPORT_SAMPLE_SIZE,
  });
}

function outcomeIndicator(
  outcome: MatchOutcomeLabel,
  winner: MatchOutcomeLabel,
): number {
  return outcome === winner ? 1 : 0;
}

function computeBrierScore(
  records: readonly EvaluationHistoryRecord[],
): CalibrationErrorMetric {
  let sampleSize = 0;
  let sumSquaredError = 0;

  for (const record of records) {
    const metrics = record.evaluation.metrics;

    if (metrics === undefined) {
      continue;
    }

    const { pHome, pDraw, pAway } = record.predictionSnapshot;
    const winner = record.actualResult.winner;
    const homeError = pHome - outcomeIndicator("home", winner);
    const drawError = pDraw - outcomeIndicator("draw", winner);
    const awayError = pAway - outcomeIndicator("away", winner);

    sumSquaredError += homeError ** 2 + drawError ** 2 + awayError ** 2;
    sampleSize += 1;
  }

  return Object.freeze({
    value: sampleSize === 0 ? undefined : roundRatio(sumSquaredError / sampleSize),
    sampleSize,
    qualified: sampleSize >= MINIMUM_QUALIFIED_REPORT_SAMPLE_SIZE,
  });
}

function probabilityForOutcome(
  prediction: EvaluationHistoryRecord["predictionSnapshot"],
  outcome: MatchOutcomeLabel,
): number {
  if (outcome === "home") {
    return prediction.pHome;
  }

  if (outcome === "draw") {
    return prediction.pDraw;
  }

  return prediction.pAway;
}

function computeOutcomeCalibration(
  records: readonly EvaluationHistoryRecord[],
): readonly OutcomeCalibrationRow[] {
  const rows: OutcomeCalibrationRow[] = [];

  for (const outcome of MATCH_OUTCOME_LABELS) {
    const accumulators = emptyAccumulators();

    for (const record of records) {
      const metrics = record.evaluation.metrics;

      if (metrics === undefined) {
        continue;
      }

      const predictedProbability = probabilityForOutcome(
        record.predictionSnapshot,
        outcome,
      );
      const accumulator = accumulators[probabilityBucketIndex(predictedProbability)];

      if (accumulator === undefined) {
        continue;
      }

      accumulator.sampleSize += 1;
      accumulator.probabilitySum += predictedProbability;

      if (record.actualResult.winner === outcome) {
        accumulator.hits += 1;
      }
    }

    for (const row of toProbabilityBucketRows(accumulators)) {
      rows.push(Object.freeze({ ...row, outcome }));
    }
  }

  return Object.freeze(rows);
}

function computeGoalRangeCalibration(
  records: readonly EvaluationHistoryRecord[],
): readonly GoalRangeCalibrationRow[] {
  const byBucket = new Map<GoalRangeBucket, { sampleSize: number; hits: number }>();

  for (const bucket of GOAL_RANGE_BUCKETS) {
    byBucket.set(bucket, { sampleSize: 0, hits: 0 });
  }

  for (const record of records) {
    const metrics = record.evaluation.metrics;

    if (metrics === undefined) {
      continue;
    }

    const bucket = byBucket.get(metrics.predictedGoalRange);

    if (bucket === undefined) {
      continue;
    }

    bucket.sampleSize += 1;

    if (metrics.goalRangeHit) {
      bucket.hits += 1;
    }
  }

  return Object.freeze(
    GOAL_RANGE_BUCKETS.map((bucket) => {
      const accumulator = byBucket.get(bucket);
      const sampleSize = accumulator?.sampleSize ?? 0;
      const hits = accumulator?.hits ?? 0;

      return Object.freeze({
        bucket,
        sampleSize,
        hits,
        accuracy: sampleSize === 0 ? undefined : roundRatio(hits / sampleSize),
        qualified: sampleSize >= MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE,
      });
    }),
  );
}

function computeProvenance(
  records: readonly EvaluationHistoryRecord[],
): PredictionCalibrationProvenance {
  let earliestMatchDate: string | undefined;
  let latestMatchDate: string | undefined;

  for (const record of records) {
    if (earliestMatchDate === undefined || record.matchDate < earliestMatchDate) {
      earliestMatchDate = record.matchDate;
    }

    if (latestMatchDate === undefined || record.matchDate > latestMatchDate) {
      latestMatchDate = record.matchDate;
    }
  }

  return Object.freeze({
    sourceRecordCount: records.length,
    evaluationHistorySchemaVersions: sortedUnique(
      records.map((record) => record.schemaVersion),
    ),
    evaluationModelVersions: sortedUnique(
      records.map((record) => record.evaluationModelVersion),
    ),
    projectionModelVersions: sortedUnique(
      records.map((record) => record.projectionModelVersion),
    ),
    earliestMatchDate,
    latestMatchDate,
  });
}

function buildLimitations(
  sampleSize: number,
  qualified: boolean,
  hasUnqualifiedBucket: boolean,
): readonly string[] {
  const limitations: string[] = [
    "Computed only from Evaluation History (A1.5); missing history is never estimated or fabricated.",
    "Calibration measurement is descriptive only — it does not modify sealed Prediction, Feature, Rule, Projection, or Confidence outputs.",
  ];

  if (!qualified) {
    limitations.push(
      `Overall sample size (${sampleSize}) is below the minimum qualified threshold (${MINIMUM_QUALIFIED_REPORT_SAMPLE_SIZE}); report metrics are directional only.`,
    );
  }

  if (hasUnqualifiedBucket) {
    limitations.push(
      `Buckets/rows with fewer than ${MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE} observations are marked unqualified and should not be treated as reliable.`,
    );
  }

  return Object.freeze(limitations);
}

/**
 * A2 Prediction Calibration: pure, deterministic measurement of historical
 * prediction reliability from Evaluation History rows only.
 */
export function computePredictionCalibrationReport(
  input: ComputePredictionCalibrationReportInput,
): PredictionCalibrationReport {
  const computedAt = requireTimestamp(input.computedAt);
  const records = input.records;
  const sampleSize = records.length;
  const qualified = sampleSize >= MINIMUM_QUALIFIED_REPORT_SAMPLE_SIZE;

  const { confidenceBucketAccuracy, confidenceDistribution } =
    computeConfidenceSections(records);
  const reliabilityTable = computeReliabilityTable(records);
  const outcomeCalibration = computeOutcomeCalibration(records);
  const goalRangeCalibration = computeGoalRangeCalibration(records);

  const hasUnqualifiedBucket = [
    ...confidenceBucketAccuracy,
    ...reliabilityTable,
    ...outcomeCalibration,
    ...goalRangeCalibration,
  ].some((row) => row.sampleSize > 0 && !row.qualified);

  return Object.freeze({
    schemaVersion: PREDICTION_CALIBRATION_REPORT_MODEL_VERSION,
    computedAt,
    sampleSize,
    qualified,
    minimumQualifiedSampleSize: MINIMUM_QUALIFIED_REPORT_SAMPLE_SIZE,
    provenance: computeProvenance(records),
    confidenceBucketAccuracy,
    confidenceDistribution,
    reliabilityTable,
    expectedCalibrationError: computeExpectedCalibrationError(reliabilityTable),
    brierScore: computeBrierScore(records),
    outcomeCalibration,
    goalRangeCalibration,
    limitations: buildLimitations(sampleSize, qualified, hasUnqualifiedBucket),
  });
}
