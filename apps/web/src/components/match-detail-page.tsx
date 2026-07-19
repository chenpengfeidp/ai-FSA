"use client";

import Link from "next/link";
import { type ReactElement, useEffect } from "react";
import { useMatchDetail } from "../hooks/use-match-detail";
import { recordAnalysisHistoryEntry } from "../lib/analysis-history";
import { findMatchById } from "../lib/todays-matches";
import type { MatchStatus } from "../types/match-center";
import { Breadcrumb } from "./breadcrumb";
import { EmptyState } from "./empty-state";
import { ErrorPanel } from "./error-panel";
import { MatchDetailHeader } from "./match-detail-header";
import { MatchDetailPanels } from "./match-detail-panels";
import { MatchDetailSkeleton } from "./match-detail-skeleton";
import { PageContainer } from "./page-container";
import { Button } from "./ui/button";

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
  const match = findMatchById(matchId);
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
    <PageContainer>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { href: "/", label: "Dashboard" },
            { href: "/", label: "Matches" },
            { label: "Match Detail" },
          ]}
        />

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
          <>
            <MatchDetailHeader match={match} status={status} />

            {detail.isPending ? <MatchDetailSkeleton /> : null}

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
              <MatchDetailPanels
                evidence={detail.data.evidence}
                report={detail.data.report}
              />
            ) : null}
          </>
        )}
      </div>
    </PageContainer>
  );
}
