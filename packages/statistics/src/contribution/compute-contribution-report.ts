import {
  CONTRIBUTION_REPORT_MODEL_VERSION,
  ContributionReportValidationError,
  INTELLIGENCE_DOMAIN_IDS,
  INTELLIGENCE_DOMAIN_LABELS,
  MINIMUM_QUALIFIED_DOMAIN_SAMPLE_SIZE,
  MINIMUM_QUALIFIED_DOMAIN_SEGMENT_SAMPLE_SIZE,
  type ContributionProvenance,
  type ContributionReport,
  type DomainContributionRow,
  type IntelligenceDomainId,
} from "../domain/contribution-report.js";
import type { EvaluationHistoryRecord } from "../domain/evaluation-history.js";
import type { ValidationMetricSummary } from "../domain/validation-report.js";
import { computePredictionCalibrationReport } from "../reliability/compute-prediction-calibration-report.js";
import { hasDomainFeatures } from "./domain-feature-families.js";

export interface ComputeContributionReportInput {
  readonly records: readonly EvaluationHistoryRecord[];
  readonly computedAt: string;
}

const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function requireTimestamp(value: string): string {
  if (!isoTimestampPattern.test(value) || Number.isNaN(Date.parse(value))) {
    throw new ContributionReportValidationError(
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

/**
 * Domain population-coverage metric: what fraction of the *entire* sealed
 * population had this domain's Features present at all. `sampleSize` is
 * the domain subset size (consistent with every other metric on the row),
 * not the total population denominator.
 */
function coverageMetric(
  domainSampleSize: number,
  totalSampleSize: number,
  minimumQualified: number,
): ValidationMetricSummary {
  return Object.freeze({
    value:
      totalSampleSize === 0
        ? undefined
        : roundRatio(domainSampleSize / totalSampleSize),
    sampleSize: domainSampleSize,
    qualified: domainSampleSize >= minimumQualified,
  });
}

function groupByDomain(
  records: readonly EvaluationHistoryRecord[],
): ReadonlyMap<IntelligenceDomainId, readonly EvaluationHistoryRecord[]> {
  const groups = new Map<IntelligenceDomainId, EvaluationHistoryRecord[]>();

  for (const domain of INTELLIGENCE_DOMAIN_IDS) {
    groups.set(domain, []);
  }

  for (const record of records) {
    const featureNames = record.predictionSnapshot.featureNames;

    for (const domain of INTELLIGENCE_DOMAIN_IDS) {
      if (hasDomainFeatures(featureNames, domain)) {
        groups.get(domain)?.push(record);
      }
    }
  }

  return groups;
}

function computeDomainRow(
  domain: IntelligenceDomainId,
  domainRecords: readonly EvaluationHistoryRecord[],
  totalSampleSize: number,
  computedAt: string,
): DomainContributionRow {
  const sampleSize = domainRecords.length;
  let winnerHits = 0;
  let scoreHits = 0;
  let goalRangeHits = 0;
  let drawSampleSize = 0;
  let drawHits = 0;
  let paperReturnSum = 0;

  for (const record of domainRecords) {
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

    paperReturnSum += metrics.paperUnitReturn;
  }

  const calibration = computePredictionCalibrationReport({
    records: domainRecords,
    computedAt,
  });

  return Object.freeze({
    domain,
    label: INTELLIGENCE_DOMAIN_LABELS[domain],
    sampleSize,
    qualified: sampleSize >= MINIMUM_QUALIFIED_DOMAIN_SAMPLE_SIZE,
    coverage: coverageMetric(
      sampleSize,
      totalSampleSize,
      MINIMUM_QUALIFIED_DOMAIN_SAMPLE_SIZE,
    ),
    winnerAccuracy: ratioMetric(
      winnerHits,
      sampleSize,
      MINIMUM_QUALIFIED_DOMAIN_SAMPLE_SIZE,
    ),
    drawAccuracy: ratioMetric(
      drawHits,
      drawSampleSize,
      MINIMUM_QUALIFIED_DOMAIN_SEGMENT_SAMPLE_SIZE,
    ),
    scoreAccuracy: ratioMetric(
      scoreHits,
      sampleSize,
      MINIMUM_QUALIFIED_DOMAIN_SAMPLE_SIZE,
    ),
    goalRangeAccuracy: ratioMetric(
      goalRangeHits,
      sampleSize,
      MINIMUM_QUALIFIED_DOMAIN_SAMPLE_SIZE,
    ),
    expectedCalibrationError: calibration.expectedCalibrationError,
    brierScore: calibration.brierScore,
    paperReturn: meanMetric(
      paperReturnSum,
      sampleSize,
      MINIMUM_QUALIFIED_DOMAIN_SAMPLE_SIZE,
    ),
  });
}

function computeProvenance(
  records: readonly EvaluationHistoryRecord[],
): ContributionProvenance {
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
  hasUnqualifiedDomain: boolean,
): readonly string[] {
  const limitations: string[] = [
    "Computed only from Evaluation History (A1.5); missing history is never estimated or fabricated.",
    "Domains are independent, non-exclusive observational presence checks over already-sealed predictions' recorded Feature names — never a counterfactual re-run of Provider, Feature, Rule, Projection, Confidence, Evaluation, or Calibration. A single sealed prediction may count toward several domains at once.",
    "Coverage measures how often each domain's Features were present across the full sealed population, not per-record Feature completeness.",
    "This report never claims causation and never ranks domains — it reports only measured historical statistics in a fixed canonical order; read qualified flags and sample sizes before drawing any conclusion.",
    "Paper ROI is a flat +1/−1 research metric per record, display-only, and is never wagering advice.",
  ];

  if (totalSampleSize === 0) {
    limitations.push("No scored Evaluation History rows are available yet.");
  }

  if (hasUnqualifiedDomain) {
    limitations.push(
      `Domains/segments with fewer than ${MINIMUM_QUALIFIED_DOMAIN_SAMPLE_SIZE} (or ${MINIMUM_QUALIFIED_DOMAIN_SEGMENT_SAMPLE_SIZE} for Draw Accuracy) observations are marked unqualified and are directional only.`,
    );
  }

  return Object.freeze(limitations);
}

/**
 * O1 Football Intelligence Contribution Analysis: deterministic measurement
 * of each Football Intelligence domain's observed historical contribution,
 * reusing Evaluation (A1) and Prediction Calibration (A2) metrics over the
 * same sealed Evaluation History population already measured by V1A
 * Validation. Never modifies Provider, Feature, Rule, Projection,
 * Confidence, Evaluation, or Calibration; never regenerates predictions;
 * never introduces machine learning; never ranks domains or claims
 * causation.
 */
export function computeContributionReport(
  input: ComputeContributionReportInput,
): ContributionReport {
  const computedAt = requireTimestamp(input.computedAt);
  const records = input.records;
  const totalSampleSize = records.length;
  const groups = groupByDomain(records);

  const domains = INTELLIGENCE_DOMAIN_IDS.map((domain) =>
    computeDomainRow(domain, groups.get(domain) ?? [], totalSampleSize, computedAt),
  );

  const hasUnqualifiedDomain = domains.some(
    (row) => row.sampleSize > 0 && !row.qualified,
  );

  return Object.freeze({
    schemaVersion: CONTRIBUTION_REPORT_MODEL_VERSION,
    computedAt,
    totalSampleSize,
    minimumQualifiedSampleSize: MINIMUM_QUALIFIED_DOMAIN_SAMPLE_SIZE,
    provenance: computeProvenance(records),
    domains: Object.freeze(domains),
    limitations: buildLimitations(totalSampleSize, hasUnqualifiedDomain),
  });
}
