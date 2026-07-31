import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type {
  ProjectionDiagnosticsReportDto,
  ProjectionReplayMetricSummaryDto,
} from "../../types/analysis";
import { WorkspaceSection } from "./workspace-section";

function formatPercent(value: number | undefined): string {
  return value === undefined ? "—" : `${(value * 100).toFixed(1)}%`;
}

function InsufficientBadge({
  qualified,
}: Readonly<{ qualified: boolean }>): ReactElement | null {
  if (qualified) {
    return null;
  }

  return (
    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
      {zh.report.projectionDiagnosticsInsufficientBadge}
    </span>
  );
}

function MetricCell({
  metric,
}: Readonly<{ metric: ProjectionReplayMetricSummaryDto }>): ReactElement {
  return (
    <span className="font-medium">
      {formatPercent(metric.value)} ({metric.sampleSize})
      <InsufficientBadge qualified={metric.qualified} />
    </span>
  );
}

export function ProjectionDiagnosticsSection({
  projectionDiagnostics,
}: Readonly<{
  projectionDiagnostics: ProjectionDiagnosticsReportDto | undefined;
}>): ReactElement {
  return (
    <WorkspaceSection id="projection-diagnostics">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            {zh.report.projectionDiagnostics}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            {zh.report.projectionDiagnosticsHint}
          </p>
        </div>

        {projectionDiagnostics === undefined ? (
          <p className="text-sm text-zinc-500">
            {zh.report.projectionDiagnosticsUnavailable}
          </p>
        ) : (
          <>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">
                  {zh.report.projectionDiagnosticsSampleSize}
                </dt>
                <dd className="font-medium">{projectionDiagnostics.sampleSize}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">
                  {zh.report.projectionDiagnosticsHighConfidenceWrong}
                </dt>
                <dd className="font-medium">
                  {projectionDiagnostics.confidenceDiagnostics.highConfidenceWrong}
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                {zh.report.projectionDiagnosticsTopFailures}
              </h3>
              <ul className="space-y-1 text-sm text-zinc-700">
                {projectionDiagnostics.failureDistribution.topFailureReasons.map(
                  (reason) => (
                    <li key={reason.category}>
                      <span className="font-medium">{reason.label}</span>
                      {": "}
                      {reason.count} (
                      <MetricCell metric={reason.rate} />)
                    </li>
                  ),
                )}
              </ul>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                  {zh.report.projectionDiagnosticsWorstScripts}
                </h3>
                <ul className="space-y-1 text-sm text-zinc-700">
                  {projectionDiagnostics.scriptDiagnostics.worstScripts.map(
                    (script) => (
                      <li key={`worst-${script.scriptId}`}>
                        {script.label}: <MetricCell metric={script.accuracy} /> · err{" "}
                        {script.averageScoreError.toFixed(2)}/
                        {script.averageGoalError.toFixed(2)}
                      </li>
                    ),
                  )}
                  {projectionDiagnostics.scriptDiagnostics.worstScripts.length ===
                  0 ? (
                    <li className="text-zinc-500">—</li>
                  ) : null}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                  {zh.report.projectionDiagnosticsBestScripts}
                </h3>
                <ul className="space-y-1 text-sm text-zinc-700">
                  {projectionDiagnostics.scriptDiagnostics.bestScripts.map(
                    (script) => (
                      <li key={`best-${script.scriptId}`}>
                        {script.label}: <MetricCell metric={script.accuracy} /> ·
                        conf {script.averageConfidence.toFixed(1)}
                      </li>
                    ),
                  )}
                  {projectionDiagnostics.scriptDiagnostics.bestScripts.length ===
                  0 ? (
                    <li className="text-zinc-500">—</li>
                  ) : null}
                </ul>
              </div>
            </div>

            {projectionDiagnostics.footballStateDiagnostics.rows.length ===
            0 ? null : (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                  {zh.report.projectionDiagnosticsFootballState}
                </h3>
                <div className="overflow-x-auto rounded-lg border border-zinc-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-zinc-600">
                      <tr>
                        <th className="px-3 py-2">
                          {zh.report.projectionDiagnosticsDimension}
                        </th>
                        <th className="px-3 py-2">
                          {zh.report.projectionDiagnosticsLevel}
                        </th>
                        <th className="px-3 py-2">
                          {zh.report.projectionDiagnosticsSampleSize}
                        </th>
                        <th className="px-3 py-2">
                          {zh.report.projectionDiagnosticsAccuracy}
                        </th>
                        <th className="px-3 py-2">
                          {zh.report.projectionDiagnosticsFalsePositive}
                        </th>
                        <th className="px-3 py-2">
                          {zh.report.projectionDiagnosticsFalseNegative}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectionDiagnostics.footballStateDiagnostics.rows.map(
                        (row) => (
                          <tr
                            key={`${row.dimensionId}:${row.level}`}
                            className="border-t border-zinc-100"
                          >
                            <td className="px-3 py-2 font-medium">
                              {row.dimensionLabel}
                            </td>
                            <td className="px-3 py-2">{row.level}</td>
                            <td className="px-3 py-2">{row.sampleSize}</td>
                            <td className="px-3 py-2">
                              <MetricCell metric={row.accuracy} />
                            </td>
                            <td className="px-3 py-2">{row.falsePositive}</td>
                            <td className="px-3 py-2">{row.falseNegative}</td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                {zh.report.projectionDiagnosticsRuleConflicts}
              </h3>
              <ul className="space-y-1 text-sm text-zinc-700">
                {projectionDiagnostics.ruleDiagnostics.conflictPairs.map((pair) => (
                  <li key={`${pair.homeRule}|${pair.awayRule}`}>
                    {pair.homeRule} × {pair.awayRule}: {pair.coActivationCount} ·
                    incorrect {formatPercent(pair.incorrectRate)}
                  </li>
                ))}
                {projectionDiagnostics.ruleDiagnostics.conflictPairs.length === 0 ? (
                  <li className="text-zinc-500">—</li>
                ) : null}
              </ul>
              <p className="mt-2 text-xs text-zinc-500">
                {zh.report.projectionDiagnosticsRuleSaturation(
                  projectionDiagnostics.ruleDiagnostics.saturation.averagePassRules.toFixed(
                    1,
                  ),
                  projectionDiagnostics.ruleDiagnostics.saturation
                    .saturatedMatchCount,
                )}
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                {zh.report.projectionDiagnosticsConfidence}
              </h3>
              <p className="mb-2 text-sm text-zinc-700">
                {zh.report.projectionDiagnosticsHighConfidenceWrong}:{" "}
                {projectionDiagnostics.confidenceDiagnostics.highConfidenceWrong} (
                <MetricCell
                  metric={
                    projectionDiagnostics.confidenceDiagnostics
                      .highConfidenceWrongRate
                  }
                />
                ){" · "}
                {zh.report.projectionDiagnosticsLowConfidenceCorrect}:{" "}
                {projectionDiagnostics.confidenceDiagnostics.lowConfidenceCorrect} (
                <MetricCell
                  metric={
                    projectionDiagnostics.confidenceDiagnostics
                      .lowConfidenceCorrectRate
                  }
                />
                )
              </p>
              <div className="overflow-x-auto rounded-lg border border-zinc-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-zinc-600">
                    <tr>
                      <th className="px-3 py-2">
                        {zh.report.projectionDiagnosticsBand}
                      </th>
                      <th className="px-3 py-2">
                        {zh.report.projectionDiagnosticsSampleSize}
                      </th>
                      <th className="px-3 py-2">
                        {zh.report.projectionDiagnosticsAccuracy}
                      </th>
                      <th className="px-3 py-2">
                        {zh.report.projectionDiagnosticsIncorrect}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectionDiagnostics.confidenceDiagnostics.calibrationBuckets.map(
                      (bucket) => (
                        <tr key={bucket.band} className="border-t border-zinc-100">
                          <td className="px-3 py-2 font-medium">{bucket.band}</td>
                          <td className="px-3 py-2">{bucket.sampleSize}</td>
                          <td className="px-3 py-2">
                            <MetricCell metric={bucket.accuracy} />
                          </td>
                          <td className="px-3 py-2">{bucket.incorrectCount}</td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {projectionDiagnostics.limitations.length === 0 ? null : (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                  {zh.report.projectionDiagnosticsLimitations}
                </h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600">
                  {projectionDiagnostics.limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </WorkspaceSection>
  );
}
