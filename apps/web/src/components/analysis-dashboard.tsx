"use client";

import { CalendarDays } from "lucide-react";
import { type ReactElement, useState } from "react";
import { useAnalyzeMatch } from "../hooks/use-analyze-match";
import { todaysMatches } from "../lib/todays-matches";
import type { AnalysisReportDto } from "../types/analysis";
import type { MatchSummary } from "../types/match-center";
import { MatchCard } from "./match-card";
import { PageContainer } from "./page-container";
import { RecentAnalysis } from "./recent-analysis";

interface RecentAnalysisState {
  readonly match: MatchSummary;
  readonly report: AnalysisReportDto;
}

export function AnalysisDashboard(): ReactElement {
  const analysis = useAnalyzeMatch();
  const [activeMatchId, setActiveMatchId] = useState<string>();
  const [recentAnalysis, setRecentAnalysis] = useState<RecentAnalysisState>();

  function analyze(match: MatchSummary): void {
    analysis.reset();
    setActiveMatchId(match.id);
    analysis.mutate(match.id, {
      onSettled: () => {
        setActiveMatchId(undefined);
      },
      onSuccess: (report) => {
        setRecentAnalysis({ match, report });
      },
    });
  }

  return (
    <PageContainer>
      <div className="space-y-12">
        <section aria-labelledby="todays-matches-heading">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                <CalendarDays aria-hidden="true" className="size-4" />
                Match Center
              </p>
              <h2
                className="mt-1 text-2xl font-bold tracking-tight text-slate-950"
                id="todays-matches-heading"
              >
                Today&apos;s Matches
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              {todaysMatches.length} fixtures available
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {todaysMatches.map((match) => (
              <MatchCard
                isAnalyzing={analysis.isPending && activeMatchId === match.id}
                isDisabled={analysis.isPending}
                key={match.id}
                match={match}
                onAnalyze={analyze}
              />
            ))}
          </div>
        </section>

        <RecentAnalysis
          errorMessage={analysis.isError ? analysis.error.message : undefined}
          match={recentAnalysis?.match}
          report={recentAnalysis?.report}
        />
      </div>
    </PageContainer>
  );
}
