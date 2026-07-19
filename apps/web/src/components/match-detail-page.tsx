"use client";

import Link from "next/link";
import { type ReactElement, useEffect } from "react";
import { useMatchDetail } from "../hooks/use-match-detail";
import { useUpcomingMatches } from "../hooks/use-upcoming-matches";
import { recordAnalysisHistoryEntry } from "../lib/analysis-history";
import { decodeRouteMatchId } from "../lib/route-match-id";
import { findMatchById } from "../lib/todays-matches";
import { zh } from "../copy/zh";
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
  Object.freeze({ id: "prediction", label: zh.workspace.nav.prediction }),
  Object.freeze({ id: "reasoning", label: zh.workspace.nav.reasoning }),
  Object.freeze({ id: "evidence", label: zh.workspace.nav.evidence }),
  Object.freeze({ id: "features", label: zh.workspace.nav.features }),
  Object.freeze({ id: "rules", label: zh.workspace.nav.rules }),
  Object.freeze({ id: "recommendation", label: zh.workspace.nav.recommendation }),
  Object.freeze({ id: "developer", label: zh.workspace.nav.developer }),
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
  const resolvedMatchId = decodeRouteMatchId(matchId);
  const upcoming = useUpcomingMatches();
  const match = findMatchById(resolvedMatchId, upcoming.matches);
  const detail = useMatchDetail(resolvedMatchId, match !== undefined);
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
              <Link href="/">{zh.workspace.backToMatchCenter}</Link>
            </Button>
          }
          description={
            upcoming.isError || upcoming.isLoading
              ? zh.workspace.matchUnavailableBoardFailed(resolvedMatchId)
              : zh.workspace.matchNotFoundDescription(resolvedMatchId)
          }
          title={zh.workspace.matchNotFound}
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
                    <Link href="/">{zh.workspace.backToMatchCenter}</Link>
                  </Button>
                }
                description={zh.workspace.loadErrorDescription}
                title={zh.workspace.loadErrorTitle}
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
