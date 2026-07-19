"use client";

import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { useAnalysisHistory } from "../hooks/use-analysis-history";
import { todaysMatches } from "../lib/todays-matches";
import type { MatchSummary } from "../types/match-center";
import { MatchCard } from "./match-card";
import { OverviewMetrics } from "./overview-metrics";
import { PageContainer } from "./page-container";
import { PipelineStatus } from "./pipeline-status";
import { RecentAnalysis } from "./recent-analysis";

export function AnalysisDashboard(): ReactElement {
  const router = useRouter();
  const history = useAnalysisHistory();

  function analyze(match: MatchSummary): void {
    router.push(`/matches/${encodeURIComponent(match.id)}`);
  }

  return (
    <PageContainer>
      <div className="space-y-12">
        <OverviewMetrics metrics={history.metrics} />
        <PipelineStatus />

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
                isAnalyzing={false}
                isDisabled={false}
                key={match.id}
                match={match}
                onAnalyze={analyze}
              />
            ))}
          </div>
        </section>

        <RecentAnalysis entries={history.recent} />
      </div>
    </PageContainer>
  );
}
