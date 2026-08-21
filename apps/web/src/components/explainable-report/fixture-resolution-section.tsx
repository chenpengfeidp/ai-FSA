import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type { AnalysisProvenanceDto } from "../../types/analysis";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { WorkspaceSection } from "./workspace-section";

export function FixtureResolutionSection({
  provenance,
}: Readonly<{
  provenance: AnalysisProvenanceDto | undefined;
}>): ReactElement | null {
  const resolution = provenance?.fixtureResolution;

  if (resolution === undefined) {
    return null;
  }

  return (
    <WorkspaceSection id="fixture-resolution">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{zh.report.fixtureResolution}</CardTitle>
          <p className="text-sm text-zinc-600">{zh.report.fixtureResolutionHint}</p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-700">
          <p>
            <span className="font-medium">{zh.report.fixtureRequested}: </span>
            {resolution.requestedHomeTeam} {zh.workspace.vs}{" "}
            {resolution.requestedAwayTeam}
          </p>
          <p>
            <span className="font-medium">{zh.report.fixtureResolved}: </span>
            {resolution.resolvedHomeTeam} {zh.workspace.vs}{" "}
            {resolution.resolvedAwayTeam}
          </p>
          <p>
            <span className="font-medium">{zh.report.fixtureMatchId}: </span>
            {resolution.resolvedMatchId}
          </p>
          <p>
            <span className="font-medium">{zh.report.fixtureKickoff}: </span>
            {resolution.kickoff}
          </p>
          <p>
            <span className="font-medium">{zh.report.fixtureProvenance}: </span>
            {resolution.scheduleSource} · {resolution.providerSource}
            {resolution.homeAwaySwapped ? ` · ${zh.report.fixtureSwapped}` : ""}
          </p>
          {provenance !== undefined ? (
            <p>
              <span className="font-medium">{zh.report.projectionPolicyPin}: </span>
              {provenance.projectionPolicyPin}
              {provenance.projectionPolicyPin === "v2"
                ? ` · ${zh.report.projectionV2Active}`
                : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </WorkspaceSection>
  );
}
