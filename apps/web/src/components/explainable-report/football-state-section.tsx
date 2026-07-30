import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type { FootballStateReportDto } from "../../types/analysis";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { WorkspaceSection } from "./workspace-section";

function formatScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

function levelLabel(
  level: FootballStateReportDto["dimensions"][number]["level"],
): string {
  return zh.report.footballStateLevels[level];
}

export function FootballStateSection({
  footballState,
}: Readonly<{
  footballState: FootballStateReportDto | undefined;
}>): ReactElement {
  const dimensions = footballState?.dimensions ?? [];

  return (
    <WorkspaceSection id="football-state">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            {zh.report.footballState}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{zh.report.footballStateHint}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            {zh.report.footballStatePipeline}
          </p>
        </div>

        {dimensions.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {zh.report.footballStateUnavailable}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {dimensions.map((dimension) => (
              <Card key={dimension.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{dimension.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-zinc-700">
                  <p>
                    <span className="font-medium">
                      {zh.report.footballStateLevel}:{" "}
                    </span>
                    {levelLabel(dimension.level)}
                    <span className="ml-2 text-zinc-500">
                      ({formatScore(dimension.score)})
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">
                      {zh.report.footballStateBasis}:{" "}
                    </span>
                    {dimension.basis}
                  </p>
                  {dimension.sourceRefs.length > 0 ? (
                    <p>
                      <span className="font-medium">
                        {zh.report.footballStateProvenance}:{" "}
                      </span>
                      {dimension.sourceRefs.join(", ")}
                    </p>
                  ) : (
                    <p className="text-zinc-500">
                      {zh.report.footballStateNoSources}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {footballState !== undefined && footballState.compositeTags.length > 0 ? (
          <p className="text-sm text-zinc-600">
            <span className="font-medium">{zh.report.footballStateTags}: </span>
            {footballState.compositeTags.join(", ")}
          </p>
        ) : null}

        {footballState !== undefined ? (
          <p className="text-xs text-zinc-500">
            {zh.report.footballStateChecksum(
              footballState.policyVersion,
              footballState.checksum,
            )}
          </p>
        ) : null}
      </div>
    </WorkspaceSection>
  );
}
