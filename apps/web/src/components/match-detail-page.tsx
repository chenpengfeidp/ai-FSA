"use client";

import Link from "next/link";
import { type ReactElement, useEffect } from "react";
import { useMatchDetail } from "../hooks/use-match-detail";
import { useUpcomingMatches } from "../hooks/use-upcoming-matches";
import { recordAnalysisHistoryEntry } from "../lib/analysis-history";
import { findMatchById } from "../lib/todays-matches";
import type { MatchStatus } from "../types/match-center";
import { EmptyState } from "./empty-state";
import { ErrorPanel } from "./error-panel";
import { ExplainableMatchReport } from "./explainable-report/explainable-match-report";
import { ExplainableReportSkeleton } from "./explainable-report-skeleton";
import { MatchWorkspaceShell } from "./match-workspace/match-workspace-shell";
import { WorkspaceMatchHeader } from "./match-workspace/workspace-match-header";
import { WorkspaceSectionNav } from "./match-workspace/workspace-section-nav";
import { Button } from "./ui/button";

const workspaceNav = Object.freeze([
  Object.freeze({ id: "prediction", label: "Prediction" }),
  Object.freeze({ id: "reasoning", label: "Reasoning" }),
  Object.freeze({ id: "evidence", label: "Evidence" }),
  Object.freeze({ id: "features", label: "Features" }),
  Object.freeze({ id: "rules", label: "Rules" }),
  Object.freeze({ id: "recommendation", label: "Recommendation" }),
  Object.freeze({ id: "developer", label: "Developer" }),
]);

function resolveStatus(
  isError: boolean,
  isPending: boolean,
  hasData: boolean,
): MatchStatus {
  if (isPending) {
    return "LOADING";
  }

  if (isError) {
    return "FAILED";
  }

  if (hasData) {
    return "ANALYZED";
  }

  return "SCHEDULED";
}

export function MatchDetailPage({
  matchId,
}: Readonly<{ matchId: string }>): ReactElement {
  const upcoming = useUpcomingMatches();
  const match = findMatchById(matchId, upcoming.matches);
  const detail = useMatchDetail(matchId, match !== undefined);
  const status = resolveStatus(
    detail.isError,
    detail.isPending,
    detail.data !== undefined,
  );

  useEffect(() => {
    if (match === undefined || detail.data === undefined) {
      return;
    }

    recordAnalysisHistoryEntry({
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      kickoffTime: match.kickoffTime,
      competition: match.competition,
      analyzedAt: detail.data.report.generatedAt,
      reportId: detail.data.report.reportId,
      evidenceCount: detail.data.evidence.length,
      featureCount: detail.data.report.features.length,
      ruleCount: detail.data.report.rules.length,
    });
  }, [detail.data, match]);

  return (
    <MatchWorkspaceShell activeMatchId={match?.id}>
      {match === undefined ? (
        <EmptyState
          action={
            <Button asChild variant="outline">
              <Link href="/">Back to Match Center</Link>
            </Button>
          }
          description={`No catalog entry exists for "${matchId}". Choose a match from today's fixtures.`}
          title="Match not found"
        />
      ) : (
        <div className="space-y-6">
          <WorkspaceMatchHeader match={match} status={status} />
          <WorkspaceSectionNav items={workspaceNav} />

          {detail.isPending ? <ExplainableReportSkeleton /> : null}

          {detail.isError ? (
            <div className="space-y-4">
              <ErrorPanel message={detail.error.message} />
              <EmptyState
                action={
                  <Button asChild variant="outline">
                    <Link href="/">Back to Match Center</Link>
                  </Button>
                }
                description="The analysis pipeline could not complete for this match. Return to the dashboard and try another fixture."
                title="Unable to load match analysis"
              />
            </div>
          ) : null}

          {detail.data ? (
            <ExplainableMatchReport
              evidence={detail.data.evidence}
              match={match}
              report={detail.data.report}
            />
          ) : null}
        </div>
      )}
    </MatchWorkspaceShell>
  );
}
