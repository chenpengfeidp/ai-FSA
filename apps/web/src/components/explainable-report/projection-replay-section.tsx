import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type {
  ProjectionReplayMetricSummaryDto,
  ProjectionReplayReportDto,
} from "../../types/analysis";
import { WorkspaceSection } from "./workspace-section";

function formatPercent(value: number | undefined): string {
  return value === undefined ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatDelta(value: number | undefined): string {
  if (value === undefined) {
    return "—";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${(value * 100).toFixed(1)}%`;
}

function InsufficientBadge({
  qualified,
}: Readonly<{ qualified: boolean }>): ReactElement | null {
  if (qualified) {
    return null;
  }

  return (
    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
      {zh.report.projectionReplayInsufficientBadge}
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

export function ProjectionReplaySection({
  projectionReplay,
}: Readonly<{
  projectionReplay: ProjectionReplayReportDto | undefined;
}>): ReactElement {
  return (
    <WorkspaceSection id="projection-replay">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            {zh.report.projectionReplay}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            {zh.report.projectionReplayHint}
          </p>
        </div>

        {projectionReplay === undefined ? (
          <p className="text-sm text-zinc-500">
            {zh.report.projectionReplayUnavailable}
          </p>
        ) : (
          <>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">
                  {zh.report.projectionReplaySampleSize}
                </dt>
                <dd className="font-medium">
                  {projectionReplay.summary.populationSampleSize}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">
                  {zh.report.projectionReplayV2Coverage}
                </dt>
                <dd>
                  <MetricCell metric={projectionReplay.summary.v2ReplayCoverage} />
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                {zh.report.projectionReplayVersionComparison}
              </h3>
              <div className="overflow-x-auto rounded-lg border border-zinc-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-zinc-600">
                    <tr>
                      <th className="px-3 py-2">
                        {zh.report.projectionReplayMetric}
                      </th>
                      <th className="px-3 py-2">V1</th>
                      <th className="px-3 py-2">V2</th>
                      <th className="px-3 py-2">
                        {zh.report.projectionReplayImprovement}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        label: zh.report.projectionReplayWinner,
                        v1: projectionReplay.versionComparison.v1.winnerAccuracy,
                        v2: projectionReplay.versionComparison.v2.winnerAccuracy,
                        delta:
                          projectionReplay.versionComparison.improvement
                            .winnerAccuracyDelta,
                      },
                      {
                        label: zh.report.projectionReplayDraw,
                        v1: projectionReplay.versionComparison.v1.drawAccuracy,
                        v2: projectionReplay.versionComparison.v2.drawAccuracy,
                        delta:
                          projectionReplay.versionComparison.improvement
                            .drawAccuracyDelta,
                      },
                      {
                        label: zh.report.projectionReplayScore,
                        v1: projectionReplay.versionComparison.v1.scoreAccuracy,
                        v2: projectionReplay.versionComparison.v2.scoreAccuracy,
                        delta:
                          projectionReplay.versionComparison.improvement
                            .scoreAccuracyDelta,
                      },
                      {
                        label: zh.report.projectionReplayGoalRange,
                        v1: projectionReplay.versionComparison.v1.goalRangeAccuracy,
                        v2: projectionReplay.versionComparison.v2.goalRangeAccuracy,
                        delta:
                          projectionReplay.versionComparison.improvement
                            .goalRangeAccuracyDelta,
                      },
                      {
                        label: zh.report.projectionReplayBtts,
                        v1: projectionReplay.versionComparison.v1.bttsAccuracy,
                        v2: projectionReplay.versionComparison.v2.bttsAccuracy,
                        delta:
                          projectionReplay.versionComparison.improvement
                            .bttsAccuracyDelta,
                      },
                      {
                        label: zh.report.projectionReplayOverUnder,
                        v1: projectionReplay.versionComparison.v1.overUnderAccuracy,
                        v2: projectionReplay.versionComparison.v2.overUnderAccuracy,
                        delta:
                          projectionReplay.versionComparison.improvement
                            .overUnderAccuracyDelta,
                      },
                    ].map((row) => (
                      <tr key={row.label} className="border-t border-zinc-100">
                        <td className="px-3 py-2 font-medium">{row.label}</td>
                        <td className="px-3 py-2">
                          <MetricCell metric={row.v1} />
                        </td>
                        <td className="px-3 py-2">
                          <MetricCell metric={row.v2} />
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {formatDelta(row.delta)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {projectionReplay.scriptContributions.length === 0 ? null : (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                  {zh.report.projectionReplayScriptStats}
                </h3>
                <div className="overflow-x-auto rounded-lg border border-zinc-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-zinc-600">
                      <tr>
                        <th className="px-3 py-2">
                          {zh.report.projectionReplayScript}
                        </th>
                        <th className="px-3 py-2">
                          {zh.report.projectionReplayActivationFrequency}
                        </th>
                        <th className="px-3 py-2">
                          {zh.report.projectionReplayAverageWeight}
                        </th>
                        <th className="px-3 py-2">
                          {zh.report.projectionReplayAverageConfidence}
                        </th>
                        <th className="px-3 py-2">
                          {zh.report.projectionReplayWinner}
                        </th>
                        <th className="px-3 py-2">
                          {zh.report.projectionReplayGoalRange}
                        </th>
                        <th className="px-3 py-2">
                          {zh.report.projectionReplayScore}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectionReplay.scriptContributions.map((script) => (
                        <tr
                          key={script.scriptId}
                          className="border-t border-zinc-100"
                        >
                          <td className="px-3 py-2 font-medium">{script.label}</td>
                          <td className="px-3 py-2">
                            {formatPercent(script.activationFrequency)} (
                            {script.activationCount})
                          </td>
                          <td className="px-3 py-2">
                            {formatPercent(script.averageWeight)}
                          </td>
                          <td className="px-3 py-2">
                            {script.averageConfidence.toFixed(1)}
                          </td>
                          <td className="px-3 py-2">
                            <MetricCell metric={script.winnerAccuracy} />
                          </td>
                          <td className="px-3 py-2">
                            <MetricCell metric={script.goalRangeAccuracy} />
                          </td>
                          <td className="px-3 py-2">
                            <MetricCell metric={script.scoreAccuracy} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {projectionReplay.footballStateContributions.length === 0 ? null : (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                  {zh.report.projectionReplayFootballStateStats}
                </h3>
                <div className="overflow-x-auto rounded-lg border border-zinc-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-zinc-600">
                      <tr>
                        <th className="px-3 py-2">
                          {zh.report.projectionReplayFootballStateDimension}
                        </th>
                        <th className="px-3 py-2">
                          {zh.report.projectionReplayFootballStateLevel}
                        </th>
                        <th className="px-3 py-2">
                          {zh.report.projectionReplaySampleSize}
                        </th>
                        <th className="px-3 py-2">
                          {zh.report.projectionReplayWinner}
                        </th>
                        <th className="px-3 py-2">
                          {zh.report.projectionReplayGoalRange}
                        </th>
                        <th className="px-3 py-2">
                          {zh.report.projectionReplayScore}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectionReplay.footballStateContributions.map((row) => (
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
                            <MetricCell metric={row.winnerAccuracy} />
                          </td>
                          <td className="px-3 py-2">
                            <MetricCell metric={row.goalRangeAccuracy} />
                          </td>
                          <td className="px-3 py-2">
                            <MetricCell metric={row.scoreAccuracy} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {projectionReplay.limitations.length === 0 ? null : (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                  {zh.report.projectionReplayLimitations}
                </h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600">
                  {projectionReplay.limitations.map((limitation) => (
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
