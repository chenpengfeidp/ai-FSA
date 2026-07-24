import type { CalibrationErrorMetric } from "./prediction-calibration-report.js";
import type { ValidationMetricSummary } from "./validation-report.js";

/**
 * O1 Football Intelligence Contribution Analysis — measurement-only report.
 * Computed exclusively from Evaluation History (A1.5), reusing Evaluation
 * (A1) and Prediction Calibration (A2) metrics. Never estimates missing
 * history, never re-runs prediction, and never mutates sealed
 * Prediction/Feature/Rule/Projection/Confidence/Evaluation/Calibration.
 */
export const CONTRIBUTION_REPORT_MODEL_VERSION = "contribution-report.mvp.o1";

/** A domain row is directional-only below this many observations that had the domain's Features present. */
export const MINIMUM_QUALIFIED_DOMAIN_SAMPLE_SIZE = 20;

/** A within-domain segment (e.g. the actual-draw sub-segment for Draw Accuracy) below this many observations is flagged insufficient. */
export const MINIMUM_QUALIFIED_DOMAIN_SEGMENT_SAMPLE_SIZE = 5;

/**
 * The eight Football Intelligence domains named by the O1 task brief, in
 * canonical, fixed display order. This order is never re-sorted by measured
 * performance — the report computes no ranking of any kind.
 */
export type IntelligenceDomainId =
  | "venue_intelligence"
  | "availability_intelligence"
  | "advanced_statistics"
  | "expected_goals"
  | "match_context"
  | "club_intelligence"
  | "player_intelligence"
  | "market_intelligence";

export const INTELLIGENCE_DOMAIN_IDS: readonly IntelligenceDomainId[] =
  Object.freeze([
    "venue_intelligence",
    "availability_intelligence",
    "advanced_statistics",
    "expected_goals",
    "match_context",
    "club_intelligence",
    "player_intelligence",
    "market_intelligence",
  ]);

export const INTELLIGENCE_DOMAIN_LABELS: Readonly<
  Record<IntelligenceDomainId, string>
> = Object.freeze({
  venue_intelligence: "Venue Intelligence",
  availability_intelligence: "Availability Intelligence",
  advanced_statistics: "Advanced Statistics",
  expected_goals: "Expected Goals",
  match_context: "Match Context",
  club_intelligence: "Club Intelligence",
  player_intelligence: "Player Intelligence",
  market_intelligence: "Market Intelligence",
});

/**
 * One domain's measured contribution row. `sampleSize` is the count of
 * sealed Evaluation History rows whose predictionSnapshot actually carried
 * at least one of that domain's Feature names — an observational subset,
 * never a re-run of prediction under an alternate configuration.
 *
 * `coverage` reports how much of the *entire* sealed population had this
 * domain's Features present at all (sampleSize / totalSampleSize) — i.e.
 * how often this domain's Evidence/Features were actually available, which
 * is distinct from V1A's per-record Feature-completeness "Coverage" metric.
 */
export interface DomainContributionRow {
  readonly domain: IntelligenceDomainId;
  readonly label: string;
  readonly sampleSize: number;
  readonly qualified: boolean;
  readonly coverage: ValidationMetricSummary;
  readonly winnerAccuracy: ValidationMetricSummary;
  readonly drawAccuracy: ValidationMetricSummary;
  readonly scoreAccuracy: ValidationMetricSummary;
  readonly goalRangeAccuracy: ValidationMetricSummary;
  readonly expectedCalibrationError: CalibrationErrorMetric;
  readonly brierScore: CalibrationErrorMetric;
  readonly paperReturn: ValidationMetricSummary;
}

export interface ContributionProvenance {
  readonly sourceRecordCount: number;
  readonly evaluationHistorySchemaVersions: readonly string[];
  readonly evaluationModelVersions: readonly string[];
  readonly projectionModelVersions: readonly string[];
  readonly earliestMatchDate: string | undefined;
  readonly latestMatchDate: string | undefined;
}

/**
 * Deterministic, read-only measurement of each Football Intelligence
 * domain's observed historical contribution over Evaluation History.
 * Display-only: never feeds back into Feature/Rule/Projection/Confidence/
 * Evaluation/Calibration and never adjusts any sealed or future Prediction.
 * Domains are independent, non-exclusive presence checks (a record may
 * count toward several domains at once) — this is not a partition like
 * V1A's Feature-configuration profiles. The report never ranks domains and
 * never claims causation; it reports only measured historical statistics.
 */
export interface ContributionReport {
  readonly schemaVersion: typeof CONTRIBUTION_REPORT_MODEL_VERSION;
  readonly computedAt: string;
  readonly totalSampleSize: number;
  readonly minimumQualifiedSampleSize: number;
  readonly provenance: ContributionProvenance;
  readonly domains: readonly DomainContributionRow[];
  readonly limitations: readonly string[];
}

export class ContributionReportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContributionReportValidationError";
  }
}
