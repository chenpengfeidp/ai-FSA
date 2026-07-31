import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type { ProjectionParameterCatalogDto } from "../../types/analysis";
import { WorkspaceSection } from "./workspace-section";

export function ProjectionParametersSection({
  projectionParameters,
}: Readonly<{
  projectionParameters: ProjectionParameterCatalogDto | undefined;
}>): ReactElement {
  return (
    <WorkspaceSection id="projection-parameters">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            {zh.report.projectionParameters}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            {zh.report.projectionParametersHint}
          </p>
        </div>

        {projectionParameters === undefined ? (
          <p className="text-sm text-zinc-500">
            {zh.report.projectionParametersUnavailable}
          </p>
        ) : (
          <>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">
                  {zh.report.projectionParametersActiveVersion}
                </dt>
                <dd className="font-medium font-mono text-xs sm:text-sm">
                  {projectionParameters.activeVersionLabel}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">
                  {zh.report.projectionParametersModelVersion}
                </dt>
                <dd className="font-medium font-mono text-xs sm:text-sm">
                  {projectionParameters.modelVersion}
                </dd>
              </div>
            </dl>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-200 text-zinc-500">
                  <tr>
                    <th className="py-2 pr-3 font-medium">
                      {zh.report.projectionParametersVersion}
                    </th>
                    <th className="py-2 pr-3 font-medium">
                      {zh.report.projectionParametersArtifactId}
                    </th>
                    <th className="py-2 pr-3 font-medium">
                      {zh.report.projectionParametersGroups}
                    </th>
                    <th className="py-2 pr-3 font-medium">
                      {zh.report.projectionParametersChecksum}
                    </th>
                    <th className="py-2 font-medium">
                      {zh.report.projectionParametersFlags}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projectionParameters.artifacts.map((artifact) => (
                    <tr
                      key={artifact.artifactId}
                      className="border-b border-zinc-100 align-top"
                    >
                      <td className="py-2 pr-3 font-mono text-xs">
                        {artifact.versionLabel}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {artifact.artifactId}
                      </td>
                      <td className="py-2 pr-3">
                        {artifact.parameterGroups.join(", ")}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs break-all">
                        {artifact.checksum}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          {artifact.isActive ? (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
                              {zh.report.projectionParametersActiveBadge}
                            </span>
                          ) : null}
                          {artifact.usedInAnalysis ? (
                            <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-800">
                              {zh.report.projectionParametersUsedBadge}
                            </span>
                          ) : null}
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700">
                            {artifact.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {projectionParameters.limitations.length === 0 ? null : (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-zinc-800">
                  {zh.report.projectionParametersLimitations}
                </h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600">
                  {projectionParameters.limitations.map((limitation) => (
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
