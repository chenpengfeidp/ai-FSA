import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type {
  FeatureProfileId,
  ValidationMetricSummaryDto,
  ValidationReportDto,
} from "../../types/analysis";
import { WorkspaceSection } from "./workspace-section";

function formatPercent(value: number | undefined): string {
  return value === undefined ? "—" : `${(value * 100).toFixed(1)}%`;
}

function profileLabel(profile: FeatureProfileId): string {
  return zh.report.validationProfileLabel[profile];
}

function InsufficientBadge({
  qualified,
}: Readonly<{ qualified: boolean }>): ReactElement | null {
  if (qualified) {
    return null;
  }

  return (
    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
      {zh.report.validationInsufficientBadge}
    </span>
  );
}

function MetricCell({
  metric,
  formatter = formatPercent,
}: Readonly<{
  metric: ValidationMetricSummaryDto;
  formatter?: (value: number | undefined) => string;
}>): ReactElement {
  return (
    <span className="font-medium">
      {formatter(metric.value)} ({metric.sampleSize})
      <InsufficientBadge qualified={metric.qualified} />
    </span>
  );
}

export function ValidationSection({
  validation,
}: Readonly<{
  validation: ValidationReportDto | undefined;
}>): ReactElement {
  return (
    <WorkspaceSection id="validation">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            {zh.report.validation}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{zh.report.validationHint}</p>
        </div>

        {validation === undefined ? (
          <p className="text-sm text-zinc-500">{zh.report.validationUnavailable}</p>
        ) : (
          <>
            <dl className="grid gap-2 text-sm text-zinc-800 sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">
                  {zh.report.validationTotalSampleSize}
                </dt>
                <dd className="font-medium">{validation.totalSampleSize}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">
                  {zh.report.validationMinimumSample(
                    validation.minimumQualifiedSampleSize,
                  )}
                </dt>
              </div>
            </dl>

            {validation.limitations.length === 0 ? null : (
              <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs font-semibold text-zinc-600">
                  {zh.report.validationLimitations}
                </p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-xs text-zinc-600">
                  {validation.limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-210 table-auto border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="py-2 pr-3 font-medium">
                      {zh.report.validationProfile}
                    </th>
                    <th className="py-2 pr-3 font-medium">
                      {zh.report.validationSampleSize}
                    </th>
                    <th className="py-2 pr-3 font-medium">
                      {zh.report.validationWinnerAccuracy}
                    </th>
                    <th className="py-2 pr-3 font-medium">
                      {zh.report.validationDrawAccuracy}
                    </th>
                    <th className="py-2 pr-3 font-medium">
                      {zh.report.validationScoreAccuracy}
                    </th>
                    <th className="py-2 pr-3 font-medium">
                      {zh.report.validationGoalRangeAccuracy}
                    </th>
                    <th className="py-2 pr-3 font-medium">
                      {zh.report.validationCoverage}
                    </th>
                    <th className="py-2 pr-3 font-medium">
                      {zh.report.validationPaperReturn}
                    </th>
                    <th className="py-2 pr-3 font-medium">
                      {zh.report.validationEce}
                    </th>
                    <th className="py-2 pr-3 font-medium">
                      {zh.report.validationBrier}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {validation.profiles.map((row) => (
                    <tr
                      key={row.profile}
                      className="border-b border-zinc-100 text-zinc-800 last:border-b-0"
                    >
                      <td className="py-2 pr-3 font-medium text-zinc-900">
                        {profileLabel(row.profile)}
                        <InsufficientBadge qualified={row.qualified} />
                      </td>
                      <td className="py-2 pr-3">{row.sampleSize}</td>
                      <td className="py-2 pr-3">
                        <MetricCell metric={row.winnerAccuracy} />
                      </td>
                      <td className="py-2 pr-3">
                        <MetricCell metric={row.drawAccuracy} />
                      </td>
                      <td className="py-2 pr-3">
                        <MetricCell metric={row.scoreAccuracy} />
                      </td>
                      <td className="py-2 pr-3">
                        <MetricCell metric={row.goalRangeAccuracy} />
                      </td>
                      <td className="py-2 pr-3">
                        <MetricCell metric={row.coverage} />
                      </td>
                      <td className="py-2 pr-3">
                        <MetricCell
                          metric={row.paperReturn}
                          formatter={(value) =>
                            value === undefined ? "—" : value.toFixed(2)
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <MetricCell
                          metric={row.calibration.expectedCalibrationError}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <MetricCell
                          metric={row.calibration.brierScore}
                          formatter={(value) =>
                            value === undefined ? "—" : value.toFixed(4)
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </WorkspaceSection>
  );
}
