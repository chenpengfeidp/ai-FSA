import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type {
  ConfidenceBandLabel,
  GoalRangeBucketLabel,
  MatchOutcomeLabel,
  PredictionCalibrationReportDto,
} from "../../types/analysis";
import { WorkspaceSection } from "./workspace-section";

function formatPercent(value: number | undefined): string {
  return value === undefined ? "—" : `${(value * 100).toFixed(1)}%`;
}

function confidenceBandLabel(band: ConfidenceBandLabel): string {
  if (band === "very_high") {
    return "very_high";
  }

  return band;
}

function outcomeLabel(outcome: MatchOutcomeLabel): string {
  if (outcome === "home") {
    return zh.report.calibrationOutcomeHome;
  }

  if (outcome === "away") {
    return zh.report.calibrationOutcomeAway;
  }

  return zh.report.calibrationOutcomeDraw;
}

function goalRangeLabel(bucket: GoalRangeBucketLabel): string {
  return zh.report.calibrationGoalRangeLabel[bucket];
}

function QualifiedBadge({
  qualified,
}: Readonly<{ qualified: boolean }>): ReactElement | null {
  if (qualified) {
    return null;
  }

  return (
    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
      {zh.report.calibrationInsufficientBadge}
    </span>
  );
}

export function CalibrationSection({
  calibration,
}: Readonly<{
  calibration: PredictionCalibrationReportDto | undefined;
}>): ReactElement {
  return (
    <WorkspaceSection id="calibration">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            {zh.report.calibration}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{zh.report.calibrationHint}</p>
        </div>

        {calibration === undefined ? (
          <p className="text-sm text-zinc-500">{zh.report.calibrationUnavailable}</p>
        ) : (
          <>
            <dl className="grid gap-2 text-sm text-zinc-800 sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">{zh.report.calibrationSampleSize}</dt>
                <dd className="font-medium">
                  {calibration.sampleSize}
                  <QualifiedBadge qualified={calibration.qualified} />
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">
                  {zh.report.calibrationMinimumSample(
                    calibration.minimumQualifiedSampleSize,
                  )}
                </dt>
                <dd className="font-medium">
                  {calibration.qualified
                    ? zh.report.calibrationQualified
                    : zh.report.calibrationUnqualified}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">
                  {zh.report.calibrationSourceRecordCount}
                </dt>
                <dd className="font-medium">
                  {calibration.provenance.sourceRecordCount}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{zh.report.calibrationDateRange}</dt>
                <dd className="font-medium">
                  {calibration.provenance.earliestMatchDate ?? "—"}
                  {" → "}
                  {calibration.provenance.latestMatchDate ?? "—"}
                </dd>
              </div>
            </dl>

            {calibration.limitations.length === 0 ? null : (
              <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs font-semibold text-zinc-600">
                  {zh.report.calibrationLimitations}
                </p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-xs text-zinc-600">
                  {calibration.limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                {zh.report.calibrationConfidenceBucketAccuracy}
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-zinc-800">
                {calibration.confidenceBucketAccuracy.map((row) => (
                  <li
                    key={row.band}
                    className="flex items-center justify-between border-t border-zinc-100 pt-1 first:border-t-0 first:pt-0"
                  >
                    <span className="text-zinc-600">
                      {confidenceBandLabel(row.band)}
                    </span>
                    <span className="font-medium">
                      {formatPercent(row.accuracy)} · {row.hits}/{row.sampleSize}
                      <QualifiedBadge qualified={row.qualified} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                {zh.report.calibrationConfidenceDistribution}
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-zinc-800">
                {calibration.confidenceDistribution.map((row) => (
                  <li
                    key={row.band}
                    className="flex items-center justify-between border-t border-zinc-100 pt-1 first:border-t-0 first:pt-0"
                  >
                    <span className="text-zinc-600">
                      {confidenceBandLabel(row.band)}
                    </span>
                    <span className="font-medium">
                      {formatPercent(row.share)} ({row.sampleSize})
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                {zh.report.calibrationReliabilityTable}
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-zinc-800">
                {calibration.reliabilityTable
                  .filter((row) => row.sampleSize > 0)
                  .map((row) => (
                    <li
                      key={row.bucketLabel}
                      className="flex items-center justify-between border-t border-zinc-100 pt-1 first:border-t-0 first:pt-0"
                    >
                      <span className="text-zinc-600">{row.bucketLabel}</span>
                      <span className="font-medium">
                        {zh.report.calibrationMeanPredicted}{" "}
                        {formatPercent(row.meanPredictedProbability)} ·{" "}
                        {zh.report.calibrationObservedFrequency}{" "}
                        {formatPercent(row.observedFrequency)} ({row.sampleSize})
                        <QualifiedBadge qualified={row.qualified} />
                      </span>
                    </li>
                  ))}
                {calibration.reliabilityTable.every(
                  (row) => row.sampleSize === 0,
                ) ? (
                  <li className="text-zinc-500">
                    {zh.report.calibrationUnavailable}
                  </li>
                ) : null}
              </ul>
            </div>

            <dl className="grid gap-2 text-sm text-zinc-800 sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">
                  {zh.report.calibrationExpectedCalibrationError}
                </dt>
                <dd className="font-medium">
                  {formatPercent(calibration.expectedCalibrationError.value)}
                  <QualifiedBadge
                    qualified={calibration.expectedCalibrationError.qualified}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{zh.report.calibrationBrierScore}</dt>
                <dd className="font-medium">
                  {calibration.brierScore.value === undefined
                    ? "—"
                    : calibration.brierScore.value.toFixed(4)}
                  <QualifiedBadge qualified={calibration.brierScore.qualified} />
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                {zh.report.calibrationOutcomeCalibration}
              </h3>
              <div className="mt-2 grid gap-4 sm:grid-cols-3">
                {(["home", "draw", "away"] as const).map((outcome) => (
                  <div key={outcome}>
                    <p className="text-xs font-semibold text-zinc-600">
                      {outcomeLabel(outcome)}
                    </p>
                    <ul className="mt-1 space-y-1 text-xs text-zinc-800">
                      {calibration.outcomeCalibration
                        .filter(
                          (row) => row.outcome === outcome && row.sampleSize > 0,
                        )
                        .map((row) => (
                          <li
                            key={`${row.outcome}-${row.bucketLabel}`}
                            className="flex items-center justify-between"
                          >
                            <span className="text-zinc-500">{row.bucketLabel}</span>
                            <span className="font-medium">
                              {formatPercent(row.observedFrequency)} (
                              {row.sampleSize})
                              <QualifiedBadge qualified={row.qualified} />
                            </span>
                          </li>
                        ))}
                      {calibration.outcomeCalibration.every(
                        (row) => row.outcome !== outcome || row.sampleSize === 0,
                      ) ? (
                        <li className="text-zinc-400">—</li>
                      ) : null}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                {zh.report.calibrationGoalRangeCalibration}
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-zinc-800">
                {calibration.goalRangeCalibration.map((row) => (
                  <li
                    key={row.bucket}
                    className="flex items-center justify-between border-t border-zinc-100 pt-1 first:border-t-0 first:pt-0"
                  >
                    <span className="text-zinc-600">
                      {goalRangeLabel(row.bucket)}
                    </span>
                    <span className="font-medium">
                      {formatPercent(row.accuracy)} · {row.hits}/{row.sampleSize}
                      <QualifiedBadge qualified={row.qualified} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </WorkspaceSection>
  );
}
