import type { EvaluationHistoryRecord } from "../domain/evaluation-history.js";
import {
  FEATURE_PROFILE_IDS,
  FEATURE_PROFILE_LABELS,
  MINIMUM_QUALIFIED_PROFILE_SAMPLE_SIZE,
  MINIMUM_QUALIFIED_SEGMENT_SAMPLE_SIZE,
  VALIDATION_REPORT_MODEL_VERSION,
  ValidationReportValidationError,
  type FeatureProfileId,
  type ValidationMetricSummary,
  type ValidationProfileRow,
  type ValidationProvenance,
  type ValidationReport,
} from "../domain/validation-report.js";
import { computePredictionCalibrationReport } from "../reliability/compute-prediction-calibration-report.js";
import { classifyFeatureProfile } from "./feature-profile.js";

export interface ComputeValidationReportInput {
  readonly records: readonly EvaluationHistoryRecord[];
  readonly computedAt: string;
}

const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function requireTimestamp(value: string): string {
  if (!isoTimestampPattern.test(value) || Number.isNaN(Date.parse(value))) {
    throw new ValidationReportValidationError(
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

function ratioMetric(
  hits: number,
  sampleSize: number,
  minimumQualified: number,
): ValidationMetricSummary {
  return Object.freeze({
    value: sampleSize === 0 ? undefined : roundRatio(hits / sampleSize),
    sampleSize,
    qualified: sampleSize >= minimumQualified,
  });
}

function meanMetric(
  sum: number,
  sampleSize: number,
  minimumQualified: number,
): ValidationMetricSummary {
  return Object.freeze({
    value: sampleSize === 0 ? undefined : roundRatio(sum / sampleSize),
    sampleSize,
    qualified: sampleSize >= minimumQualified,
  });
}

function groupByProfile(
  records: readonly EvaluationHistoryRecord[],
): ReadonlyMap<FeatureProfileId, readonly EvaluationHistoryRecord[]> {
  const groups = new Map<FeatureProfileId, EvaluationHistoryRecord[]>();

  for (const profile of FEATURE_PROFILE_IDS) {
    groups.set(profile, []);
  }

  for (const record of records) {
    const profile = classifyFeatureProfile(record.predictionSnapshot.featureNames);
    groups.get(profile)?.push(record);
  }

  return groups;
}

function computeProfileRow(
  profile: FeatureProfileId,
  records: readonly EvaluationHistoryRecord[],
  computedAt: string,
): ValidationProfileRow {
  const sampleSize = records.length;
  let winnerHits = 0;
  let scoreHits = 0;
  let goalRangeHits = 0;
  let drawSampleSize = 0;
  let drawHits = 0;
  let coverageSum = 0;
  let paperReturnSum = 0;

  for (const record of records) {
    const metrics = record.evaluation.metrics;

    if (metrics === undefined) {
      continue;
    }

    if (metrics.winnerHit) {
      winnerHits += 1;
    }

    if (metrics.scoreHit) {
      scoreHits += 1;
    }

    if (metrics.goalRangeHit) {
      goalRangeHits += 1;
    }

    if (record.actualResult.winner === "draw") {
      drawSampleSize += 1;

      if (metrics.winnerHit) {
        drawHits += 1;
      }
    }

    coverageSum += metrics.featureCoverage.coverageRatio;
    paperReturnSum += metrics.paperUnitReturn;
  }

  return Object.freeze({
    profile,
    label: FEATURE_PROFILE_LABELS[profile],
    sampleSize,
    qualified: sampleSize >= MINIMUM_QUALIFIED_PROFILE_SAMPLE_SIZE,
    winnerAccuracy: ratioMetric(
      winnerHits,
      sampleSize,
      MINIMUM_QUALIFIED_PROFILE_SAMPLE_SIZE,
    ),
    drawAccuracy: ratioMetric(
      drawHits,
      drawSampleSize,
      MINIMUM_QUALIFIED_SEGMENT_SAMPLE_SIZE,
    ),
    scoreAccuracy: ratioMetric(
      scoreHits,
      sampleSize,
      MINIMUM_QUALIFIED_PROFILE_SAMPLE_SIZE,
    ),
    goalRangeAccuracy: ratioMetric(
      goalRangeHits,
      sampleSize,
      MINIMUM_QUALIFIED_PROFILE_SAMPLE_SIZE,
    ),
    coverage: meanMetric(
      coverageSum,
      sampleSize,
      MINIMUM_QUALIFIED_PROFILE_SAMPLE_SIZE,
    ),
    paperReturn: meanMetric(
      paperReturnSum,
      sampleSize,
      MINIMUM_QUALIFIED_PROFILE_SAMPLE_SIZE,
    ),
    calibration: computePredictionCalibrationReport({ records, computedAt }),
  });
}

function computeProvenance(
  records: readonly EvaluationHistoryRecord[],
): ValidationProvenance {
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
  totalSampleSize: number,
  hasUnqualifiedProfile: boolean,
): readonly string[] {
  const limitations: string[] = [
    "Computed only from Evaluation History (A1.5); missing history is never estimated or fabricated.",
    "Profiles are observational partitions of already-sealed predictions by which Feature families were actually present at seal time — never a counterfactual re-run of Provider, Feature, Rule, Projection, Confidence, or Calibration.",
    "Every profile is evaluated against the same sealed historical predictions; no prediction is regenerated for this comparison.",
    "This report never claims one profile improved over another — read qualified flags and sample sizes before drawing any conclusion.",
    "Paper ROI is a flat +1/−1 research metric per record, display-only, and is never wagering advice.",
  ];

  if (totalSampleSize === 0) {
    limitations.push("No scored Evaluation History rows are available yet.");
  }

  if (hasUnqualifiedProfile) {
    limitations.push(
      `Profiles/segments with fewer than ${MINIMUM_QUALIFIED_PROFILE_SAMPLE_SIZE} (or ${MINIMUM_QUALIFIED_SEGMENT_SAMPLE_SIZE} for Draw Accuracy) observations are marked unqualified and are directional only.`,
    );
  }

  return Object.freeze(limitations);
}

/**
 * V1A Football Intelligence Validation: deterministic comparison of
 * prediction quality across Feature-configuration profiles, reusing
 * Evaluation (A1) and Prediction Calibration (A2) metrics over the same
 * sealed Evaluation History population. Never modifies Provider, Feature,
 * Rule, Projection, Confidence, Evaluation, or Calibration; never
 * introduces machine learning.
 */
export function computeValidationReport(
  input: ComputeValidationReportInput,
): ValidationReport {
  const computedAt = requireTimestamp(input.computedAt);
  const records = input.records;
  const groups = groupByProfile(records);

  const profiles = FEATURE_PROFILE_IDS.map((profile) =>
    computeProfileRow(profile, groups.get(profile) ?? [], computedAt),
  );

  const hasUnqualifiedProfile = profiles.some(
    (row) => row.sampleSize > 0 && !row.qualified,
  );

  return Object.freeze({
    schemaVersion: VALIDATION_REPORT_MODEL_VERSION,
    computedAt,
    totalSampleSize: records.length,
    minimumQualifiedSampleSize: MINIMUM_QUALIFIED_PROFILE_SAMPLE_SIZE,
    provenance: computeProvenance(records),
    profiles: Object.freeze(profiles),
    limitations: buildLimitations(records.length, hasUnqualifiedProfile),
  });
}
