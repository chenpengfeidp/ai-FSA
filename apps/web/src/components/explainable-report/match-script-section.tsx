import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type { ProjectionFrameworkDto } from "../../types/analysis";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { WorkspaceSection } from "./workspace-section";

function formatWeight(weight: number): string {
  return `${(weight * 100).toFixed(1)}%`;
}

export function MatchScriptSection({
  projectionFramework,
}: Readonly<{
  projectionFramework: ProjectionFrameworkDto | undefined;
}>): ReactElement {
  const scripts = projectionFramework?.activeMatchScripts ?? [];

  return (
    <WorkspaceSection id="match-scripts">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            {zh.report.matchScripts}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{zh.report.matchScriptsHint}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            {zh.report.matchScriptPipeline}
          </p>
        </div>

        {scripts.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {zh.report.matchScriptsUnavailable}
          </p>
        ) : (
          <div className="grid gap-4">
            {scripts.map((script) => (
              <Card key={script.scriptId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {script.label}
                    <span className="ml-2 text-sm font-normal text-zinc-500">
                      {script.scriptId}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-zinc-700">
                  <p>
                    <span className="font-medium">
                      {zh.report.matchScriptWeight}:{" "}
                    </span>
                    {formatWeight(script.weight)}
                  </p>
                  <p>
                    <span className="font-medium">
                      {zh.report.matchScriptLambdas}:{" "}
                    </span>
                    λ_home {script.lambdaHome.toFixed(3)} · λ_away{" "}
                    {script.lambdaAway.toFixed(3)}
                  </p>
                  {script.activationReasons.length > 0 ? (
                    <div>
                      <p className="font-medium">{zh.report.matchScriptReasons}</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {script.activationReasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p>{script.activationReason}</p>
                  )}
                  {script.footballStateRefs.length > 0 ? (
                    <p>
                      <span className="font-medium">
                        {zh.report.matchScriptFootballStateRefs}:{" "}
                      </span>
                      {script.footballStateRefs.join(", ")}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {projectionFramework !== undefined ? (
          <p className="text-xs text-zinc-500">
            {zh.report.matchScriptProvenance(
              projectionFramework.matchScriptPolicyVersion,
              projectionFramework.matchScriptSetChecksum,
            )}
          </p>
        ) : null}
      </div>
    </WorkspaceSection>
  );
}
